import type { SignupAddressInput } from "@/lib/signup-profile";
import { formatSignupAddress } from "@/lib/signup-profile";

/** Captured at CRM-invite signup; applied to Client after email verification. */
export type SignupBillingProfile = {
  firstName: string;
  surname: string;
  companyName: string;
  role: string;
  email: string;
  phone: string;
  accountsPayableEmail: string;
  companyAddress: SignupAddressInput;
  billingSameAsCompany: boolean;
  billingAddress: SignupAddressInput;
};

export function emptySignupAddress(): SignupAddressInput {
  return { line1: "", line2: "", city: "", country: "", postcode: "" };
}

export function normalizeSignupAddress(input: Partial<SignupAddressInput> | null | undefined): SignupAddressInput {
  return {
    line1: String(input?.line1 ?? "").trim(),
    line2: String(input?.line2 ?? "").trim(),
    city: String(input?.city ?? "").trim(),
    country: String(input?.country ?? "").trim(),
    postcode: String(input?.postcode ?? "").trim(),
  };
}

export function normalizeSignupBillingProfile(
  input: Partial<SignupBillingProfile> | null | undefined,
): SignupBillingProfile {
  const companyAddress = normalizeSignupAddress(input?.companyAddress);
  const billingSameAsCompany = Boolean(input?.billingSameAsCompany ?? true);
  const billingAddress = billingSameAsCompany
    ? { ...companyAddress }
    : normalizeSignupAddress(input?.billingAddress);

  return {
    firstName: String(input?.firstName ?? "").trim(),
    surname: String(input?.surname ?? "").trim(),
    companyName: String(input?.companyName ?? "").trim(),
    role: String(input?.role ?? "").trim(),
    email: String(input?.email ?? "").trim().toLowerCase(),
    phone: String(input?.phone ?? "").trim(),
    accountsPayableEmail: String(input?.accountsPayableEmail ?? "").trim().toLowerCase(),
    companyAddress,
    billingSameAsCompany,
    billingAddress,
  };
}

export function validateSignupBillingProfile(profile: SignupBillingProfile): string | null {
  if (!profile.companyAddress.line1 || !profile.companyAddress.city || !profile.companyAddress.country || !profile.companyAddress.postcode) {
    return "Complete company address is required.";
  }
  if (!profile.billingSameAsCompany) {
    const billing = profile.billingAddress;
    if (!billing.line1 || !billing.city || !billing.country || !billing.postcode) {
      return "Complete billing address is required.";
    }
  }
  return null;
}

export function resolveAccountsPayableEmail(profile: SignupBillingProfile): string {
  return profile.accountsPayableEmail || profile.email;
}

export function formatCompanyAddressBlock(profile: SignupBillingProfile): string {
  return formatSignupAddress(profile.companyAddress);
}

export function formatBillingAddressBlock(profile: SignupBillingProfile): string {
  return formatSignupAddress(
    profile.billingSameAsCompany ? profile.companyAddress : profile.billingAddress,
  );
}

export function primaryContactDisplayName(profile: Pick<SignupBillingProfile, "firstName" | "surname">): string {
  return `${profile.firstName} ${profile.surname}`.trim();
}
