import {
  isBoardPackPayrollEligible,
  type HrEmployee,
} from "@/lib/hr-data";
import { listHrEmployees } from "@/lib/hr-employees-service";
import {
  SOFTWARE_DEFAULT_CURRENCY,
  SOFTWARE_DEFAULT_LAST_PAYMENT,
  SOFTWARE_DEFAULT_NEXT_PAYMENT,
  normalizeSoftwareAssetFinance,
  type SoftwareAsset,
} from "@/lib/software-assets-data";
import { listSoftwareAssets } from "@/lib/software-assets-service";
import type { FinancialsWorkspaceScope } from "@/lib/financials-workspace";

export {
  SOFTWARE_DEFAULT_CURRENCY,
  SOFTWARE_DEFAULT_LAST_PAYMENT,
  SOFTWARE_DEFAULT_NEXT_PAYMENT,
  normalizeSoftwareAssetFinance,
};

export type PayrollObligation = {
  monthly: number;
  annual: number;
  employees: number;
  nextPayrollDate: string;
  /** Current period liability (same as monthly until multi-cycle payroll exists). */
  liability: number;
  currency: string;
};

export type SoftwareObligationLine = {
  id: string;
  name: string;
  vendor: string;
  monthlyCost: number;
  currency: string;
  lastPaymentDate: string;
  nextPaymentDate: string;
  frequency: string;
};

export type SoftwareObligation = {
  monthly: number;
  annual: number;
  count: number;
  currency: string;
  lines: SoftwareObligationLine[];
  upcoming: SoftwareObligationLine[];
};

export type OperatingObligations = {
  payroll: PayrollObligation;
  software: SoftwareObligation;
  /** Combined recurring monthly operating spend from live HR + software registers. */
  monthlyRecurring: number;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Next payroll run: last calendar day of the current month, or next month if today is that day. */
export function nextPayrollDate(from = new Date()): string {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const endOfMonth = new Date(Date.UTC(year, month + 1, 0));
  if (from.getUTCDate() < endOfMonth.getUTCDate()) {
    return isoDate(endOfMonth);
  }
  return isoDate(new Date(Date.UTC(year, month + 2, 0)));
}

/** Convert stored salary to a monthly obligation using pay frequency. */
export function monthlySalaryFromEmployee(
  employee: Pick<HrEmployee, "salaryCurrent" | "bonus" | "payFrequency">,
) {
  const gross = Number(employee.salaryCurrent || 0) + Number(employee.bonus || 0);
  const frequency = String(employee.payFrequency || "annual").toLowerCase();
  if (frequency.includes("month")) return gross;
  if (frequency.includes("week") && !frequency.includes("bi")) return (gross * 52) / 12;
  if (frequency.includes("bi") || frequency.includes("fortnight")) return (gross * 26) / 12;
  return gross / 12;
}

export function computePayrollObligation(employees: HrEmployee[]): PayrollObligation {
  const eligible = employees.filter((employee) =>
    isBoardPackPayrollEligible(employee.employmentStatus),
  );
  const monthly = roundMoney(
    eligible.reduce((sum, employee) => sum + monthlySalaryFromEmployee(employee), 0),
  );
  const currency =
    eligible.find((employee) => employee.currency)?.currency ||
    employees.find((employee) => employee.currency)?.currency ||
    "GBP";

  return {
    monthly,
    annual: roundMoney(monthly * 12),
    employees: eligible.length,
    nextPayrollDate: nextPayrollDate(),
    liability: monthly,
    currency,
  };
}

function annualiseSoftware(
  asset: Pick<SoftwareAsset, "monthlyCost" | "renewalFrequency" | "annualCost">,
) {
  const monthly = Number(asset.monthlyCost || 0);
  if (Number(asset.annualCost || 0) > 0) return Number(asset.annualCost);
  const frequency = String(asset.renewalFrequency || "Monthly");
  if (frequency === "Annually") return monthly;
  if (frequency === "Quarterly") return monthly * 4;
  if (frequency === "Monthly") return monthly * 12;
  return monthly * 12;
}

export function computeSoftwareObligation(assets: SoftwareAsset[]): SoftwareObligation {
  const active = assets
    .filter((asset) => asset.status === "Active" || asset.status === "Trial")
    .map((asset) => normalizeSoftwareAssetFinance(asset));

  const lines: SoftwareObligationLine[] = active.map((asset) => ({
    id: asset.id,
    name: asset.name,
    vendor: asset.vendor || asset.supplierName || asset.supplierCompany || "Vendor",
    monthlyCost: roundMoney(Number(asset.monthlyCost || 0)),
    currency: asset.currency || SOFTWARE_DEFAULT_CURRENCY,
    lastPaymentDate: asset.lastPaymentDate || SOFTWARE_DEFAULT_LAST_PAYMENT,
    nextPaymentDate: asset.nextRenewalDate || SOFTWARE_DEFAULT_NEXT_PAYMENT,
    frequency: asset.renewalFrequency || "Monthly",
  }));

  const monthly = roundMoney(lines.reduce((sum, line) => sum + line.monthlyCost, 0));
  const annual = roundMoney(active.reduce((sum, asset) => sum + annualiseSoftware(asset), 0));
  const today = isoDate(new Date());
  const upcoming = [...lines]
    .filter((line) => line.nextPaymentDate >= today)
    .sort((a, b) => a.nextPaymentDate.localeCompare(b.nextPaymentDate));

  const currency = lines.find((line) => line.currency)?.currency || SOFTWARE_DEFAULT_CURRENCY;

  return {
    monthly,
    annual,
    count: lines.length,
    currency,
    lines,
    upcoming,
  };
}

export async function getOperatingObligations(
  scope?: FinancialsWorkspaceScope,
): Promise<OperatingObligations> {
  const workspaceId = scope?.workspaceId ?? undefined;

  const [employeesResult, assetsResult] = await Promise.all([
    listHrEmployees({ workspaceId }).then(
      (value) => ({ ok: true as const, value }),
      () => ({ ok: false as const, value: [] as HrEmployee[] }),
    ),
    listSoftwareAssets({ workspaceId }).then(
      (value) => ({ ok: true as const, value }),
      () => ({ ok: false as const, value: [] as SoftwareAsset[] }),
    ),
  ]);

  const payroll = computePayrollObligation(employeesResult.value);
  const software = computeSoftwareObligation(assetsResult.value);

  return {
    payroll,
    software,
    monthlyRecurring: roundMoney(payroll.monthly + software.monthly),
  };
}
