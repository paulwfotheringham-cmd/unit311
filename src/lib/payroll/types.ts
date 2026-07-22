export type PayrollRunStatus =
  | "draft"
  | "ready"
  | "approved"
  | "processing"
  | "paid"
  | "cancelled";

export type PayrollFrequency = "monthly" | "biweekly" | "weekly" | "annual";

export type PayrollEmployeeStatus = "active" | "paused" | "terminated";

export type WisePaymentStatus = "none" | "pending" | "submitted" | "paid" | "failed";

export type PayrollSettings = {
  workspaceId: string;
  federalTaxPct: number;
  stateTaxPct: number;
  socialSecurityPct: number;
  medicarePct: number;
  employerPayrollPct: number;
  defaultCurrency: string;
  payrollFrequency: PayrollFrequency;
  /** 0 = last calendar day of month */
  payDay: number;
  countryCode: string;
  defaultTaxState: string;
  updatedAt: string;
};

export type PayrollEmployeeProfile = {
  id: string;
  workspaceId: string;
  employeeId: string;
  annualSalary: number | null;
  monthlySalary: number | null;
  hourlyRate: number | null;
  bonus: number;
  commission: number;
  payrollFrequency: PayrollFrequency;
  currency: string;
  taxState: string;
  federalTaxPct: number | null;
  stateTaxPct: number | null;
  socialSecurityPct: number | null;
  medicarePct: number | null;
  employerPayrollPct: number | null;
  payrollStatus: PayrollEmployeeStatus;
  bankAccount: string;
  routingNumber: string;
  payrollEmployeeId: string;
  taxId: string;
  hireDate: string | null;
  terminationDate: string | null;
  manager: string;
  department: string;
  costCentre: string;
  updatedAt: string;
};

export type TaxBreakdown = {
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  employeeTaxTotal: number;
  employerTax: number;
};

export type PayrollCalculation = TaxBreakdown & {
  gross: number;
  bonus: number;
  commission: number;
  net: number;
  totalEmploymentCost: number;
  currency: string;
};

export type PayrollRunLine = {
  id: string;
  workspaceId: string;
  runId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  costCentre: string;
  gross: number;
  bonus: number;
  commission: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  employerTax: number;
  net: number;
  totalEmploymentCost: number;
  currency: string;
};

export type PayrollRun = {
  id: string;
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: PayrollRunStatus;
  employeeCount: number;
  grossPayroll: number;
  employeeTax: number;
  employerTax: number;
  netPayroll: number;
  currency: string;
  journalEntryId: string | null;
  paymentJournalEntryId: string | null;
  wiseBatchId: string | null;
  wisePaymentStatus: WisePaymentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  lines?: PayrollRunLine[];
};

export type PayrollDashboardSnapshot = {
  monthlyGrossPayroll: number;
  estimatedEmployerTaxes: number;
  estimatedEmployeeTaxWithheld: number;
  estimatedNetPayroll: number;
  nextPayrollDate: string;
  payrollRunStatus: PayrollRunStatus | "none";
  employeesPaid: number;
  pendingPayroll: number;
  averageSalary: number;
  currency: string;
  employeeCount: number;
  trend: Array<{ month: string; gross: number; net: number; employerTax: number }>;
  departmentBreakdown: Array<{ department: string; gross: number; net: number; employees: number }>;
  upcomingCalendar: Array<{ date: string; label: string; amount: number }>;
  recentRuns: PayrollRun[];
};

export const DEFAULT_PAYROLL_SETTINGS: Omit<PayrollSettings, "workspaceId" | "updatedAt"> = {
  federalTaxPct: 22,
  stateTaxPct: 5,
  socialSecurityPct: 6.2,
  medicarePct: 1.45,
  employerPayrollPct: 7.65,
  defaultCurrency: "USD",
  payrollFrequency: "monthly",
  payDay: 0,
  countryCode: "US",
  defaultTaxState: "CA",
};

export function roundPayrollMoney(value: number) {
  return Math.round(value * 100) / 100;
}
