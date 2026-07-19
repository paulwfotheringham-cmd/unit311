import type { ClientRegion } from "@/lib/client-management-data";

export type SignupAddressInput = {
  line1: string;
  line2: string;
  city: string;
  country: string;
  postcode: string;
};

export type PlatformSignupProfileInput = {
  firstName: string;
  surname: string;
  companyName: string;
  email: string;
  jobTitle: string;
  password: string;
  confirmPassword: string;
  phone: string;
  /** Accounts Payable email (legacy field name invoiceEmail). */
  invoiceEmail: string;
  accountsPayableEmail?: string;
  companyAddress: SignupAddressInput;
  billingSameAsCompany: boolean;
  billingAddress: SignupAddressInput;
  acceptedTerms: boolean;
};

export function formatSignupAddress(address: SignupAddressInput): string {
  const cityLine = [address.city.trim(), address.postcode.trim()].filter(Boolean).join(" ");

  return [address.line1, address.line2, cityLine, address.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
}

export function mapSignupCountryToRegion(country: string): ClientRegion {
  const normalized = country.trim().toLowerCase();

  if (normalized.includes("spain") || normalized.includes("catalonia")) {
    return "Catalonia, Spain";
  }
  if (normalized.includes("portugal")) {
    return "Porto, Portugal";
  }
  if (normalized.includes("australia")) {
    return "Western Australia";
  }
  if (normalized.includes("iberia")) {
    return "Iberia";
  }
  if (normalized.includes("europe")) {
    return "Europe-wide";
  }
  if (normalized.includes("oxford") || normalized.includes("oxfordshire")) {
    return "Oxfordshire, UK";
  }

  return "United Kingdom";
}

export function buildSignupClientNotes(input: {
  organisationId: string | null;
  jobTitle: string;
  accountsPayableEmail?: string;
  /** @deprecated Prefer accountsPayableEmail */
  invoiceEmail?: string;
  billingSameAsCompany: boolean;
}) {
  const accountsPayableEmail = input.accountsPayableEmail || input.invoiceEmail || "";
  const lines = [
    "Created from Unit311 Central signup.",
    input.organisationId ? `Organisation ID: ${input.organisationId}` : null,
    input.jobTitle ? `Job title: ${input.jobTitle}` : null,
    accountsPayableEmail ? `Accounts Payable email: ${accountsPayableEmail}` : null,
    input.billingSameAsCompany ? "Billing address matches company address." : null,
  ].filter(Boolean);

  return lines.join("\n");
}
