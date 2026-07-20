import {
  daysUntil,
  isWithinDays,
  type CorporateActivityItem,
  type CorporateBankAccount,
  type CorporateContract,
  type CorporateHealthItem,
  type CorporateLicence,
  type CorporateOffice,
  type CorporateShareholder,
} from "@/lib/corporate-data";
import { getCorporateMockSnapshot } from "@/lib/corporate-mock-store";

export type CorporateDashboardKpis = {
  registeredCompanies: number;
  officeLocations: number;
  bankAccounts: number;
  professionalAdvisors: number;
  activeContracts: number;
  softwareLicences: number;
  corporateDocuments: number;
};

export function computeCorporateDashboardKpis(input?: {
  companyPresent?: boolean;
  liveLicenceCount?: number;
}): CorporateDashboardKpis {
  const store = getCorporateMockSnapshot();
  const activeOffices = store.offices.filter((o) => o.status === "active").length;
  const activeBanks = store.banks.filter((b) => b.status !== "archived").length;
  const activeAdvisors = store.advisors.filter((a) => a.status === "active").length;
  const activeContracts = store.contracts.filter(
    (c) => c.status === "active" || c.status === "expiring",
  ).length;
  const licences =
    input?.liveLicenceCount != null
      ? input.liveLicenceCount
      : store.licences.filter((l) => l.status !== "archived").length;

  return {
    registeredCompanies: input?.companyPresent === false ? 0 : 1,
    officeLocations: activeOffices,
    bankAccounts: activeBanks,
    professionalAdvisors: activeAdvisors,
    activeContracts,
    softwareLicences: licences,
    corporateDocuments:
      store.contracts.filter((c) => Boolean(c.documents?.trim())).length +
      Math.max(licences, 0),
  };
}

export function computeCorporateHealthItems(liveLicences: CorporateLicence[] = []): CorporateHealthItem[] {
  const store = getCorporateMockSnapshot();
  const items: CorporateHealthItem[] = [];

  for (const contract of store.contracts) {
    if (contract.status === "archived") continue;
    if (isWithinDays(contract.expiryDate, 60) || contract.status === "expiring") {
      items.push({
        id: `contract-${contract.id}`,
        kind: "Contract renewal",
        label: contract.name,
        detail: `Expires ${contract.expiryDate} · ${contract.supplier}`,
        severity: daysUntil(contract.expiryDate) <= 14 ? "critical" : "warning",
      });
    }
  }

  const licencePool = liveLicences.length ? liveLicences : store.licences;
  for (const licence of licencePool) {
    if (licence.status === "archived") continue;
    if (isWithinDays(licence.renewalDate, 60) || licence.status === "expiring") {
      items.push({
        id: `licence-${licence.id}`,
        kind: "Licence expiry",
        label: licence.software,
        detail: `Renewal ${licence.renewalDate} · ${licence.vendor}`,
        severity: daysUntil(licence.renewalDate) <= 14 ? "critical" : "warning",
      });
    }
  }

  const hasInsurance = store.contracts.some(
    (c) => c.type === "Insurance" && (c.status === "active" || c.status === "expiring"),
  );
  if (!hasInsurance) {
    items.push({
      id: "insurance-missing",
      kind: "Missing insurance",
      label: "No active insurance contract",
      detail: "Add or renew corporate insurance coverage.",
      severity: "warning",
    });
  }

  const missingDocs = store.contracts.filter(
    (c) => (c.status === "active" || c.status === "expiring") && !c.documents?.trim(),
  );
  for (const contract of missingDocs.slice(0, 3)) {
    items.push({
      id: `doc-${contract.id}`,
      kind: "Missing compliance document",
      label: contract.name,
      detail: "Signed agreement not attached on the contract record.",
      severity: "info",
    });
  }

  for (const bank of store.banks.filter((b) => b.status === "review")) {
    items.push({
      id: `bank-${bank.id}`,
      kind: "Bank account review",
      label: bank.accountName,
      detail: `${bank.bank} · ${bank.currency}`,
      severity: "warning",
    });
  }

  if (store.offices.filter((o) => o.status === "active" && !o.manager.trim()).length) {
    items.push({
      id: "office-manager",
      kind: "Corporate action outstanding",
      label: "Office without manager",
      detail: "Assign a site manager on the office record.",
      severity: "info",
    });
  }

  return items.slice(0, 10);
}

export function listCorporateRecentActivity(limit = 8): CorporateActivityItem[] {
  return getCorporateMockSnapshot().activity.slice(0, limit);
}

export function totalIssuedShares(shareholders: CorporateShareholder[]) {
  return shareholders.reduce((sum, row) => sum + row.shares, 0);
}

export type { CorporateOffice, CorporateBankAccount, CorporateContract, CorporateLicence };
