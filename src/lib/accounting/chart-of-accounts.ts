export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type ChartAccountSeed = {
  code: string;
  name: string;
  type: AccountType;
  currency?: string | null;
};

export const CHART_OF_ACCOUNTS_SEED: ChartAccountSeed[] = [
  { code: "1000", name: "Wise USD", type: "asset", currency: "USD" },
  { code: "1010", name: "Wise GBP", type: "asset", currency: "GBP" },
  { code: "1020", name: "Wise EUR", type: "asset", currency: "EUR" },
  { code: "1030", name: "Accounts Receivable", type: "asset" },
  { code: "1040", name: "Prepaid Expenses", type: "asset" },
  { code: "2000", name: "Accounts Payable", type: "liability" },
  { code: "2010", name: "Deferred Revenue", type: "liability" },
  { code: "2020", name: "Payroll Clearing", type: "liability" },
  { code: "2030", name: "Employer Payroll Tax Payable", type: "liability" },
  { code: "3000", name: "Owner Equity", type: "equity" },
  { code: "3010", name: "Retained Earnings", type: "equity" },
  { code: "4000", name: "Subscription Revenue", type: "income" },
  { code: "4010", name: "Professional Services", type: "income" },
  { code: "5000", name: "Stripe Fees", type: "expense" },
  { code: "5010", name: "Software Subscriptions", type: "expense" },
  { code: "5020", name: "Payroll", type: "expense" },
  { code: "5021", name: "Employer Payroll Tax", type: "expense" },
  { code: "5030", name: "Contractors", type: "expense" },
  { code: "5040", name: "Marketing", type: "expense" },
  { code: "5050", name: "Travel", type: "expense" },
  { code: "5060", name: "Office", type: "expense" },
  { code: "5070", name: "Accounting", type: "expense" },
  { code: "5080", name: "Legal", type: "expense" },
  { code: "5090", name: "Misc Expenses", type: "expense" },
];

export const ACCOUNT_CODES = {
  wiseUsd: "1000",
  wiseGbp: "1010",
  wiseEur: "1020",
  accountsReceivable: "1030",
  prepaidExpenses: "1040",
  accountsPayable: "2000",
  deferredRevenue: "2010",
  payrollClearing: "2020",
  employerPayrollTaxPayable: "2030",
  ownerEquity: "3000",
  retainedEarnings: "3010",
  subscriptionRevenue: "4000",
  professionalServices: "4010",
  stripeFees: "5000",
  softwareSubscriptions: "5010",
  payroll: "5020",
  employerPayrollTax: "5021",
  contractors: "5030",
  marketing: "5040",
  travel: "5050",
  office: "5060",
  accounting: "5070",
  legal: "5080",
  miscExpenses: "5090",
} as const;

export function wiseAccountCodeForCurrency(currency: string) {
  const upper = currency.toUpperCase();
  if (upper === "GBP") return ACCOUNT_CODES.wiseGbp;
  if (upper === "EUR") return ACCOUNT_CODES.wiseEur;
  return ACCOUNT_CODES.wiseUsd;
}

export function formatMoney(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
