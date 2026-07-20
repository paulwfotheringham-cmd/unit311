import { createHash, randomBytes } from "node:crypto";

import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { sendMailboxEmail } from "@/lib/email/smtp";
import {
  ensurePlatformPasswordResetTokensTable,
  withPlatformPasswordResetTokensTable,
} from "@/lib/internal-db-migrations";
import { buildPasswordResetEmail } from "@/lib/password-reset/emails";
import {
  hashPlatformPasswordForUser,
  normalizePlatformUsername,
  type PlatformUserRecord,
} from "@/lib/platform-auth";
import {
  findPlatformUserByUsername,
  findPlatformUsersByEmail,
} from "@/lib/platform-users-service";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const PASSWORD_RESET_EXPIRY_MINUTES = 60;

const GENERIC_RESET_MESSAGE =
  "If an account matches that email address, we sent a password reset link.";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createResetTokenValue() {
  return randomBytes(32).toString("base64url");
}

function buildResetUrl(token: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? CENTRAL_SITE_URL).replace(/\/$/, "");
  return `${baseUrl}/resetpassword?token=${encodeURIComponent(token)}`;
}

function validateNewPassword(password: string, confirmPassword: string) {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }
}

async function resolveUserEmail(user: PlatformUserRecord): Promise<string | null> {
  if (user.email?.trim()) {
    return normalizeEmail(user.email);
  }

  const supabase = requireSupabase();
  const username = normalizePlatformUsername(user.username);

  if (user.user_type === "internal") {
    const { data, error } = await supabase
      .from("internal_operators")
      .select("email")
      .eq("username", username)
      .maybeSingle();

    if (error) throw new Error(error.message);
    const email = data?.email ? normalizeEmail(String(data.email)) : null;
    return email || null;
  }

  return null;
}

async function findUserForPasswordResetByEmail(
  submittedEmail: string,
): Promise<PlatformUserRecord | null> {
  const matches = await findPlatformUsersByEmail(submittedEmail);
  for (const user of matches) {
    if (!user.is_active) continue;
    const accountEmail = await resolveUserEmail(user);
    if (accountEmail === submittedEmail) return user;
  }

  // Internal operators often store email on internal_operators, not platform_users.
  const supabase = requireSupabase();
  const { data: operator, error } = await supabase
    .from("internal_operators")
    .select("username, email")
    .ilike("email", submittedEmail)
    .maybeSingle();

  if (error && !error.message.includes("email")) {
    throw new Error(error.message);
  }

  if (operator?.username) {
    const user = await findPlatformUserByUsername(String(operator.username));
    if (user?.is_active) {
      const accountEmail = await resolveUserEmail(user);
      if (accountEmail === submittedEmail) return user;
      if (operator.email && normalizeEmail(String(operator.email)) === submittedEmail) {
        return user;
      }
    }
  }

  return null;
}

export async function requestPlatformPasswordReset(input: { email: string }) {
  await ensurePlatformPasswordResetTokensTable();

  const submittedEmail = normalizeEmail(input.email);

  if (!submittedEmail) {
    throw new Error("Email address is required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  const user = await findUserForPasswordResetByEmail(submittedEmail);
  if (!user) {
    return { message: GENERIC_RESET_MESSAGE };
  }

  const accountEmail = (await resolveUserEmail(user)) ?? submittedEmail;

  const token = createResetTokenValue();
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60_000).toISOString();

  await withPlatformPasswordResetTokensTable(async () => {
    const supabase = requireSupabase();

    await supabase
      .from("platform_password_reset_tokens")
      .delete()
      .eq("platform_user_id", user.id)
      .is("used_at", null);

    const { error } = await supabase.from("platform_password_reset_tokens").insert({
      platform_user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    if (error) throw new Error(error.message);
  });

  const resetUrl = buildResetUrl(token);
  const emailContent = buildPasswordResetEmail({
    displayName: user.display_name,
    resetUrl,
    expiresInMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
  });

  await sendMailboxEmail({
    account: "info",
    to: accountEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });

  return { message: GENERIC_RESET_MESSAGE };
}

export async function completePlatformPasswordReset(input: {
  token: string;
  password: string;
  confirmPassword: string;
}) {
  await ensurePlatformPasswordResetTokensTable();
  validateNewPassword(input.password, input.confirmPassword);

  const token = input.token.trim();
  if (!token) {
    throw new Error("Reset link is invalid or has expired.");
  }

  const tokenHash = hashResetToken(token);

  return withPlatformPasswordResetTokensTable(async () => {
    const supabase = requireSupabase();

    const { data: tokenRow, error: tokenError } = await supabase
      .from("platform_password_reset_tokens")
      .select("id, platform_user_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenError) throw new Error(tokenError.message);
    if (!tokenRow || tokenRow.used_at) {
      throw new Error("Reset link is invalid or has expired.");
    }
    if (new Date(String(tokenRow.expires_at)).getTime() < Date.now()) {
      throw new Error("Reset link has expired. Please request a new one.");
    }

    const { data: user, error: userError } = await supabase
      .from("platform_users")
      .select("*")
      .eq("id", tokenRow.platform_user_id)
      .eq("is_active", true)
      .maybeSingle();

    if (userError) throw new Error(userError.message);
    if (!user) {
      throw new Error("Reset link is invalid or has expired.");
    }

    const platformUser = user as PlatformUserRecord;
    const passwordHash = hashPlatformPasswordForUser(platformUser.username, input.password);
    const now = new Date().toISOString();

    const { error: updateUserError } = await supabase
      .from("platform_users")
      .update({ password_hash: passwordHash, updated_at: now })
      .eq("id", platformUser.id);

    if (updateUserError) throw new Error(updateUserError.message);

    const { error: markUsedError } = await supabase
      .from("platform_password_reset_tokens")
      .update({ used_at: now })
      .eq("id", tokenRow.id);

    if (markUsedError) throw new Error(markUsedError.message);

    return {
      message: "Your password has been updated. You can now sign in with your new password.",
    };
  });
}
