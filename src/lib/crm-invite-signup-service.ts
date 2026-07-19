import { createSignupPlatformUsername, hashPlatformPasswordForUser, normalizePlatformUsername } from "@/lib/platform-auth";
import { resolveCrmSignupInvite } from "@/lib/crm-signup-invite";
import {
  ensurePlatformUsersCrmLeadIdColumn,
  ensurePlatformUsersEmailColumn,
  ensurePlatformUsersEmailVerifiedColumn,
  ensurePlatformUsersSignupBillingProfileColumn,
  isMissingColumnError,
} from "@/lib/internal-db-migrations";
import { allowsRepeatSignupForEmail } from "@/lib/platform-signup-mode";
import { validatePlatformSignupPasswordConfirmation } from "@/lib/platform-password-validation";
import {
  findPlatformUserByUsername,
  findPlatformUsersByEmail,
} from "@/lib/platform-users-service";
import {
  normalizeSignupBillingProfile,
  primaryContactDisplayName,
  type SignupBillingProfile,
  validateSignupBillingProfile,
} from "@/lib/signup-billing-profile";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type CrmInviteSignupInput = {
  token: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
  billingProfile: Partial<SignupBillingProfile>;
};

export type CrmInviteSignupResult = {
  userId: string;
  email: string;
  displayName: string;
  crmLeadId: string;
  emailVerificationStatus: "pending";
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

function resolveLeadNames(lead: {
  firstName: string;
  surname: string;
  contactName: string;
}) {
  const firstName = lead.firstName.trim();
  const surname = lead.surname.trim();
  if (firstName || surname) {
    return { firstName, surname };
  }
  const parts = lead.contactName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    surname: parts.slice(1).join(" "),
  };
}

async function assertEmailAvailable(email: string) {
  if (allowsRepeatSignupForEmail(email)) {
    return;
  }

  const byUsername = await findPlatformUserByUsername(email);
  if (byUsername) {
    throw new Error("An account with this email already exists.");
  }

  const byEmail = await findPlatformUsersByEmail(email);
  if (byEmail.length > 0) {
    throw new Error("An account with this email already exists.");
  }
}

async function insertCrmInvitePlatformUser(input: {
  username: string;
  email: string;
  displayName: string;
  organisation: string;
  passwordHash: string;
  crmLeadId: string;
  billingProfile: SignupBillingProfile;
}) {
  const supabase = requireSupabase();
  await ensurePlatformUsersEmailColumn().catch(() => false);
  await ensurePlatformUsersEmailVerifiedColumn().catch(() => false);
  await ensurePlatformUsersCrmLeadIdColumn().catch(() => false);
  await ensurePlatformUsersSignupBillingProfileColumn().catch(() => false);

  const baseRow = {
    username: input.username,
    display_name: input.displayName,
    password_hash: input.passwordHash,
    user_type: "external" as const,
    redirect_path: "/",
    client_name: input.organisation,
    is_active: true,
    email: input.email,
    updated_at: new Date().toISOString(),
  };

  const attempts: Array<Record<string, string | boolean | null | object>> = [
    {
      ...baseRow,
      crm_lead_id: input.crmLeadId,
      signup_billing_profile: input.billingProfile,
    },
    {
      ...baseRow,
      crm_lead_id: input.crmLeadId,
    },
    baseRow,
  ];

  let lastError: Error | null = null;

  for (const row of attempts) {
    const { data, error } = await supabase.from("platform_users").insert(row).select("id").single();

    if (!error && data && typeof data === "object" && "id" in data) {
      const userId = data.id as string;
      // Best-effort: attach billing profile if omitted from insert path.
      if (!("signup_billing_profile" in row)) {
        try {
          await supabase
            .from("platform_users")
            .update({
              signup_billing_profile: input.billingProfile,
              crm_lead_id: input.crmLeadId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
        } catch {
          // Column may be unavailable until migration 081.
        }
      }
      return userId;
    }

    if (error) {
      lastError = new Error(error.message);
      if (
        error.code === "23505" ||
        error.message.includes("platform_users_username_unique") ||
        error.message.includes("already exists")
      ) {
        // Caller may retry with a new username for unlimited demo emails.
        throw lastError;
      }
      if (
        isMissingColumnError(error, "crm_lead_id") ||
        isMissingColumnError(error, "email") ||
        isMissingColumnError(error, "email_verified_at") ||
        isMissingColumnError(error, "signup_billing_profile") ||
        error.message.includes("does not exist")
      ) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("Failed to create platform user.");
}

/**
 * Create a platform user from a CRM signup invite and store the billing profile
 * for Client creation after email verification.
 */
export async function registerCrmInviteSignup(
  input: CrmInviteSignupInput,
): Promise<CrmInviteSignupResult> {
  const resolved = await resolveCrmSignupInvite(input.token);
  if (!resolved.ok) {
    if (resolved.reason === "expired") {
      throw new Error("This signup link has expired. Please contact Unit311 Central for a new link.");
    }
    throw new Error("This signup link is no longer valid. Please contact Unit311 Central.");
  }

  if (!input.acceptedTerms) {
    throw new Error("You must accept the Terms & Conditions and Privacy Policy.");
  }

  const passwordError = validatePlatformSignupPasswordConfirmation(
    input.password,
    input.confirmPassword,
  );
  if (passwordError) {
    throw new Error(passwordError);
  }

  const email = resolved.lead.email.trim().toLowerCase();
  if (!email) {
    throw new Error("This CRM lead has no email address.");
  }

  const { firstName, surname } = resolveLeadNames(resolved.lead);
  const billingProfile = normalizeSignupBillingProfile({
    ...input.billingProfile,
    firstName: firstName || input.billingProfile.firstName,
    surname: surname || input.billingProfile.surname,
    companyName: resolved.lead.companyName.trim(),
    role: resolved.lead.role.trim() || input.billingProfile.role,
    email,
    phone: input.billingProfile.phone || resolved.lead.phone || "",
  });

  const profileError = validateSignupBillingProfile(billingProfile);
  if (profileError) {
    throw new Error(profileError);
  }

  await assertEmailAvailable(email);

  const displayName =
    primaryContactDisplayName(billingProfile) || resolved.lead.contactName.trim() || email;
  const organisation = billingProfile.companyName || "Unit311 Central customer";

  const maxAttempts = allowsRepeatSignupForEmail(email) ? 12 : 1;
  let userId: string | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const username = allowsRepeatSignupForEmail(email)
      ? createSignupPlatformUsername(email)
      : normalizePlatformUsername(email);
    const passwordHash = hashPlatformPasswordForUser(username, input.password);

    try {
      userId = await insertCrmInvitePlatformUser({
        username,
        email,
        displayName,
        organisation,
        passwordHash,
        crmLeadId: resolved.lead.id,
        billingProfile,
      });
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Failed to create platform user.");
      const isDuplicate =
        lastError.message.includes("23505") ||
        lastError.message.includes("platform_users_username_unique") ||
        lastError.message.includes("duplicate key") ||
        lastError.message.includes("already exists");
      if (allowsRepeatSignupForEmail(email) && isDuplicate) {
        continue;
      }
      if (isDuplicate) {
        throw new Error("An account with this email already exists.");
      }
      throw lastError;
    }
  }

  if (!userId) {
    if (allowsRepeatSignupForEmail(email)) {
      throw lastError ?? new Error("Failed to create platform user.");
    }
    throw new Error("An account with this email already exists.");
  }

  return {
    userId,
    email,
    displayName,
    crmLeadId: resolved.lead.id,
    emailVerificationStatus: "pending",
  };
}
