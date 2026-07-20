/** Corporate Information domain types — mock-first, shaped for later APIs. */

export const CORPORATE_BANK_ACCOUNT_TYPES = [
  "Current",
  "Savings",
  "Multi-currency",
  "Treasury",
] as const;

export const CORPORATE_BANK_STATUSES = ["active", "review", "archived"] as const;
export type CorporateBankStatus = (typeof CORPORATE_BANK_STATUSES)[number];

export type CorporateBankAccount = {
  id: string;
  bank: string;
  accountName: string;
  currency: string;
  country: string;
  accountType: (typeof CORPORATE_BANK_ACCOUNT_TYPES)[number];
  status: CorporateBankStatus;
  primary: boolean;
  iban: string;
  swift: string;
  routing: string;
  branch: string;
  accountHolder: string;
  notes: string;
};

export const CORPORATE_ADVISOR_CATEGORIES = [
  "Lawyers",
  "Accountants",
  "Auditors",
  "Tax Advisors",
  "Insurance Brokers",
  "Corporate Secretaries",
  "IP Lawyers",
  "Consultants",
] as const;

export type CorporateAdvisorCategory = (typeof CORPORATE_ADVISOR_CATEGORIES)[number];

export type CorporateAdvisor = {
  id: string;
  company: string;
  contact: string;
  category: CorporateAdvisorCategory;
  country: string;
  phone: string;
  email: string;
  retainer: string;
  status: "active" | "inactive";
  notes: string;
};

export const CORPORATE_CONTRACT_TYPES = [
  "MSA",
  "NDA",
  "Lease",
  "Supplier",
  "Insurance",
  "Employment",
  "IP",
  "Other",
] as const;

export type CorporateContract = {
  id: string;
  name: string;
  supplier: string;
  type: (typeof CORPORATE_CONTRACT_TYPES)[number];
  owner: string;
  startDate: string;
  expiryDate: string;
  value: string;
  status: "active" | "expiring" | "expired" | "draft" | "archived";
  summary: string;
  parties: string;
  renewalNotes: string;
  documents: string;
  notes: string;
};

export type CorporateOffice = {
  id: string;
  name: string;
  country: string;
  city: string;
  address: string;
  manager: string;
  employees: number;
  status: "active" | "archived";
  phone: string;
  timezone: string;
};

export type CorporateShareClass = "Ordinary" | "Preference" | "Options";

export type CorporateShareholder = {
  id: string;
  company: string;
  shareholder: string;
  shareClass: CorporateShareClass;
  shares: number;
  price: string;
  issueDate: string;
  notes: string;
};

export type CorporateOptionPool = {
  authorised: number;
  issued: number;
  reserved: number;
  lastUpdated: string;
};

export type CorporateCapital = {
  authorisedShareCapital: string;
  issuedShareCapital: string;
  currency: string;
};

export type CorporateLicence = {
  id: string;
  software: string;
  vendor: string;
  licenceType: string;
  seats: number;
  renewalDate: string;
  cost: string;
  owner: string;
  status: "active" | "expiring" | "expired" | "archived";
};

export type CorporateActivityItem = {
  id: string;
  at: string;
  label: string;
  detail: string;
};

export type CorporateHealthItem = {
  id: string;
  kind: string;
  label: string;
  detail: string;
  severity: "info" | "warning" | "critical";
};

export function ownershipPercent(shares: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((shares / total) * 1000) / 10;
}

export function daysUntil(dateKey: string) {
  const target = new Date(`${dateKey}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isWithinDays(dateKey: string | null | undefined, days: number) {
  if (!dateKey) return false;
  const diff = daysUntil(dateKey);
  return diff >= 0 && diff <= days;
}

export function statusPillClass(status: string) {
  switch (status) {
    case "active":
    case "primary":
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
    case "expiring":
    case "review":
      return "border-amber-400/30 bg-amber-500/15 text-amber-200";
    case "expired":
    case "archived":
    case "inactive":
      return "border-white/15 bg-white/5 text-white/55";
    case "draft":
      return "border-sky-400/30 bg-sky-500/15 text-sky-200";
    case "critical":
      return "border-rose-400/30 bg-rose-500/15 text-rose-200";
    default:
      return "border-white/15 bg-white/5 text-white/60";
  }
}
