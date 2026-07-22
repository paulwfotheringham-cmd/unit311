import { listFinancialActivity } from "@/lib/accounting/activity";
import {
  getMonthlySeriesFromPostedLines,
  getPostedExpenseLines,
  getTypeTotals,
} from "@/lib/accounting/balances";
import { buildBurnRateSnapshot } from "@/lib/accounting/burn-rate";
import { getOperatingObligations } from "@/lib/accounting/operating-obligations";
import { listInvoices } from "@/lib/accounting/invoices-service";
import type { FinancialOverviewSnapshot } from "@/lib/accounting/types";
import { listExpenses } from "@/lib/financial-expenses-service";
import {
  resolveFinancialsWorkspaceId,
  type FinancialsWorkspaceScope,
} from "@/lib/financials-workspace";
import { calculateLivePayrollSnapshot } from "@/lib/payroll/payroll-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { convertToGbp } from "@/lib/treasury/treasury-utils";
import { getWiseConnectionStatus, listWiseBalances } from "@/lib/wise-service";

/** Platform reporting currency — matches Wise Bank treasury totals. */
export const FINANCIAL_REPORTING_CURRENCY = "GBP";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function emptyBurnRate(cashBalance = 0): FinancialOverviewSnapshot["burnRate"] {
  return {
    source: "live",
    currency: FINANCIAL_REPORTING_CURRENCY,
    monthly: 0,
    quarterly: 0,
    annual: 0,
    previousMonthly: 0,
    changePct: 0,
    trend: "stable",
    trendLabel: "No change",
    cashBalance,
    runwayMonths: null,
    forecastMonthly: 0,
    lines: [],
    series: [],
    filterOptions: {
      departments: [],
      costCentres: [],
      projects: [],
      offices: [],
    },
  };
}

/**
 * Live Wise treasury total in GBP — same calculation as Finance → Bank
 * (`computeTreasurySummary.totalTreasuryValueGbp`). Falls back to GL Wise
 * cash accounts when Wise is unavailable.
 */
export async function resolveTreasuryCash(glWiseCash = 0): Promise<number> {
  try {
    const status = await getWiseConnectionStatus();
    if (!status.configured || !status.connected) {
      return roundMoney(glWiseCash);
    }
    const balances = await listWiseBalances(status.profileId ?? undefined);
    if (balances.length === 0) return roundMoney(glWiseCash);
    return roundMoney(
      balances.reduce(
        (sum, balance) => sum + convertToGbp(Number(balance.amount) || 0, balance.currency),
        0,
      ),
    );
  } catch {
    return roundMoney(glWiseCash);
  }
}

function emptyOverview(cashPosition = 0): FinancialOverviewSnapshot {
  return {
    revenueYtd: 0,
    cashPosition,
    accountsReceivable: 0,
    accountsPayable: 0,
    netProfit: 0,
    outstandingInvoices: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    annualRevenue: 0,
    annualExpenses: 0,
    burnRate: emptyBurnRate(cashPosition),
    ar: {
      outstanding: 0,
      overdue: 0,
      dueSoon: 0,
      collectionRate: 0,
      ageing: [
        { bucket: "Current", amount: 0 },
        { bucket: "1–30", amount: 0 },
        { bucket: "31–60", amount: 0 },
        { bucket: "61–90", amount: 0 },
        { bucket: "90+", amount: 0 },
      ],
      recentUnpaid: [],
    },
    ap: {
      outstanding: 0,
      dueThisMonth: 0,
      overdue: 0,
      upcoming: 0,
      recent: [],
    },
    payroll: {
      current: 0,
      next: 0,
      employees: 0,
      annual: 0,
      monthly: 0,
      trend: [],
    },
    charts: {
      monthlyRevenue: [],
      monthlyProfitLoss: [],
      monthlyOutgoings: [],
      cashPosition: [],
    },
    activity: [],
  };
}

/**
 * Single financial source of truth for Home, Financial Overview, GL KPIs,
 * AR, AP, and Wise cash. Always returns numeric values (never null / —).
 */
export async function getFinancialOverview(
  scope?: FinancialsWorkspaceScope,
): Promise<FinancialOverviewSnapshot> {
  if (!isSupabaseConfigured()) {
    // Wise cash still loads without Supabase — same as Finance → Bank.
    return emptyOverview(await resolveTreasuryCash(0));
  }

  try {
    const workspaceId = await resolveFinancialsWorkspaceId(scope);
    const workspaceScope: FinancialsWorkspaceScope = { workspaceId };

    const [
      totalsResult,
      chartsResult,
      invoicesResult,
      activityResult,
      postedExpensesResult,
      expensesResult,
      obligationsResult,
      payrollLiveResult,
    ] = await Promise.all([
      getTypeTotals(workspaceScope).then(
        (value) => ({ ok: true as const, value }),
        () => ({ ok: false as const }),
      ),
      getMonthlySeriesFromPostedLines(workspaceScope).then(
        (value) => ({ ok: true as const, value }),
        () => ({ ok: false as const }),
      ),
      listInvoices(workspaceScope).then(
        (value) => ({ ok: true as const, value }),
        () => ({ ok: false as const }),
      ),
      listFinancialActivity(25, workspaceScope).then(
        (value) => ({ ok: true as const, value }),
        () => ({ ok: false as const }),
      ),
      getPostedExpenseLines(workspaceScope).then(
        (value) => ({ ok: true as const, value }),
        () => ({ ok: false as const }),
      ),
      // Same service as Accounts Payable (`/api/financials/expenses`).
      listExpenses({ workspaceId }).then(
        (value) => ({ ok: true as const, value }),
        () => ({ ok: false as const }),
      ),
      getOperatingObligations(workspaceScope).then(
        (value) => ({ ok: true as const, value }),
        () => ({ ok: false as const }),
      ),
      calculateLivePayrollSnapshot({ workspaceId }).then(
        (value) => ({ ok: true as const, value }),
        () => ({ ok: false as const }),
      ),
    ]);

    const totals = totalsResult.ok
      ? totalsResult.value
      : {
          income: 0,
          expenses: 0,
          assets: 0,
          liabilities: 0,
          equity: 0,
          netProfit: 0,
          cashPosition: 0,
          accountsReceivable: 0,
          accountsPayable: 0,
        };
    const charts = chartsResult.ok
      ? chartsResult.value
      : {
          monthlyRevenue: [],
          monthlyProfitLoss: [],
          monthlyOutgoings: [],
          cashPosition: [],
        };
    const invoices = invoicesResult.ok ? invoicesResult.value : [];
    const activity = activityResult.ok ? activityResult.value : [];
    const postedExpenses = postedExpensesResult.ok ? postedExpensesResult.value : [];
    const allExpenses = expensesResult.ok ? expensesResult.value : [];

    // Resolve after GL so we can fall back to Wise GL accounts if Wise API is down.
    const cashPosition = await resolveTreasuryCash(totals.cashPosition);

    if (
      !totalsResult.ok &&
      !chartsResult.ok &&
      !invoicesResult.ok &&
      !expensesResult.ok
    ) {
      return emptyOverview(cashPosition);
    }

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const monthPrefix = todayIso.slice(0, 7);
    const unpaid = invoices.filter(
      (invoice) => invoice.status === "issued" || invoice.status === "overdue",
    );
    const overdue = unpaid.filter((invoice) => invoice.dueDate < todayIso);
    const dueSoon = unpaid.filter((invoice) => {
      const due = new Date(`${invoice.dueDate}T00:00:00.000Z`);
      const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 14;
    });
    const paidCount = invoices.filter((invoice) => invoice.status === "paid").length;
    const collectionRate =
      invoices.length === 0 ? 0 : roundMoney((paidCount / invoices.length) * 100);

    const ageing = [
      { bucket: "Current", amount: 0 },
      { bucket: "1–30", amount: 0 },
      { bucket: "31–60", amount: 0 },
      { bucket: "61–90", amount: 0 },
      { bucket: "90+", amount: 0 },
    ];
    for (const invoice of unpaid) {
      const due = new Date(`${invoice.dueDate}T00:00:00.000Z`);
      const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) ageing[0].amount = roundMoney(ageing[0].amount + invoice.amount);
      else if (days <= 30) ageing[1].amount = roundMoney(ageing[1].amount + invoice.amount);
      else if (days <= 60) ageing[2].amount = roundMoney(ageing[2].amount + invoice.amount);
      else if (days <= 90) ageing[3].amount = roundMoney(ageing[3].amount + invoice.amount);
      else ageing[4].amount = roundMoney(ageing[4].amount + invoice.amount);
    }

    const unpaidExpenses = allExpenses.filter((expense) => !expense.paid);
    const monthEnd = `${monthPrefix}-31`;
    const apDueThisMonth = unpaidExpenses.filter((expense) => {
      const date = String(expense.expenseDate ?? expense.dateSubmitted ?? "");
      return date >= `${monthPrefix}-01` && date <= monthEnd;
    });
    const apOverdue = unpaidExpenses.filter((expense) => {
      const date = String(expense.expenseDate ?? expense.dateSubmitted ?? "");
      return date < todayIso;
    });

    const yearPrefix = todayIso.slice(0, 4);
    const monthlyExpensePoint = charts.monthlyOutgoings.find((point) => point.month === monthPrefix);
    const annualRevenue = roundMoney(
      charts.monthlyRevenue
        .filter((point) => point.month.startsWith(yearPrefix))
        .reduce((sum, point) => sum + point.amount, 0),
    );
    const annualExpenses = roundMoney(
      charts.monthlyOutgoings
        .filter((point) => point.month.startsWith(yearPrefix))
        .reduce((sum, point) => sum + point.amount, 0),
    );

    const burnRate =
      postedExpenses.length > 0 || charts.monthlyOutgoings.some((point) => point.amount > 0)
        ? buildBurnRateSnapshot({
            cashBalance: cashPosition,
            monthlyOutgoings: charts.monthlyOutgoings,
            postedExpenses,
            currency: FINANCIAL_REPORTING_CURRENCY,
            allowDemo: false,
          })
        : emptyBurnRate(cashPosition);

    const obligations = obligationsResult.ok
      ? obligationsResult.value
      : {
          payroll: {
            monthly: 0,
            annual: 0,
            employees: 0,
            nextPayrollDate: todayIso,
            liability: 0,
            currency: FINANCIAL_REPORTING_CURRENCY,
          },
          software: {
            monthly: 0,
            annual: 0,
            count: 0,
            currency: FINANCIAL_REPORTING_CURRENCY,
            lines: [],
            upcoming: [],
          },
          monthlyRecurring: 0,
        };

    const payrollLive = payrollLiveResult.ok ? payrollLiveResult.value : null;
    const toReporting = (amount: number, currency: string) =>
      currency.toUpperCase() === "GBP" ? roundMoney(amount) : convertToGbp(amount, currency);

    const glRevenue = totals.income;
    const glSpend = totals.expenses;
    const netProfit = roundMoney(glRevenue - glSpend);

    const payrollPoint =
      burnRate.series.find((point) => point.month === monthPrefix) ??
      burnRate.series[burnRate.series.length - 1];
    const glPayrollMonthly = payrollPoint?.payroll ?? 0;
    const glSoftwareMonthly = payrollPoint?.software ?? 0;

    // Payroll engine (HR salaries + tax settings) is the SSOT when employees exist.
    const payrollMonthly =
      payrollLive && payrollLive.employeeCount > 0
        ? toReporting(payrollLive.monthlyGross, payrollLive.currency)
        : obligations.payroll.employees > 0
          ? toReporting(obligations.payroll.monthly, obligations.payroll.currency)
          : glPayrollMonthly;
    const payrollLiability =
      payrollLive && payrollLive.employeeCount > 0
        ? toReporting(
            payrollLive.net + payrollLive.employeeTax + payrollLive.employerTax,
            payrollLive.currency,
          )
        : obligations.payroll.employees > 0
          ? toReporting(obligations.payroll.liability, obligations.payroll.currency)
          : 0;
    const payrollEmployees =
      payrollLive?.employeeCount || obligations.payroll.employees || 0;
    const payrollNextDate =
      payrollLive?.nextPayrollDate || obligations.payroll.nextPayrollDate || todayIso;
    const softwareMonthly =
      obligations.software.count > 0 ? obligations.software.monthly : glSoftwareMonthly;

    const glBurnBase =
      burnRate.lines.length > 0 ? burnRate.monthly : (monthlyExpensePoint?.amount ?? 0);
    // Replace overlapping GL payroll/software categories with live register totals (no double count).
    const monthlyBurn = roundMoney(
      Math.max(0, glBurnBase - glPayrollMonthly - glSoftwareMonthly) +
        payrollMonthly +
        softwareMonthly,
    );
    const forecastMonthly = roundMoney(
      burnRate.lines.length > 0
        ? Math.max(0, burnRate.forecastMonthly - glPayrollMonthly - glSoftwareMonthly) +
            payrollMonthly +
            softwareMonthly
        : monthlyBurn,
    );

    const payrollTrend =
      burnRate.series.length > 0
        ? burnRate.series.slice(-6).map((point) => ({
            month: point.month,
            amount: payrollEmployees > 0 ? payrollMonthly : point.payroll,
          }))
        : [
            {
              month: monthPrefix,
              amount: payrollMonthly,
            },
          ];

    // Debtors / Creditors from the same AR / AP modules (invoices + expenses).
    const arOutstanding = roundMoney(
      unpaid.reduce((sum, invoice) => sum + invoice.amount, 0),
    );
    const softwareApUpcoming = roundMoney(
      obligations.software.upcoming.reduce((sum, line) => sum + line.monthlyCost, 0),
    );
    const apOutstanding = roundMoney(
      unpaidExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0) +
        softwareApUpcoming +
        (payrollEmployees > 0 ? payrollLiability : 0),
    );

    const softwareApRecent = obligations.software.upcoming.slice(0, 6).map((line) => ({
      id: `software-${line.id}`,
      supplier: line.vendor,
      description: `${line.name} licence (${line.frequency})`,
      amount: line.monthlyCost,
      currency: line.currency,
      dueDate: line.nextPaymentDate,
      paid: false,
    }));

    const payrollApRecent =
      payrollEmployees > 0
        ? [
            {
              id: "payroll-next",
              supplier: "Payroll",
              description: `Monthly payroll · ${payrollEmployees} employees`,
              amount: payrollLiability,
              currency: FINANCIAL_REPORTING_CURRENCY,
              dueDate: payrollNextDate,
              paid: false,
            },
            ...(payrollLive && payrollLive.employerTax > 0
              ? [
                  {
                    id: "payroll-employer-tax",
                    supplier: "Employer payroll tax",
                    description: "Estimated employer payroll tax",
                    amount: toReporting(payrollLive.employerTax, payrollLive.currency),
                    currency: FINANCIAL_REPORTING_CURRENCY,
                    dueDate: payrollNextDate,
                    paid: false,
                  },
                ]
              : []),
          ]
        : [];

    return {
      revenueYtd: glRevenue,
      cashPosition,
      accountsReceivable: arOutstanding,
      accountsPayable: apOutstanding,
      netProfit,
      outstandingInvoices: unpaid.length,
      monthlyRevenue: glRevenue,
      monthlyExpenses: roundMoney(glSpend + softwareMonthly + Math.max(0, payrollMonthly - glPayrollMonthly)),
      annualRevenue,
      annualExpenses: roundMoney(annualExpenses + softwareMonthly * 12),
      burnRate: {
        ...burnRate,
        monthly: roundMoney(monthlyBurn),
        quarterly: roundMoney(monthlyBurn * 3),
        annual: roundMoney(monthlyBurn * 12),
        forecastMonthly: roundMoney(forecastMonthly),
        cashBalance: cashPosition,
        currency: FINANCIAL_REPORTING_CURRENCY,
        trendLabel: burnRate.lines.length > 0 ? burnRate.trendLabel : "Operating registers",
        runwayMonths:
          cashPosition > 0 && monthlyBurn > 0
            ? Math.round((cashPosition / monthlyBurn) * 10) / 10
            : burnRate.runwayMonths,
      },
      ar: {
        outstanding: arOutstanding,
        overdue: roundMoney(overdue.reduce((sum, invoice) => sum + invoice.amount, 0)),
        dueSoon: roundMoney(dueSoon.reduce((sum, invoice) => sum + invoice.amount, 0)),
        collectionRate,
        ageing,
        recentUnpaid: unpaid.slice(0, 8),
      },
      ap: {
        outstanding: apOutstanding,
        dueThisMonth: roundMoney(
          apDueThisMonth.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0) +
            softwareApUpcoming +
            (payrollEmployees > 0 ? payrollLiability : 0),
        ),
        overdue: roundMoney(
          apOverdue.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
        ),
        upcoming: roundMoney(
          unpaidExpenses
            .filter(
              (expense) =>
                String(expense.expenseDate ?? expense.dateSubmitted) >= todayIso,
            )
            .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0) +
            softwareApUpcoming +
            (payrollEmployees > 0 ? payrollLiability : 0),
        ),
        recent: [...payrollApRecent, ...softwareApRecent, ...unpaidExpenses.slice(0, 8).map((expense) => ({
          id: String(expense.id),
          supplier: String(expense.supplier ?? expense.submitterName ?? "Supplier"),
          description: String(expense.purposeDescription ?? ""),
          amount: Number(expense.amount) || 0,
          currency: String(expense.currency ?? FINANCIAL_REPORTING_CURRENCY),
          dueDate: String(expense.expenseDate ?? expense.dateSubmitted),
          paid: Boolean(expense.paid),
        }))].slice(0, 12),
      },
      payroll: {
        current: payrollMonthly,
        next: payrollMonthly,
        employees: payrollEmployees,
        annual: roundMoney(payrollMonthly * 12),
        monthly: payrollMonthly,
        trend: payrollTrend,
      },
      charts,
      activity,
    };
  } catch {
    // Even when the ledger path blows up, surface live Wise treasury cash.
    return emptyOverview(await resolveTreasuryCash(0));
  }
}
