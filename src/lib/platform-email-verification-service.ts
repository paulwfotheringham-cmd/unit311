import { createHash, randomBytes } from "node:crypto";

import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { sendMailboxEmail } from "@/lib/email/smtp";
import {
  ensurePlatformEmailVerificationTokensTable,
  ensurePlatformUsersEmailVerifiedColumn,
  withPlatformEmailVerificationTokensTable,
} from "@/lib/internal-db-migrations";
import { buildEmailVerificationEmail } from "@/lib/platform-email-verification/emails";
import type { PlatformUserRecord } from "@/lib/platform-auth";
import { findPlatformUserByUsername } from "@/lib/platform-users-service";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const EMAIL_VERIFICATION_EXPIRY_HOURS = 48;

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function buildVerifyUrl(token: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? CENTRAL_SITE_URL).replace(/\/$/, "");
  return `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

function resolveUserEmail(user: PlatformUserRecord): string | null {
  const row = user as PlatformUserRecord & { email?: string | null };
  if (row.email?.trim()) {
    return row.email.trim().toLowerCase();
  }
  if (user.username.includes("@")) {
    return user.username.trim().toLowerCase();
  }
  return null;
}

export async function sendPlatformEmailVerification(user: PlatformUserRecord) {
  await ensurePlatformEmailVerificationTokensTable();
  await ensurePlatformUsersEmailVerifiedColumn().catch(() => false);

  const email = resolveUserEmail(user);
  if (!email) {
    throw new Error("No email address found for this account.");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const supabase = requireSupabase();
  await supabase.from("platform_email_verification_tokens").insert({
    platform_user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  const verifyUrl = buildVerifyUrl(token);
  const message = buildEmailVerificationEmail({
    displayName: user.display_name,
    verifyUrl,
    expiresInHours: EMAIL_VERIFICATION_EXPIRY_HOURS,
  });

  await sendMailboxEmail({
    account: "info",
    to: email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}

export async function verifyPlatformEmailToken(token: string): Promise<PlatformUserRecord> {
  await ensurePlatformEmailVerificationTokensTable();
  await ensurePlatformUsersEmailVerifiedColumn().catch(() => false);

  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error("Verification link is invalid.");
  }

  const tokenHash = hashVerificationToken(trimmed);
  const supabase = requireSupabase();

  return withPlatformEmailVerificationTokensTable(async () => {
    const { data: tokenRow, error: tokenError } = await supabase
      .from("platform_email_verification_tokens")
      .select("id, platform_user_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError) throw new Error(tokenError.message);
    if (!tokenRow || tokenRow.used_at) {
      throw new Error("Verification link is invalid or has already been used.");
    }

    if (new Date(String(tokenRow.expires_at)).getTime() < Date.now()) {
      throw new Error("Verification link has expired.");
    }

    const userId = String(tokenRow.platform_user_id);
    const { error: markUsedError } = await supabase
      .from("platform_email_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    if (markUsedError) throw new Error(markUsedError.message);

    const verifiedAt = new Date().toISOString();
    const { error: userError } = await supabase
      .from("platform_users")
      .update({ email_verified_at: verifiedAt, updated_at: verifiedAt })
      .eq("id", userId);

    if (userError && !userError.message.includes("email_verified_at")) {
      throw new Error(userError.message);
    }

    const { data: userRow, error: fetchError } = await supabase
      .from("platform_users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!userRow) throw new Error("Account not found.");

    return userRow as PlatformUserRecord;
  });
}

export async function isPlatformEmailVerified(userId: string): Promise<boolean> {
  await ensurePlatformUsersEmailVerifiedColumn().catch(() => false);
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from("platform_users")
    .select("email_verified_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("email_verified_at")) {
      return true;
    }
    throw new Error(error.message);
  }

  return Boolean(data?.email_verified_at);
}

export async function findPlatformUserById(userId: string): Promise<PlatformUserRecord | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("platform_users")
    .select("*")
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PlatformUserRecord | null) ?? null;
}

export { resolveUserEmail, findPlatformUserByUsername };
