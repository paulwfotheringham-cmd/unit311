/**
 * Burn rate analytics for Financial Overview.
 * Prefer live GL expense postings; fall back to GL-derived demo ledger when sparse.
 */

import { ACCOUNT_CODES } from "@/lib/accounting/chart-of-accounts";

export const BURN_CATEGORIES = [
  "payroll",
  "contractors",
  "software",
  "office",
  "marketing",
  "travel",
  "other",
] as const;

export type BurnCategory = (typeof BURN_CATEGORIES)[number];

export const BURN_CATEGORY_LABELS: Record<BurnCategory, string> = {
  payroll: "Payroll",
  contractors: "Contractors",
  software: "Software",
  office: "Office",
  marketing: "Marketing",
  travel: "Travel",
  other: "Other",
};

export type BurnTrendDirection = "improving" | "stable" | "increasing";

export type BurnLedgerLine = {
  id: string;
  date: string;
  month: string;
  category: BurnCategory;
  amount: number;
  vendor: string;
  department: string;
  costCentre: string;
  project: string;
  office: string;
  description: string;
};

export type BurnCategoryPoint = {
  month: string;
  total: number;
  payroll: number;
  contractors: number;
  software: number;
  office: number;
  marketing: number;
  travel: number;
  other: number;
};

export type BurnRateFilters = {
  dateFrom: string;
  dateTo: string;
  department: string;
  costCentre: string;
  project: string;
  office: string;
};

export type BurnRateSnapshot = {
  source: "live" | "demo";
  currency: string;
  monthly: number;
  quarterly: number;
  annual: number;
  previousMonthly: number;
  changePct: number;
  trend: BurnTrendDirection;
  trendLabel: string;
  cashBalance: number;
  runwayMonths: number | null;
  forecastMonthly: number;
  lines: BurnLedgerLine[];
  series: BurnCategoryPoint[];
  filterOptions: {
    departments: string[];
    costCentres: string[];
    projects: string[];
    offices: string[];
  };
};

export type BurnRatePeriod = "monthly" | "quarterly" | "annual" | "historic";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function monthKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return monthKey(new Date(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function accountCodeToBurnCategory(code: string | null | undefined): BurnCategory {
  switch (code) {
    case ACCOUNT_CODES.payroll:
      return "payroll";
    case ACCOUNT_CODES.contractors:
      return "contractors";
    case ACCOUNT_CODES.softwareSubscriptions:
      return "software";
    case ACCOUNT_CODES.office:
      return "office";
    case ACCOUNT_CODES.marketing:
      return "marketing";
    case ACCOUNT_CODES.travel:
      return "travel";
    default:
      return "other";
  }
}

function emptyCategoryPoint(month: string): BurnCategoryPoint {
  return {
    month,
    total: 0,
    payroll: 0,
    contractors: 0,
    software: 0,
    office: 0,
    marketing: 0,
    travel: 0,
    other: 0,
  };
}

export function aggregateBurnSeries(lines: BurnLedgerLine[]): BurnCategoryPoint[] {
  const map = new Map<string, BurnCategoryPoint>();
  for (const line of lines) {
    const point = map.get(line.month) ?? emptyCategoryPoint(line.month);
    point[line.category] = roundMoney(point[line.category] + line.amount);
    point.total = roundMoney(point.total + line.amount);
    map.set(line.month, point);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function filterBurnLines(
  lines: BurnLedgerLine[],
  filters: BurnRateFilters,
): BurnLedgerLine[] {
  return lines.filter((line) => {
    if (filters.dateFrom && line.date < filters.dateFrom) return false;
    if (filters.dateTo && line.date > filters.dateTo) return false;
    if (filters.department !== "all" && line.department !== filters.department) return false;
    if (filters.costCentre !== "all" && line.costCentre !== filters.costCentre) return false;
    if (filters.project !== "all" && line.project !== filters.project) return false;
    if (filters.office !== "all" && line.office !== filters.office) return false;
    return true;
  });
}

export function classifyBurnTrend(changePct: number): {
  trend: BurnTrendDirection;
  trendLabel: string;
} {
  if (changePct <= -2) {
    return { trend: "improving", trendLabel: "Lower than previous month" };
  }
  if (changePct >= 2) {
    return { trend: "increasing", trendLabel: "Higher than previous month" };
  }
  return { trend: "stable", trendLabel: "Stable vs previous month" };
}

export function computeBurnMetrics(
  series: BurnCategoryPoint[],
  cashBalance: number,
  currency = "EUR",
): Omit<BurnRateSnapshot, "lines" | "series" | "filterOptions" | "source"> {
  const currentMonth = monthKey(new Date());
  const previousMonth = shiftMonth(currentMonth, -1);

  const current =
    series.find((point) => point.month === currentMonth) ??
    series[series.length - 1] ??
    emptyCategoryPoint(currentMonth);
  const previous =
    series.find((point) => point.month === previousMonth) ??
    series[series.length - 2] ??
    emptyCategoryPoint(previousMonth);

  const monthly = current.total;
  const last3 = series.slice(-3);
  const quarterly =
    last3.length === 0
      ? monthly * 3
      : roundMoney(last3.reduce((sum, point) => sum + point.total, 0));
  const yearPrefix = currentMonth.slice(0, 4);
  const yearPoints = series.filter((point) => point.month.startsWith(yearPrefix));
  const annual =
    yearPoints.length === 0
      ? monthly * 12
      : roundMoney(yearPoints.reduce((sum, point) => sum + point.total, 0));

  const previousMonthly = previous.total;
  const changePct =
    previousMonthly <= 0
      ? 0
      : Math.round(((monthly - previousMonthly) / previousMonthly) * 1000) / 10;
  const { trend, trendLabel } = classifyBurnTrend(changePct);

  const recentAvg =
    series.slice(-3).reduce((sum, point) => sum + point.total, 0) /
    Math.max(1, Math.min(3, series.length));
  const forecastMonthly = roundMoney(recentAvg * (1 + changePct / 200));
  const runwayMonths =
    monthly > 0 && cashBalance > 0 ? Math.round((cashBalance / monthly) * 10) / 10 : null;

  return {
    currency,
    monthly: roundMoney(monthly),
    quarterly: roundMoney(quarterly),
    annual: roundMoney(annual),
    previousMonthly: roundMoney(previousMonthly),
    changePct,
    trend,
    trendLabel,
    cashBalance: roundMoney(cashBalance),
    runwayMonths,
    forecastMonthly,
  };
}

const DEMO_DEPARTMENTS = ["Engineering", "Operations", "Commercial", "Finance", "Executive"];
const DEMO_COST_CENTRES = ["CC-100 Ops", "CC-200 Eng", "CC-300 G&A", "CC-400 Sales"];
const DEMO_PROJECTS = ["Platform Core", "Client Delivery", "Internal Ops", "Growth"];
const DEMO_OFFICES = ["Barcelona", "Porto", "Oxford", "Remote"];
const DEMO_VENDORS: Record<BurnCategory, string[]> = {
  payroll: ["Payroll Provider", "Unit311 Payroll"],
  contractors: ["Northwind Contractors", "BlueSky Consulting", "Apex Field Ops"],
  software: ["Cursor", "Vercel", "Supabase", "OpenAI", "Google Workspace"],
  office: ["WeWork Barcelona", "Office Supplies Co", "Utilities ES"],
  marketing: ["LinkedIn Ads", "Meta Ads", "Agency Collective"],
  travel: ["BA Corporate", "Booking.com", "Uber Business"],
  other: ["Legal Partners", "Accounting Desk", "Insurance Hub", "Misc Vendor"],
};

/** Deterministic pseudo-random 0..1 from string seed. */
function hash01(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

function categoryWeights(seed: string): Record<BurnCategory, number> {
  const raw = {
    payroll: 0.38 + hash01(`${seed}-payroll`) * 0.06,
    contractors: 0.14 + hash01(`${seed}-contractors`) * 0.04,
    software: 0.12 + hash01(`${seed}-software`) * 0.03,
    office: 0.08 + hash01(`${seed}-office`) * 0.03,
    marketing: 0.1 + hash01(`${seed}-marketing`) * 0.04,
    travel: 0.07 + hash01(`${seed}-travel`) * 0.03,
    other: 0.08 + hash01(`${seed}-other`) * 0.03,
  };
  const sum = BURN_CATEGORIES.reduce((total, key) => total + raw[key], 0);
  return Object.fromEntries(
    BURN_CATEGORIES.map((key) => [key, raw[key] / sum]),
  ) as Record<BurnCategory, number>;
}

/**
 * Build a realistic multi-month burn ledger.
 * `baseMonthly` anchors magnitude from live GL when available.
 */
export function buildDemoBurnLedger(input: {
  baseMonthly: number;
  monthCount?: number;
}): BurnLedgerLine[] {
  const monthCount = input.monthCount ?? 18;
  const base =
    input.baseMonthly > 0
      ? input.baseMonthly
      : 28_000 + Math.round(hash01("unit311-burn-base") * 22_000);
  const lines: BurnLedgerLine[] = [];
  const now = new Date();
  now.setDate(1);

  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = monthKey(date);
    const seasonal = 1 + Math.sin((date.getMonth() + 1) / 12) * 0.08;
    const drift = 1 - (monthCount - 1 - i) * 0.004 + hash01(`${month}-drift`) * 0.05;
    const monthTotal = roundMoney(base * seasonal * drift);
    const weights = categoryWeights(month);

    for (const category of BURN_CATEGORIES) {
      const categoryTotal = roundMoney(monthTotal * weights[category]);
      const sliceCount =
        category === "payroll" ? 1 : 2 + Math.floor(hash01(`${month}-${category}`) * 2);
      let remaining = categoryTotal;
      for (let slice = 0; slice < sliceCount; slice += 1) {
        const isLast = slice === sliceCount - 1;
        const amount = isLast
          ? remaining
          : roundMoney(categoryTotal * (0.35 + hash01(`${month}-${category}-${slice}`) * 0.3));
        remaining = roundMoney(remaining - amount);
        if (amount <= 0) continue;
        const day = 3 + Math.floor(hash01(`${month}-${category}-day-${slice}`) * 24);
        const vendors = DEMO_VENDORS[category];
        const vendor = vendors[Math.floor(hash01(`${month}-${category}-v-${slice}`) * vendors.length)]!;
        lines.push({
          id: `burn-${month}-${category}-${slice}`,
          date: `${month}-${pad(Math.min(day, 28))}`,
          month,
          category,
          amount,
          vendor,
          department:
            DEMO_DEPARTMENTS[
              Math.floor(hash01(`${month}-${category}-d-${slice}`) * DEMO_DEPARTMENTS.length)
            ]!,
          costCentre:
            DEMO_COST_CENTRES[
              Math.floor(hash01(`${month}-${category}-c-${slice}`) * DEMO_COST_CENTRES.length)
            ]!,
          project:
            DEMO_PROJECTS[
              Math.floor(hash01(`${month}-${category}-p-${slice}`) * DEMO_PROJECTS.length)
            ]!,
          office:
            DEMO_OFFICES[
              Math.floor(hash01(`${month}-${category}-o-${slice}`) * DEMO_OFFICES.length)
            ]!,
          description: `${BURN_CATEGORY_LABELS[category]} · ${vendor}`,
        });
      }
    }
  }

  return lines;
}

export type PostedExpenseLineInput = {
  id: string;
  journalDate: string;
  accountCode: string;
  amount: number;
  description?: string | null;
};

/** Map posted GL expense lines into burn ledger rows (with demo dimensions for filtering). */
export function mapPostedExpensesToBurnLines(
  posted: PostedExpenseLineInput[],
): BurnLedgerLine[] {
  return posted
    .filter((row) => row.amount > 0 && row.journalDate)
    .map((row, index) => {
      const month = row.journalDate.slice(0, 7);
      const category = accountCodeToBurnCategory(row.accountCode);
      const vendors = DEMO_VENDORS[category];
      return {
        id: row.id || `live-${month}-${index}`,
        date: row.journalDate.slice(0, 10),
        month,
        category,
        amount: roundMoney(row.amount),
        vendor: vendors[index % vendors.length]!,
        department: DEMO_DEPARTMENTS[index % DEMO_DEPARTMENTS.length]!,
        costCentre: DEMO_COST_CENTRES[index % DEMO_COST_CENTRES.length]!,
        project: DEMO_PROJECTS[index % DEMO_PROJECTS.length]!,
        office: DEMO_OFFICES[index % DEMO_OFFICES.length]!,
        description: row.description?.trim() || `${BURN_CATEGORY_LABELS[category]} posting`,
      };
    });
}

export function buildBurnRateSnapshot(input: {
  cashBalance: number;
  monthlyOutgoings: Array<{ month: string; amount: number }>;
  postedExpenses?: PostedExpenseLineInput[];
  currency?: string;
}): BurnRateSnapshot {
  const currency = input.currency ?? "EUR";
  const livePosted = input.postedExpenses ?? [];
  let lines = mapPostedExpensesToBurnLines(livePosted);
  let source: "live" | "demo" = lines.length >= 8 ? "live" : "demo";

  if (source === "demo") {
    const latestLive =
      [...input.monthlyOutgoings].sort((a, b) => b.month.localeCompare(a.month))[0]?.amount ?? 0;
    const avgLive =
      input.monthlyOutgoings.length === 0
        ? 0
        : input.monthlyOutgoings.reduce((sum, point) => sum + point.amount, 0) /
          input.monthlyOutgoings.length;
    lines = buildDemoBurnLedger({
      baseMonthly: latestLive > 0 ? latestLive : avgLive,
    });
  }

  const series = aggregateBurnSeries(lines);
  const metrics = computeBurnMetrics(series, input.cashBalance, currency);

  return {
    ...metrics,
    source,
    lines,
    series,
    filterOptions: {
      departments: [...new Set(lines.map((line) => line.department))].sort(),
      costCentres: [...new Set(lines.map((line) => line.costCentre))].sort(),
      projects: [...new Set(lines.map((line) => line.project))].sort(),
      offices: [...new Set(lines.map((line) => line.office))].sort(),
    },
  };
}

export function rollupBurnSeries(
  series: BurnCategoryPoint[],
  period: BurnRatePeriod,
): Array<{ period: string; total: number } & Partial<Record<BurnCategory, number>>> {
  if (period === "monthly" || period === "historic") {
    return series.map((point) => ({
      period: point.month,
      total: point.total,
      payroll: point.payroll,
      contractors: point.contractors,
      software: point.software,
      office: point.office,
      marketing: point.marketing,
      travel: point.travel,
      other: point.other,
    }));
  }

  if (period === "quarterly") {
    const quarters = new Map<string, BurnCategoryPoint>();
    for (const point of series) {
      const [year, month] = point.month.split("-").map(Number);
      const q = Math.ceil(month / 3);
      const key = `${year}-Q${q}`;
      const bucket = quarters.get(key) ?? emptyCategoryPoint(key);
      for (const category of BURN_CATEGORIES) {
        bucket[category] = roundMoney(bucket[category] + point[category]);
      }
      bucket.total = roundMoney(bucket.total + point.total);
      quarters.set(key, bucket);
    }
    return [...quarters.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, point]) => ({
        period: periodKey,
        total: point.total,
        payroll: point.payroll,
        contractors: point.contractors,
        software: point.software,
        office: point.office,
        marketing: point.marketing,
        travel: point.travel,
        other: point.other,
      }));
  }

  const years = new Map<string, BurnCategoryPoint>();
  for (const point of series) {
    const year = point.month.slice(0, 4);
    const bucket = years.get(year) ?? emptyCategoryPoint(year);
    for (const category of BURN_CATEGORIES) {
      bucket[category] = roundMoney(bucket[category] + point[category]);
    }
    bucket.total = roundMoney(bucket.total + point.total);
    years.set(year, bucket);
  }
  return [...years.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKey, point]) => ({
      period: periodKey,
      total: point.total,
      payroll: point.payroll,
      contractors: point.contractors,
      software: point.software,
      office: point.office,
      marketing: point.marketing,
      travel: point.travel,
      other: point.other,
    }));
}

export function summarizeBurnDrilldown(lines: BurnLedgerLine[], cashBalance: number) {
  const byCategory = BURN_CATEGORIES.map((category) => ({
    category,
    label: BURN_CATEGORY_LABELS[category],
    amount: roundMoney(
      lines.filter((line) => line.category === category).reduce((sum, line) => sum + line.amount, 0),
    ),
  })).sort((a, b) => b.amount - a.amount);

  const total = roundMoney(byCategory.reduce((sum, row) => sum + row.amount, 0));
  const payroll = byCategory.find((row) => row.category === "payroll")?.amount ?? 0;
  const topExpenses = [...lines].sort((a, b) => b.amount - a.amount).slice(0, 10);

  const costCentres = new Map<string, number>();
  const vendors = new Map<string, number>();
  for (const line of lines) {
    costCentres.set(
      line.costCentre,
      roundMoney((costCentres.get(line.costCentre) ?? 0) + line.amount),
    );
    vendors.set(line.vendor, roundMoney((vendors.get(line.vendor) ?? 0) + line.amount));
  }

  const series = aggregateBurnSeries(lines);
  const metrics = computeBurnMetrics(series, cashBalance);

  return {
    byCategory,
    total,
    topExpenses,
    monthlyTrend: rollupBurnSeries(series, "monthly"),
    quarterlyTrend: rollupBurnSeries(series, "quarterly"),
    yearlyTrend: rollupBurnSeries(series, "annual"),
    forecastBurn: metrics.forecastMonthly,
    runwayMonths: metrics.runwayMonths,
    largestCostCentres: [...costCentres.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
    largestVendors: [...vendors.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
    payrollPct: total > 0 ? Math.round((payroll / total) * 1000) / 10 : 0,
    nonPayrollPct: total > 0 ? Math.round(((total - payroll) / total) * 1000) / 10 : 0,
  };
}

export function defaultBurnFilters(lines: BurnLedgerLine[]): BurnRateFilters {
  const dates = lines.map((line) => line.date).sort();
  return {
    dateFrom: dates[0] ?? "",
    dateTo: dates[dates.length - 1] ?? "",
    department: "all",
    costCentre: "all",
    project: "all",
    office: "all",
  };
}

export function formatBurnMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
