export const SOFTWARE_STATUSES = ["Active", "Trial", "Cancelled"] as const;
export type SoftwareStatus = (typeof SOFTWARE_STATUSES)[number];

export const LICENCE_TYPES = ["Named", "Concurrent", "Per user", "Unlimited"] as const;
export type LicenceType = (typeof LICENCE_TYPES)[number];

export const RENEWAL_FREQUENCIES = ["Monthly", "Quarterly", "Annually"] as const;
export type RenewalFrequency = (typeof RENEWAL_FREQUENCIES)[number];

export const ATTACHMENT_KINDS = [
  "Contract",
  "Invoice",
  "Renewal quote",
  "Licence agreement",
  "User guide",
  "Other",
] as const;
export type SoftwareAttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export type SoftwareAssetCredentials = {
  primaryAccountEmail: string;
  portalUrl: string;
  username: string;
  /** True when an encrypted password is stored. Never includes plaintext. */
  passwordSet: boolean;
  mfaEnabled: boolean;
  recoveryEmail: string;
  recoveryPhone: string;
  notes: string;
};

export type SoftwareAssetFile = {
  id: string;
  fileObjectId: string;
  fileName: string;
  attachmentKind: SoftwareAttachmentKind;
  createdAt: string;
};

export type SoftwareAsset = {
  id: string;
  workspaceId: string;

  name: string;
  vendor: string;
  purpose: string;
  category: string;
  websiteUrl: string;
  supportUrl: string;
  documentationUrl: string;
  status: SoftwareStatus;

  licencesPurchased: number;
  licencesAllocated: number;
  licenceType: LicenceType;

  monthlyCost: number;
  annualCost: number;
  currency: string;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  nextRenewalDate: string | null;
  renewalFrequency: RenewalFrequency;
  contractLength: string;
  costCentre: string;
  budgetOwner: string;
  supplierName: string;
  invoiceReference: string;
  financialAccountCode: string;

  businessOwner: string;
  technicalOwner: string;
  department: string;
  approver: string;

  supplierCompany: string;
  accountManager: string;
  supportEmail: string;
  supportPhone: string;
  customerNumber: string;

  integrationConnected: boolean;
  integrationApiKeySet: boolean;
  integrationWebhookUrl: string;
  integrationOauthStatus: string;
  integrationSyncStatus: string;

  linkedExpenseId: string | null;
  filesFolderId: string | null;

  credentials: SoftwareAssetCredentials;
  files: SoftwareAssetFile[];

  createdAt: string;
  updatedAt: string;
};

export type SoftwareAssetsSummary = {
  totalProducts: number;
  monthlySpend: number;
  annualSpend: number;
  licencesPurchased: number;
  licencesInUse: number;
  licencesAvailable: number;
  renewalsDueIn30Days: number;
  unusedLicences: number;
  costPerEmployee: number | null;
  currency: string;
};

/** Default licence payment cadence for registers that pre-date finance fields. */
export const SOFTWARE_DEFAULT_LAST_PAYMENT = "2026-07-01";
export const SOFTWARE_DEFAULT_NEXT_PAYMENT = "2026-08-01";
export const SOFTWARE_DEFAULT_CURRENCY = "USD";

export function normalizeSoftwareAssetFinance<T extends SoftwareAsset>(asset: T): T {
  const monthlyCost = Number(asset.monthlyCost || 0);
  return {
    ...asset,
    currency: asset.currency?.trim() || SOFTWARE_DEFAULT_CURRENCY,
    renewalFrequency: asset.renewalFrequency || "Monthly",
    lastPaymentDate: asset.lastPaymentDate || SOFTWARE_DEFAULT_LAST_PAYMENT,
    nextRenewalDate: asset.nextRenewalDate || SOFTWARE_DEFAULT_NEXT_PAYMENT,
    lastPaymentAmount:
      asset.lastPaymentAmount == null || Number.isNaN(Number(asset.lastPaymentAmount))
        ? monthlyCost || null
        : asset.lastPaymentAmount,
  };
}

export function availableLicences(asset: Pick<SoftwareAsset, "licencesPurchased" | "licencesAllocated" | "licenceType">) {
  if (asset.licenceType === "Unlimited") return null;
  return Math.max(0, asset.licencesPurchased - asset.licencesAllocated);
}

export function createBlankSoftwareAsset(workspaceId = ""): SoftwareAsset {
  const now = new Date().toISOString();
  return {
    id: "",
    workspaceId,
    name: "New software",
    vendor: "",
    purpose: "",
    category: "",
    websiteUrl: "",
    supportUrl: "",
    documentationUrl: "",
    status: "Active",
    licencesPurchased: 1,
    licencesAllocated: 0,
    licenceType: "Named",
    monthlyCost: 0,
    annualCost: 0,
    currency: "USD",
    lastPaymentAmount: null,
    lastPaymentDate: "2026-07-01",
    nextRenewalDate: "2026-08-01",
    renewalFrequency: "Monthly",
    contractLength: "",
    costCentre: "",
    budgetOwner: "",
    supplierName: "",
    invoiceReference: "",
    financialAccountCode: "5010",
    businessOwner: "",
    technicalOwner: "",
    department: "",
    approver: "",
    supplierCompany: "",
    accountManager: "",
    supportEmail: "",
    supportPhone: "",
    customerNumber: "",
    integrationConnected: false,
    integrationApiKeySet: false,
    integrationWebhookUrl: "",
    integrationOauthStatus: "",
    integrationSyncStatus: "",
    linkedExpenseId: null,
    filesFolderId: null,
    credentials: {
      primaryAccountEmail: "",
      portalUrl: "",
      username: "",
      passwordSet: false,
      mfaEnabled: false,
      recoveryEmail: "",
      recoveryPhone: "",
      notes: "",
    },
    files: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function computeSoftwareAssetsSummary(
  assets: SoftwareAsset[],
  employeeCount: number | null,
): SoftwareAssetsSummary {
  const spendAssets = assets.filter((asset) => asset.status === "Active" || asset.status === "Trial");
  const monthlySpend = spendAssets.reduce((sum, asset) => sum + Number(asset.monthlyCost || 0), 0);
  const annualSpend = spendAssets.reduce((sum, asset) => {
    if (Number(asset.annualCost || 0) > 0) return sum + Number(asset.annualCost);
    if (asset.renewalFrequency === "Monthly") return sum + Number(asset.monthlyCost || 0) * 12;
    if (asset.renewalFrequency === "Quarterly") return sum + Number(asset.monthlyCost || 0) * 4;
    return sum + Number(asset.monthlyCost || 0) * 12;
  }, 0);

  const licencesPurchased = assets.reduce((sum, asset) => sum + asset.licencesPurchased, 0);
  const licencesInUse = assets.reduce((sum, asset) => sum + asset.licencesAllocated, 0);
  const licencesAvailable = assets.reduce((sum, asset) => {
    const available = availableLicences(asset);
    return sum + (available ?? 0);
  }, 0);

  const now = Date.now();
  const in30 = now + 30 * 24 * 60 * 60 * 1000;
  const renewalsDueIn30Days = assets.filter((asset) => {
    if (!asset.nextRenewalDate || asset.status === "Cancelled") return false;
    const ts = new Date(asset.nextRenewalDate).getTime();
    return ts >= now && ts <= in30;
  }).length;

  const currency =
    spendAssets.find((asset) => asset.currency)?.currency ||
    assets[0]?.currency ||
    "GBP";

  return {
    totalProducts: assets.length,
    monthlySpend,
    annualSpend,
    licencesPurchased,
    licencesInUse,
    licencesAvailable,
    renewalsDueIn30Days,
    unusedLicences: licencesAvailable,
    costPerEmployee:
      employeeCount && employeeCount > 0 ? annualSpend / employeeCount : null,
    currency,
  };
}

export function formatSoftwareMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

export function softwareAssetToCsvRow(asset: SoftwareAsset) {
  return {
    Name: asset.name,
    Vendor: asset.vendor,
    Category: asset.category,
    Status: asset.status,
    "Monthly cost": asset.monthlyCost,
    "Annual cost": asset.annualCost,
    Currency: asset.currency,
    "Licences purchased": asset.licencesPurchased,
    "Licences allocated": asset.licencesAllocated,
    "Licence type": asset.licenceType,
    "Next renewal": asset.nextRenewalDate ?? "",
    "Renewal frequency": asset.renewalFrequency,
    "Business owner": asset.businessOwner,
    "Technical owner": asset.technicalOwner,
    Department: asset.department,
    Supplier: asset.supplierCompany || asset.supplierName,
  };
}
