export const COMPANY_STATUSES = [
  "Active",
  "Dormant",
  "Dissolved",
  "In Liquidation",
  "Other",
] as const;

export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export type CompanyDetailsFields = {
  legalCompanyName: string;
  tradingName: string;
  companyNumber: string;
  vatTaxNumber: string;
  registeredOfficeAddress: string;
  principalBusinessAddress: string;
  countryOfRegistration: string;
  dateOfIncorporation: string;
  companyStatus: CompanyStatus;
  sicIndustryClassification: string;
  website: string;
  primaryEmail: string;
  primaryTelephone: string;
  generalCompanyDescription: string;
};

export type CompanyDetails = CompanyDetailsFields & {
  id: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
};

export type CompanyDetailsValidationErrors = Partial<
  Record<keyof CompanyDetailsFields, string>
>;

export function createBlankCompanyDetailsFields(): CompanyDetailsFields {
  return {
    legalCompanyName: "",
    tradingName: "",
    companyNumber: "",
    vatTaxNumber: "",
    registeredOfficeAddress: "",
    principalBusinessAddress: "",
    countryOfRegistration: "",
    dateOfIncorporation: "",
    companyStatus: "Active",
    sicIndustryClassification: "",
    website: "",
    primaryEmail: "",
    primaryTelephone: "",
    generalCompanyDescription: "",
  };
}

export function isCompanyStatus(value: unknown): value is CompanyStatus {
  return (
    typeof value === "string" &&
    (COMPANY_STATUSES as readonly string[]).includes(value)
  );
}

export function companyDetailsFieldsEqual(
  a: CompanyDetailsFields,
  b: CompanyDetailsFields,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function isCompanyDetailsEmpty(fields: CompanyDetailsFields): boolean {
  const blank = createBlankCompanyDetailsFields();
  return companyDetailsFieldsEqual(
    { ...fields, companyStatus: blank.companyStatus },
    blank,
  );
}

function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function validateCompanyDetailsFields(
  fields: CompanyDetailsFields,
): CompanyDetailsValidationErrors {
  const errors: CompanyDetailsValidationErrors = {};

  if (!fields.legalCompanyName.trim()) {
    errors.legalCompanyName = "Legal company name is required.";
  }

  if (fields.primaryEmail.trim()) {
    const email = fields.primaryEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.primaryEmail = "Enter a valid email address.";
    }
  }

  if (fields.website.trim()) {
    try {
      const parsed = new URL(normalizeWebsite(fields.website));
      if (!parsed.hostname.includes(".")) {
        errors.website = "Enter a valid website URL.";
      }
    } catch {
      errors.website = "Enter a valid website URL.";
    }
  }

  if (fields.dateOfIncorporation.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.dateOfIncorporation.trim())) {
      errors.dateOfIncorporation = "Use a valid incorporation date.";
    } else {
      const date = new Date(`${fields.dateOfIncorporation.trim()}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) {
        errors.dateOfIncorporation = "Use a valid incorporation date.";
      } else if (date.getTime() > Date.now()) {
        errors.dateOfIncorporation = "Incorporation date cannot be in the future.";
      }
    }
  }

  if (!isCompanyStatus(fields.companyStatus)) {
    errors.companyStatus = "Select a valid company status.";
  }

  if (fields.primaryTelephone.trim()) {
    const phone = fields.primaryTelephone.trim();
    if (!/^[+\d][\d\s().-]{5,}$/.test(phone)) {
      errors.primaryTelephone = "Enter a valid telephone number.";
    }
  }

  return errors;
}

export function sanitizeCompanyDetailsFields(
  fields: CompanyDetailsFields,
): CompanyDetailsFields {
  return {
    legalCompanyName: fields.legalCompanyName.trim(),
    tradingName: fields.tradingName.trim(),
    companyNumber: fields.companyNumber.trim(),
    vatTaxNumber: fields.vatTaxNumber.trim(),
    registeredOfficeAddress: fields.registeredOfficeAddress.trim(),
    principalBusinessAddress: fields.principalBusinessAddress.trim(),
    countryOfRegistration: fields.countryOfRegistration.trim(),
    dateOfIncorporation: fields.dateOfIncorporation.trim(),
    companyStatus: isCompanyStatus(fields.companyStatus)
      ? fields.companyStatus
      : "Active",
    sicIndustryClassification: fields.sicIndustryClassification.trim(),
    website: fields.website.trim()
      ? normalizeWebsite(fields.website)
      : "",
    primaryEmail: fields.primaryEmail.trim().toLowerCase(),
    primaryTelephone: fields.primaryTelephone.trim(),
    generalCompanyDescription: fields.generalCompanyDescription.trim(),
  };
}
