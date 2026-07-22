import { getCountryRules } from "@/lib/payroll/country-rules/us";
import { noopBenefitsProvider } from "@/lib/payroll/providers/benefits-provider";
import { ratesFromSettings } from "@/lib/payroll/providers/tax-provider";
import type {
  PayrollCalculation,
  PayrollEmployeeProfile,
  PayrollFrequency,
  PayrollSettings,
} from "@/lib/payroll/types";
import { roundPayrollMoney } from "@/lib/payroll/types";

export type EmployeePayInput = {
  salaryCurrent?: number | null;
  bonus?: number | null;
  payFrequency?: string | null;
  currency?: string | null;
  profile?: Partial<PayrollEmployeeProfile> | null;
};

/** Derive monthly base salary from HR + optional payroll profile overrides. */
export function resolveMonthlyGrossBase(input: EmployeePayInput): number {
  const profile = input.profile;
  if (profile?.monthlySalary != null && profile.monthlySalary > 0) {
    return roundPayrollMoney(profile.monthlySalary);
  }
  if (profile?.annualSalary != null && profile.annualSalary > 0) {
    return roundPayrollMoney(profile.annualSalary / 12);
  }
  if (profile?.hourlyRate != null && profile.hourlyRate > 0) {
    // V1 assumption: 160 hours / month
    return roundPayrollMoney(profile.hourlyRate * 160);
  }

  const salary = Number(input.salaryCurrent || 0);
  const frequency = String(input.payFrequency || profile?.payrollFrequency || "annual").toLowerCase();
  if (frequency.includes("month")) return roundPayrollMoney(salary);
  if (frequency.includes("week") && !frequency.includes("bi")) {
    return roundPayrollMoney((salary * 52) / 12);
  }
  if (frequency.includes("bi") || frequency.includes("fortnight")) {
    return roundPayrollMoney((salary * 26) / 12);
  }
  return roundPayrollMoney(salary / 12);
}

export function resolvePayAddOns(input: EmployeePayInput): { bonus: number; commission: number } {
  const profileBonus = input.profile?.bonus;
  const hrBonus = Number(input.bonus || 0);
  const bonus =
    profileBonus != null && profileBonus > 0
      ? roundPayrollMoney(profileBonus)
      : roundPayrollMoney(hrBonus);
  const commission = roundPayrollMoney(Number(input.profile?.commission || 0));
  return { bonus, commission };
}

export function calculateEmployeePayroll(
  input: EmployeePayInput,
  settings: PayrollSettings,
): PayrollCalculation {
  const country = getCountryRules(settings.countryCode);
  const base = resolveMonthlyGrossBase(input);
  const { bonus, commission } = resolvePayAddOns(input);
  const gross = roundPayrollMoney(base + bonus + commission);

  const rates = ratesFromSettings(settings, {
    federalTaxPct: input.profile?.federalTaxPct ?? undefined,
    stateTaxPct: input.profile?.stateTaxPct ?? undefined,
    socialSecurityPct: input.profile?.socialSecurityPct ?? undefined,
    medicarePct: input.profile?.medicarePct ?? undefined,
    employerPayrollPct: input.profile?.employerPayrollPct ?? undefined,
  });

  const taxes = country.taxProvider.calculateEmployeeTaxes(gross, rates);
  const benefits = noopBenefitsProvider.applyBenefits(gross);
  const net = roundPayrollMoney(gross - taxes.employeeTaxTotal - benefits.deduction);
  const totalEmploymentCost = roundPayrollMoney(
    gross + taxes.employerTax + benefits.employerContribution,
  );

  return {
    gross,
    bonus,
    commission,
    ...taxes,
    net: Math.max(0, net),
    totalEmploymentCost,
    currency:
      input.profile?.currency ||
      input.currency ||
      settings.defaultCurrency ||
      country.defaultCurrency,
  };
}

export function periodBoundsForPayDate(payDate: string, frequency: PayrollFrequency = "monthly") {
  const end = new Date(`${payDate}T12:00:00.000Z`);
  const start = new Date(end);
  if (frequency === "weekly") {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (frequency === "biweekly") {
    start.setUTCDate(start.getUTCDate() - 13);
  } else {
    start.setUTCDate(1);
  }
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

/** Next pay date from settings (0 = last day of month). */
export function nextPayDateFromSettings(settings: PayrollSettings, from = new Date()): string {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const targetDay = settings.payDay > 0 ? Math.min(settings.payDay, lastDay) : lastDay;
  const candidate = new Date(Date.UTC(year, month, targetDay));
  if (from.getUTCDate() < targetDay || (settings.payDay === 0 && from.getUTCDate() < lastDay)) {
    return candidate.toISOString().slice(0, 10);
  }
  const nextLast = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  const nextDay = settings.payDay > 0 ? Math.min(settings.payDay, nextLast) : nextLast;
  return new Date(Date.UTC(year, month + 1, nextDay)).toISOString().slice(0, 10);
}
