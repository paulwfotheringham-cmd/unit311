import {
  createSignupPlatformUsername,
  hashPlatformPasswordForUser,
  normalizePlatformUsername,
} from "@/lib/platform-auth";
import { validatePlatformSignupPasswordConfirmation } from "@/lib/platform-password-validation";
import {
  ensurePlatformOrganisationsTable,
  ensurePlatformUsersEmailColumn,
  isMissingColumnError,
} from "@/lib/internal-db-migrations";
import {
  provisionOrganisationFolders,
  uniqueOrganisationSlug,
} from "@/lib/organisation-service";
import {
  allowsRepeatSignupForEmail,
  isDevelopmentRepeatSignupEnabled,
  isUnlimitedSignupEmail,
} from "@/lib/platform-signup-mode";
import { findPlatformUserByUsername } from "@/lib/platform-users-service";
import { createClientOnboardingRecordForSignup } from "@/lib/client-onboarding-service";
import { ensureClientFromSignup } from "@/lib/crm-signup-conversion";
import { type PlatformSignupProfileInput, type SignupAddressInput } from "@/lib/signup-profile";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type PlatformSignupInput = PlatformSignupProfileInput & {
  /** @deprecated Use companyName */
  organisation?: string;
};

function readAddress(prefix: string, input: Record<string, string | boolean | SignupAddressInput>): SignupAddressInput {
  const source =
    typeof input[`${prefix}Address`] === "object" && input[`${prefix}Address`] !== null
      ? (input[`${prefix}Address`] as SignupAddressInput)
      : null;

  if (source) {
    return {
      line1: source.line1?.trim() ?? "",
      line2: source.line2?.trim() ?? "",
      city: source.city?.trim() ?? "",
      country: source.country?.trim() ?? "",
      postcode: source.postcode?.trim() ?? "",
    };
  }

  return {
    line1: String(input[`${prefix}AddressLine1`] ?? "").trim(),
    line2: String(input[`${prefix}AddressLine2`] ?? "").trim(),
    city: String(input[`${prefix}City`] ?? "").trim(),
    country: String(input[`${prefix}Country`] ?? "").trim(),
    postcode: String(input[`${prefix}Postcode`] ?? "").trim(),
  };
}

export function normalizePlatformSignupInput(input: PlatformSignupInput): PlatformSignupProfileInput {
  const companyName = (input.companyName || input.organisation || "").trim();

  return {
    firstName: input.firstName.trim(),
    surname: input.surname.trim(),
    companyName,
    email: input.email.trim().toLowerCase(),
    jobTitle: input.jobTitle.trim(),
    password: input.password,
    confirmPassword: input.confirmPassword,
    phone: input.phone?.trim() ?? "",
    // UI label: Accounts Payable email (DB column remains invoice_email).
    invoiceEmail: (
      input.accountsPayableEmail?.trim() ||
      input.invoiceEmail?.trim() ||
      ""
    ).toLowerCase(),
    accountsPayableEmail: (
      input.accountsPayableEmail?.trim() ||
      input.invoiceEmail?.trim() ||
      ""
    ).toLowerCase(),
    companyAddress: readAddress("company", input as unknown as Record<string, string | boolean | SignupAddressInput>),
    billingSameAsCompany: Boolean(input.billingSameAsCompany),
    billingAddress: readAddress("billing", input as unknown as Record<string, string | boolean | SignupAddressInput>),
    acceptedTerms: Boolean(input.acceptedTerms),
  };
}

export type PlatformSignupResult = {
  userId: string;
  organisationId: string | null;
  organisationSlug: string | null;
  email: string;
  displayName: string;
  developmentRepeatSignup: boolean;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }

  return createSupabaseServerClient();
}

async function createPlatformOrganisation(name: string, primaryEmail: string) {
  const supabase = requireSupabase();
  await ensurePlatformOrganisationsTable().catch(() => false);

  const slug = await uniqueOrganisationSlug(name);
  await provisionOrganisationFolders(slug, name);

  const baseRow = {
    name,
    primary_email: primaryEmail,
    slug,
    updated_at: new Date().toISOString(),
  };

  const attempts: Array<Record<string, string>> = [
    { name, primary_email: primaryEmail, updated_at: baseRow.updated_at },
    baseRow,
  ];

  for (const row of attempts) {
    const { data, error } = await supabase.from("platform_organisations").insert(row).select("id, slug").single();

    if (!error && data && typeof data === "object" && "id" in data) {
      return {
        id: data.id as string,
        slug: (typeof data.slug === "string" ? data.slug : slug) as string,
      };
    }

    if (error && (isMissingColumnError(error, "slug") || error.message.includes("does not exist"))) {
      continue;
    }

    if (error) {
      throw new Error(error.message);
    }
  }

  throw new Error("Failed to create organisation.");
}

function isUsernameUniqueViolation(error: Error) {
  return (
    error.message.includes("platform_users_username_unique") ||
    error.message.includes('duplicate key value violates unique constraint "platform_users_username_unique"') ||
    error.message.includes("duplicate key value violates unique constraint") ||
    error.message.includes("already exists")
  );
}

async function insertPlatformSignupUser(input: {
  username: string;
  email: string;
  displayName: string;
  organisation: string;
  organisationId: string | null;
  passwordHash: string;
}) {
  const supabase = requireSupabase();
  await ensurePlatformUsersEmailColumn().catch(() => false);

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

  const attempts: Array<Record<string, string | boolean | null>> = [];
  if (input.organisationId) {
    attempts.push({ ...baseRow, organisation_id: input.organisationId });
  }
  attempts.push(baseRow);
  // Fallbacks if newer columns are missing in an older schema.
  attempts.push({
    username: input.username,
    display_name: input.displayName,
    password_hash: input.passwordHash,
    user_type: "external",
    redirect_path: "/",
    client_name: input.organisation,
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  let lastError: Error | null = null;

  for (const row of attempts) {
    const { data, error } = await supabase
      .from("platform_users")
      .insert(row)
      .select("id")
      .single();

    if (!error && data && typeof data === "object" && "id" in data) {
      return data.id as string;
    }

    if (error) {
      lastError = new Error(error.message);
      if (error.code === "23505" || isUsernameUniqueViolation(lastError)) {
        throw lastError;
      }
      if (
        isMissingColumnError(error, "organisation_id") ||
        isMissingColumnError(error, "email") ||
        isMissingColumnError(error, "user_type") ||
        error.message.includes("does not exist") ||
        error.message.includes("invalid input value for enum")
      ) {
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error("Failed to create platform user.");
}

async function assertProductionEmailAvailable(email: string) {
  if (allowsRepeatSignupForEmail(email)) {
    return;
  }

  const existing = await findPlatformUserByUsername(email);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }
}

export async function registerPlatformSignup(
  rawInput: PlatformSignupInput,
): Promise<PlatformSignupResult> {
  const input = normalizePlatformSignupInput(rawInput);
  const firstName = input.firstName;
  const surname = input.surname;
  const organisation = input.companyName;
  const email = input.email;
  const password = input.password;
  const confirmPassword = input.confirmPassword;
  const developmentRepeatSignup = isDevelopmentRepeatSignupEnabled();
  const repeatSignup = allowsRepeatSignupForEmail(email);

  if (!firstName || !surname || !organisation || !email || !input.jobTitle) {
    throw new Error("First name, surname, company name, job title, and email are required.");
  }

  if (!input.companyAddress.line1 || !input.companyAddress.city || !input.companyAddress.country || !input.companyAddress.postcode) {
    throw new Error("Complete company address is required.");
  }

  if (!input.billingSameAsCompany) {
    const billing = input.billingAddress;
    if (!billing.line1 || !billing.city || !billing.country || !billing.postcode) {
      throw new Error("Complete billing address is required.");
    }
  }

  if (!input.acceptedTerms) {
    throw new Error("You must agree to the Terms and Conditions.");
  }

  const passwordError = validatePlatformSignupPasswordConfirmation(password, confirmPassword);
  if (passwordError) {
    throw new Error(passwordError);
  }

  if (!repeatSignup) {
    await assertProductionEmailAvailable(email);
  }

  let organisationId: string | null = null;
  let organisationSlug: string | null = null;
  try {
    const createdOrganisation = await createPlatformOrganisation(organisation, email);
    organisationId = createdOrganisation.id;
    organisationSlug = createdOrganisation.slug;
  } catch {
    organisationId = null;
    organisationSlug = null;
  }

  const displayName = `${firstName} ${surname}`.trim();
  let userId: string | null = null;
  let lastInsertError: Error | null = null;
  const maxAttempts = repeatSignup ? 12 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // Always mint a unique username for unlimited/demo and local repeat signup.
    const username = repeatSignup
      ? createSignupPlatformUsername(email)
      : normalizePlatformUsername(email);
    try {
      userId = await insertPlatformSignupUser({
        username,
        email,
        displayName,
        organisation,
        organisationId,
        passwordHash: hashPlatformPasswordForUser(username, password),
      });
      break;
    } catch (error) {
      lastInsertError = error instanceof Error ? error : new Error("Failed to create platform user.");
      if (repeatSignup && isUsernameUniqueViolation(lastInsertError)) {
        continue;
      }
      // Never surface a duplicate-email error for the unlimited demo address.
      if (isUnlimitedSignupEmail(email) && isUsernameUniqueViolation(lastInsertError)) {
        continue;
      }
      throw lastInsertError;
    }
  }

  if (!userId) {
    throw lastInsertError ?? new Error("Failed to create platform user.");
  }

  try {
    await createClientOnboardingRecordForSignup({
      platformOrganisationId: organisationId,
      platformUserId: userId,
      companyName: organisation,
      contactName: displayName,
      contactEmail: email,
    });
  } catch {
    // Signup should succeed even if onboarding record creation fails temporarily.
  }

  try {
    await ensureClientFromSignup({
      profile: input,
      organisationId,
      platformUserId: userId,
    });
  } catch {
    // Signup should succeed even if client/CRM conversion fails temporarily.
  }

  return {
    userId,
    organisationId,
    organisationSlug,
    email,
    displayName,
    developmentRepeatSignup,
  };
}
