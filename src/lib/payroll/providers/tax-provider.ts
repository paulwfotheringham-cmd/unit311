import type { PayrollSettings, TaxBreakdown } from "@/lib/payroll/types";
import { roundPayrollMoney } from "@/lib/payroll/types";

export type TaxRateInput = {
  federalTaxPct: number;
  stateTaxPct: number;
  socialSecurityPct: number;
  medicarePct: number;
  employerPayrollPct: number;
};

export type TaxProvider = {
  id: string;
  label: string;
  calculateEmployeeTaxes(gross: number, rates: TaxRateInput): TaxBreakdown;
};

export function ratesFromSettings(
  settings: Pick<
    PayrollSettings,
    | "federalTaxPct"
    | "stateTaxPct"
    | "socialSecurityPct"
    | "medicarePct"
    | "employerPayrollPct"
  >,
  overrides?: Partial<TaxRateInput> | null,
): TaxRateInput {
  return {
    federalTaxPct: overrides?.federalTaxPct ?? settings.federalTaxPct,
    stateTaxPct: overrides?.stateTaxPct ?? settings.stateTaxPct,
    socialSecurityPct: overrides?.socialSecurityPct ?? settings.socialSecurityPct,
    medicarePct: overrides?.medicarePct ?? settings.medicarePct,
    employerPayrollPct: overrides?.employerPayrollPct ?? settings.employerPayrollPct,
  };
}

export function applyPercentageTax(gross: number, rates: TaxRateInput): TaxBreakdown {
  const federalTax = roundPayrollMoney((gross * rates.federalTaxPct) / 100);
  const stateTax = roundPayrollMoney((gross * rates.stateTaxPct) / 100);
  const socialSecurity = roundPayrollMoney((gross * rates.socialSecurityPct) / 100);
  const medicare = roundPayrollMoney((gross * rates.medicarePct) / 100);
  const employeeTaxTotal = roundPayrollMoney(
    federalTax + stateTax + socialSecurity + medicare,
  );
  const employerTax = roundPayrollMoney((gross * rates.employerPayrollPct) / 100);
  return {
    federalTax,
    stateTax,
    socialSecurity,
    medicare,
    employeeTaxTotal,
    employerTax,
  };
}
