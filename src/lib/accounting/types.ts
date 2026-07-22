import type { AccountType } from "@/lib/accounting/chart-of-accounts";

export type JournalStatus = "draft" | "posted";

export type JournalSourceType =
  | "invoice_issue"
  | "invoice_payment"
  | "expense"
  | "expense_payment"
  | "wise_inbound"
  | "wise_outbound"
  | "payroll"
  | "payroll_payment"
  | "manual";

export type LedgerAccount = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  currency: string | null;
  isActive: boolean;
  balance: number;
  transactionCount: number;
};

export type JournalLineInput = {
  accountCode: string;
  debit?: number;
  credit?: number;
  description?: string;
};

export type JournalLine = {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
};

export type JournalEntry = {
  id: string;
  reference: string;
  description: string;
  clientId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  status: JournalStatus;
  journalDate: string;
  createdAt: string;
  postedAt: string | null;
  lines: JournalLine[];
  debitTotal: number;
  creditTotal: number;
};

export type InvoiceStatus = "draft" | "issued" | "paid" | "overdue" | "cancelled";

export type LedgerInvoice = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName?: string;
  organisationId: string | null;
  workspaceId?: string | null;
  issueDate: string;
  dueDate: string;
  currency: string;
  amount: number;
  status: InvoiceStatus;
  paymentReference: string;
  pdfPath: string | null;
  journalEntryId: string | null;
  paymentJournalEntryId: string | null;
  paymentMethod: string | null;
  wiseMatched: boolean;
  wiseMatchedAt: string | null;
  wiseTransactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
  runningBalance: number;
};

export type FinancialOverviewBurnRate = {
  source: "live" | "demo";
  currency: string;
  monthly: number;
  quarterly: number;
  annual: number;
  previousMonthly: number;
  changePct: number;
  trend: "improving" | "stable" | "increasing";
  trendLabel: string;
  cashBalance: number;
  runwayMonths: number | null;
  forecastMonthly: number;
  lines: Array<{
    id: string;
    date: string;
    month: string;
    category:
      | "payroll"
      | "contractors"
      | "software"
      | "office"
      | "marketing"
      | "travel"
      | "other";
    amount: number;
    vendor: string;
    department: string;
    costCentre: string;
    project: string;
    office: string;
    description: string;
  }>;
  series: Array<{
    month: string;
    total: number;
    payroll: number;
    contractors: number;
    software: number;
    office: number;
    marketing: number;
    travel: number;
    other: number;
  }>;
  filterOptions: {
    departments: string[];
    costCentres: string[];
    projects: string[];
    offices: string[];
  };
};

export type FinancialOverviewSnapshot = {
  revenueYtd: number;
  cashPosition: number;
  accountsReceivable: number;
  accountsPayable: number;
  netProfit: number;
  outstandingInvoices: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  annualRevenue: number;
  annualExpenses: number;
  burnRate: FinancialOverviewBurnRate;
  ar: {
    outstanding: number;
    overdue: number;
    dueSoon: number;
    collectionRate: number;
    ageing: Array<{ bucket: string; amount: number }>;
    recentUnpaid: LedgerInvoice[];
  };
  ap: {
    outstanding: number;
    dueThisMonth: number;
    overdue: number;
    upcoming: number;
    recent: Array<{
      id: string;
      supplier: string;
      description: string;
      amount: number;
      currency: string;
      dueDate: string;
      paid: boolean;
    }>;
  };
  payroll: {
    current: number;
    next: number;
    employees: number;
    annual: number;
    monthly: number;
    trend: Array<{ month: string; amount: number }>;
  };
  charts: {
    monthlyRevenue: Array<{ month: string; amount: number }>;
    monthlyProfitLoss: Array<{ month: string; profit: number; loss: number }>;
    monthlyOutgoings: Array<{ month: string; amount: number }>;
    cashPosition: Array<{ month: string; amount: number }>;
  };
  activity: FinancialActivityItem[];
};

export type FinancialActivityItem = {
  id: string;
  type: string;
  label: string;
  description: string;
  amount: number | null;
  currency: string | null;
  at: string;
  href?: string;
};
