import type { DashboardTileDefinition } from "@/lib/dashboard-view-tiles";
import type { ManagedClient } from "@/lib/client-management-data";
import { inferExpenseCategory, type FinancialExpense } from "@/lib/expenses-data";

export const CRM_DASHBOARD_TILES: DashboardTileDefinition[] = [
  { id: "open-leads", label: "Open leads", value: "24", hint: "Pipeline not closed" },
  { id: "qualified", label: "Qualified", value: "11", hint: "Ready for proposal" },
  { id: "pipeline-value", label: "Pipeline value", value: "€1.2M", hint: "Estimated total" },
  { id: "due-this-week", label: "Due this week", value: "6", hint: "Next actions scheduled" },
];

export const CLIENTS_DASHBOARD_TILES: DashboardTileDefinition[] = [
  { id: "active-clients", label: "Active clients", value: "0", hint: "Live accounts" },
  { id: "onboarding", label: "Onboarding", value: "0", hint: "In setup" },
  { id: "open-tickets", label: "Open support", value: "0", hint: "Client issues" },
];

export function buildClientDashboardCatalog(clients: ManagedClient[]): DashboardTileDefinition[] {
  const activeCount = clients.filter((client) => client.accountStatus === "Active").length;
  const onboardingCount = clients.filter((client) => client.accountStatus === "Pending").length;

  return CLIENTS_DASHBOARD_TILES.map((tile) => {
    switch (tile.id) {
      case "active-clients":
        return { ...tile, value: String(activeCount) };
      case "onboarding":
        return { ...tile, value: String(onboardingCount) };
      case "open-tickets":
        return { ...tile, value: "0" };
      default:
        return tile;
    }
  });
}

export const REPRESENTATIVES_DASHBOARD_TILES: DashboardTileDefinition[] = [
  { id: "active-reps", label: "Active reps", value: "8", hint: "Field network" },
  { id: "commission-due", label: "Commission due", value: "€42k", hint: "Outstanding" },
  { id: "territories", label: "Territories", value: "12", hint: "Coverage regions" },
  { id: "new-leads", label: "Rep-sourced leads", value: "14", hint: "This quarter" },
];

export const PROJECTS_DASHBOARD_TILES: DashboardTileDefinition[] = [
  { id: "live-projects", label: "Live projects", value: "9", hint: "In delivery" },
  { id: "upcoming", label: "Upcoming", value: "4", hint: "Mobilising soon" },
  { id: "avg-progress", label: "Avg progress", value: "67%", hint: "Live portfolio" },
  { id: "at-risk", label: "At risk", value: "2", hint: "Needs attention" },
];

export const FINANCIALS_DASHBOARD_TILES: DashboardTileDefinition[] = [
  { id: "revenue-ytd", label: "Revenue YTD", value: "$0", hint: "From general ledger" },
  { id: "cash-position", label: "Cash Position", value: "$0", hint: "Wise cash accounts" },
  { id: "accounts-receivable", label: "Accounts Receivable", value: "$0", hint: "Outstanding AR" },
  { id: "accounts-payable", label: "Accounts Payable", value: "$0", hint: "Outstanding AP" },
  { id: "net-profit", label: "Net Profit", value: "$0", hint: "Income − expenses" },
  { id: "outstanding-invoices", label: "Outstanding Invoices", value: "0", hint: "Open invoice count" },
  { id: "monthly-revenue", label: "Monthly Revenue", value: "$0", hint: "Current month" },
  { id: "monthly-expenses", label: "Monthly Expenses", value: "$0", hint: "Current month" },
  { id: "annual-revenue", label: "Annual Revenue", value: "$0", hint: "Calendar year" },
  { id: "annual-expenses", label: "Annual Expenses", value: "$0", hint: "Calendar year" },
  { id: "gross-margin", label: "Gross Margin", value: "0%", hint: "From ledger income/expenses" },
  { id: "forecast", label: "Forecast", value: "$0", hint: "Not configured yet" },
];

export function buildFinancialsDashboardCatalog(
  overview: {
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
  } | null,
): DashboardTileDefinition[] {
  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  if (!overview) return FINANCIALS_DASHBOARD_TILES;

  const marginBaseExpenses =
    overview.annualExpenses > 0 ? overview.annualExpenses : overview.monthlyExpenses;
  const marginPct =
    overview.revenueYtd <= 0
      ? 0
      : Math.round(((overview.revenueYtd - marginBaseExpenses) / overview.revenueYtd) * 1000) / 10;

  return FINANCIALS_DASHBOARD_TILES.map((tile) => {
    switch (tile.id) {
      case "revenue-ytd":
        return { ...tile, value: money(overview.revenueYtd) };
      case "cash-position":
        return { ...tile, value: money(overview.cashPosition) };
      case "accounts-receivable":
        return { ...tile, value: money(overview.accountsReceivable) };
      case "accounts-payable":
        return { ...tile, value: money(overview.accountsPayable) };
      case "net-profit":
        return { ...tile, value: money(overview.netProfit) };
      case "outstanding-invoices":
        return { ...tile, value: String(overview.outstandingInvoices) };
      case "monthly-revenue":
        return { ...tile, value: money(overview.monthlyRevenue) };
      case "monthly-expenses":
        return { ...tile, value: money(overview.monthlyExpenses) };
      case "annual-revenue":
        return { ...tile, value: money(overview.annualRevenue) };
      case "annual-expenses":
        return { ...tile, value: money(overview.annualExpenses) };
      case "gross-margin":
        return { ...tile, value: `${marginPct}%` };
      case "forecast":
        return { ...tile, value: money(0), hint: "Forecast not configured" };
      default:
        return tile;
    }
  });
}

export const DEBTORS_DASHBOARD_TILES: DashboardTileDefinition[] = [
  { id: "total-outstanding", label: "Outstanding", value: "€186k", hint: "All debtors" },
  { id: "overdue", label: "Overdue", value: "€24k", hint: "> 30 days" },
  { id: "dso", label: "DSO", value: "34 days", hint: "Days sales outstanding" },
  { id: "collected-mtd", label: "Collected MTD", value: "€58k", hint: "Cash received" },
];

export const CREDITORS_DASHBOARD_TILES: DashboardTileDefinition[] = [
  { id: "payables", label: "Payables", value: "€92k", hint: "Open invoices" },
  { id: "due-week", label: "Due this week", value: "€18k", hint: "Scheduled payments" },
  { id: "overdue-ap", label: "Overdue AP", value: "€6k", hint: "Needs approval" },
  { id: "paid-mtd", label: "Paid MTD", value: "€41k", hint: "Settled" },
];

export const EXPENSES_DASHBOARD_TILES: DashboardTileDefinition[] = [
  { id: "spend-mtd", label: "Spend MTD", value: "$0", hint: "From expense journals" },
  { id: "pending-approval", label: "Unpaid", value: "0", hint: "Open payables" },
  { id: "travel", label: "Categories", value: "0", hint: "Ledger-linked" },
  { id: "budget-remaining", label: "Posted", value: "0", hint: "With journal links" },
];

export function buildExpensesDashboardCatalog(
  expenses: FinancialExpense[],
): DashboardTileDefinition[] {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const spendMtd = expenses
    .filter((expense) => {
      const date = expense.expenseDate || expense.dateSubmitted;
      return date.slice(0, 7) === monthPrefix;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const unpaidCount = expenses.filter((expense) => !expense.paid).length;

  const categories = new Set(
    expenses.map(
      (expense) =>
        expense.categoryAccountCode ||
        inferExpenseCategory(expense.purposeDescription),
    ),
  );

  const postedCount = expenses.filter((expense) => Boolean(expense.journalEntryId)).length;

  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  return EXPENSES_DASHBOARD_TILES.map((tile) => {
    switch (tile.id) {
      case "spend-mtd":
        return { ...tile, value: money(spendMtd) };
      case "pending-approval":
        return { ...tile, value: String(unpaidCount) };
      case "travel":
        return { ...tile, value: String(categories.size) };
      case "budget-remaining":
        return { ...tile, value: String(postedCount) };
      default:
        return tile;
    }
  });
}

export const HR_DASHBOARD_TILES: DashboardTileDefinition[] = [
  { id: "headcount", label: "Headcount", value: "47", hint: "Active employees" },
  { id: "open-roles", label: "Open roles", value: "3", hint: "Recruiting" },
  { id: "on-leave", label: "On leave", value: "4", hint: "This week" },
  { id: "reviews-due", label: "Reviews due", value: "6", hint: "Performance cycle" },
];

export const DEFAULT_CRM_TILE_LAYOUT = CRM_DASHBOARD_TILES.map((tile) => tile.id);
export const DEFAULT_CLIENTS_TILE_LAYOUT = CLIENTS_DASHBOARD_TILES.map((tile) => tile.id);
export const DEFAULT_REPRESENTATIVES_TILE_LAYOUT = REPRESENTATIVES_DASHBOARD_TILES.map((tile) => tile.id);
export const DEFAULT_PROJECTS_TILE_LAYOUT = PROJECTS_DASHBOARD_TILES.map((tile) => tile.id);
export const DEFAULT_FINANCIALS_TILE_LAYOUT = FINANCIALS_DASHBOARD_TILES.map((tile) => tile.id);
export const DEFAULT_DEBTORS_TILE_LAYOUT = DEBTORS_DASHBOARD_TILES.map((tile) => tile.id);
export const DEFAULT_CREDITORS_TILE_LAYOUT = CREDITORS_DASHBOARD_TILES.map((tile) => tile.id);
export const DEFAULT_EXPENSES_TILE_LAYOUT = EXPENSES_DASHBOARD_TILES.map((tile) => tile.id);
export const DEFAULT_HR_TILE_LAYOUT = HR_DASHBOARD_TILES.map((tile) => tile.id);

export const SOFTWARE_ASSETS_DASHBOARD_TILES: DashboardTileDefinition[] = [
  { id: "total-products", label: "Total software products", value: "0", hint: "Register size" },
  { id: "monthly-spend", label: "Monthly software spend", value: "£0", hint: "Active + trial" },
  { id: "annual-spend", label: "Annual software spend", value: "£0", hint: "Active + trial" },
  { id: "licences-purchased", label: "Licences purchased", value: "0", hint: "Total seats" },
  { id: "licences-in-use", label: "Licences in use", value: "0", hint: "Allocated" },
  { id: "renewals-30", label: "Renewals due (30 days)", value: "0", hint: "Upcoming" },
];

export function buildSoftwareAssetsDashboardCatalog(
  summary: {
    totalProducts: number;
    monthlySpend: number;
    annualSpend: number;
    licencesPurchased: number;
    licencesInUse: number;
    renewalsDueIn30Days: number;
    currency: string;
  },
  formatMoney: (amount: number, currency: string) => string,
): DashboardTileDefinition[] {
  return SOFTWARE_ASSETS_DASHBOARD_TILES.map((tile) => {
    switch (tile.id) {
      case "total-products":
        return { ...tile, value: String(summary.totalProducts) };
      case "monthly-spend":
        return { ...tile, value: formatMoney(summary.monthlySpend, summary.currency) };
      case "annual-spend":
        return { ...tile, value: formatMoney(summary.annualSpend, summary.currency) };
      case "licences-purchased":
        return { ...tile, value: String(summary.licencesPurchased) };
      case "licences-in-use":
        return { ...tile, value: String(summary.licencesInUse) };
      case "renewals-30":
        return { ...tile, value: String(summary.renewalsDueIn30Days) };
      default:
        return tile;
    }
  });
}

export const DEFAULT_SOFTWARE_ASSETS_TILE_LAYOUT = SOFTWARE_ASSETS_DASHBOARD_TILES.map(
  (tile) => tile.id,
);

