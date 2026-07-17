import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { getLeadByIdForCapability } from "@/lib/crm-leads-service";
import type { CrmLead } from "@/lib/crm-data";

/** Opaque AES-GCM invite for CRM → /signup?t=… (no IDs in cleartext). */
export const CRM_SIGNUP_INVITE_PURPOSE = "crm-signup" as const;
/** Long enough for report send + 7d/14d reminders. */
export const CRM_SIGNUP_INVITE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

type CrmSignupInvitePayload = {
  v: 1;
  purpose: typeof CRM_SIGNUP_INVITE_PURPOSE;
  leadId: string;
  exp: number;
};

export type CrmSignupInviteLead = Pick<
  CrmLead,
  | "id"
  | "companyName"
  | "contactName"
  | "firstName"
  | "surname"
  | "email"
  | "phone"
  | "role"
  | "status"
>;

export type ResolveCrmSignupInviteResult =
  | { ok: true; lead: CrmSignupInviteLead; token: string }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "not_found" };

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.SUPABASE_ANON_KEY;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

function deriveInviteKey() {
  return createHash("sha256").update(`unit311-crm-signup-invite:v1:${getAuthSecret()}`).digest();
}

export function createCrmSignupInviteToken(
  leadId: string,
  maxAgeSeconds = CRM_SIGNUP_INVITE_MAX_AGE_SECONDS,
): string {
  const id = leadId.trim();
  if (!id) {
    throw new Error("leadId is required to create a signup invite token");
  }

  const payload: CrmSignupInvitePayload = {
    v: 1,
    purpose: CRM_SIGNUP_INVITE_PURPOSE,
    leadId: id,
    exp: Date.now() + maxAgeSeconds * 1000,
  };

  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveInviteKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Opaque blob only — lead IDs are never base64-readable in the URL.
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function readCrmSignupInviteToken(
  token: string | null | undefined,
): { leadId: string; exp: number } | null {
  if (!token?.trim()) return null;

  try {
    const raw = Buffer.from(token.trim(), "base64url");
    if (raw.length < 12 + 16 + 1) return null;

    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);

    const decipher = createDecipheriv("aes-256-gcm", deriveInviteKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const payload = JSON.parse(plaintext.toString("utf8")) as CrmSignupInvitePayload;

    if (payload.v !== 1 || payload.purpose !== CRM_SIGNUP_INVITE_PURPOSE) return null;
    if (!payload.leadId || typeof payload.leadId !== "string") return null;
    if (!payload.exp || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;

    return { leadId: payload.leadId, exp: payload.exp };
  } catch {
    return null;
  }
}

export function buildCrmSignupInviteUrl(leadId: string): string {
  const token = createCrmSignupInviteToken(leadId);
  return `${CENTRAL_SITE_URL}/signup?t=${encodeURIComponent(token)}`;
}

function toInviteLead(lead: CrmLead): CrmSignupInviteLead {
  return {
    id: lead.id,
    companyName: lead.companyName,
    contactName: lead.contactName,
    firstName: lead.firstName,
    surname: lead.surname,
    email: lead.email,
    phone: lead.phone,
    role: lead.role,
    status: lead.status,
  };
}

/**
 * Validate `t` and load the CRM lead. Does not create users, clients, or workspaces.
 */
export async function resolveCrmSignupInvite(
  token: string | null | undefined,
): Promise<ResolveCrmSignupInviteResult> {
  const trimmed = token?.trim() ?? "";
  if (!trimmed) return { ok: false, reason: "missing" };

  let decoded: { leadId: string; exp: number } | null = null;
  try {
    decoded = readCrmSignupInviteToken(trimmed);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (!decoded) {
    // Distinguish expired vs invalid by attempting decrypt without exp check.
    try {
      const raw = Buffer.from(trimmed, "base64url");
      if (raw.length >= 12 + 16 + 1) {
        const iv = raw.subarray(0, 12);
        const tag = raw.subarray(12, 28);
        const encrypted = raw.subarray(28);
        const decipher = createDecipheriv("aes-256-gcm", deriveInviteKey(), iv);
        decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        const payload = JSON.parse(plaintext.toString("utf8")) as CrmSignupInvitePayload;
        if (
          payload.v === 1 &&
          payload.purpose === CRM_SIGNUP_INVITE_PURPOSE &&
          payload.exp &&
          payload.exp < Date.now()
        ) {
          return { ok: false, reason: "expired" };
        }
      }
    } catch {
      // fall through to invalid
    }
    return { ok: false, reason: "invalid" };
  }

  const lead = await getLeadByIdForCapability(decoded.leadId);
  if (!lead) return { ok: false, reason: "not_found" };

  return { ok: true, lead: toInviteLead(lead), token: trimmed };
}
