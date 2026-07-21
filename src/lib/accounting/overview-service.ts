import { listFinancialActivity } from "@/lib/accounting/activity";
import {
  getMonthlySeriesFromPostedLines,
  getPostedExpenseLines,
  getTypeTotals,
} from "@/lib/accounting/balances";
import { buildBurnRateSnapshot } from "@/lib/accounting/burn-rate";
import { listInvoices } from "@/lib/accounting/invoices-service";
import type { FinancialOverviewSnapshot } from "@/lib/accounting/types";
import {
  resolveFinancialsWorkspaceId,
  type FinancialsWorkspaceScope,
} from "@/lib/financials-workspace";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function emptyBurnRate(cashBalance = 0): FinancialOverviewSnapshot["burnRate"] {
  return {
    source: "live",
    currency: "EUR",
    monthly: 0,
    quarterly: 0,
    annual: 0,
    previousMonthly: 0,
    changePct: 0,
    trend: "stable",
    trendLabel: "—",
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

function emptyOverview(): FinancialOverviewSnapshot {
  return {
    revenueYtd: 0,
    cashPosition: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    netProfit: 0,
    outstandingInvoices: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    annualRevenue: 0,
    annualExpenses: 0,
    burnRate: emptyBurnRate(0),
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

export async function getFinancialOverview(
  scope?: FinancialsWorkspaceScope,
): Promise<FinancialOverviewSnapshot> {
  if (!isSupabaseConfigured()) return emptyOverview();

  try {
    const workspaceId = await resolveFinancialsWorkspaceId(scope);
    const workspaceScope: FinancialsWorkspaceScope = { workspaceId };

    const [totals, charts, invoices, activity, postedExpenses] = await Promise.all([
      getTypeTotals(workspaceScope),
      getMonthlySeriesFromPostedLines(workspaceScope),
      listInvoices(workspaceScope),
      listFinancialActivity(25, workspaceScope),
      getPostedExpenseLines(workspaceScope),
    ]);

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

    const supabase = createSupabaseServerClient();
    const { data: expenses } = await supabase
      .from("financial_expenses")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("paid", false)
      .order("date_submitted", { ascending: false })
      .limit(20);

    const unpaidExpenses = expenses ?? [];
    const monthEnd = `${monthPrefix}-31`;
    const apDueThisMonth = unpaidExpenses.filter((expense) => {
      const date = String(expense.expense_date ?? expense.date_submitted ?? "");
      return date >= `${monthPrefix}-01` && date <= monthEnd;
    });
    const apOverdue = unpaidExpenses.filter((expense) => {
      const date = String(expense.expense_date ?? expense.date_submitted ?? "");
      return date < todayIso;
    });

    const yearPrefix = todayIso.slice(0, 4);
    const monthlyRevenuePoint = charts.monthlyRevenue.find((point) => point.month === monthPrefix);
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
            cashBalance: totals.cashPosition,
            monthlyOutgoings: charts.monthlyOutgoings,
            postedExpenses,
            currency: "EUR",
            allowDemo: false,
          })
        : emptyBurnRate(totals.cashPosition);

    const payrollPoint =
      burnRate.series.find((point) => point.month === monthPrefix) ??
      burnRate.series[burnRate.series.length - 1];
    const payrollMonthly = payrollPoint?.payroll ?? 0;
    const payrollTrend = burnRate.series.slice(-6).map((point) => ({
      month: point.month,
      amount: point.payroll,
    }));

    return {
      revenueYtd: totals.income,
      cashPosition: totals.cashPosition,
      accountsReceivable: totals.accountsReceivable,
      accountsPayable: totals.accountsPayable,
      netProfit: totals.netProfit,
      outstandingInvoices: unpaid.length,
      monthlyRevenue: monthlyRevenuePoint?.amount ?? 0,
      monthlyExpenses: monthlyExpensePoint?.amount ?? 0,
      annualRevenue,
      annualExpenses,
      burnRate,
      ar: {
        outstanding: unpaid.reduce((sum, invoice) => sum + invoice.amount, 0),
        overdue: overdue.reduce((sum, invoice) => sum + invoice.amount, 0),
        dueSoon: dueSoon.reduce((sum, invoice) => sum + invoice.amount, 0),
        collectionRate,
        ageing,
        recentUnpaid: unpaid.slice(0, 8),
      },
      ap: {
        outstanding: unpaidExpenses.reduce(
          (sum, expense) => sum + (Number(expense.amount) || 0),
          0,
        ),
        dueThisMonth: apDueThisMonth.reduce(
          (sum, expense) => sum + (Number(expense.amount) || 0),
          0,
        ),
        overdue: apOverdue.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
        upcoming: unpaidExpenses
          .filter((expense) => String(expense.expense_date ?? expense.date_submitted) >= todayIso)
          .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
        recent: unpaidExpenses.slice(0, 8).map((expense) => ({
          id: String(expense.id),
          supplier: String(expense.supplier ?? expense.submitter_name ?? "Supplier"),
          description: String(expense.purpose_description ?? ""),
          amount: Number(expense.amount) || 0,
          currency: String(expense.currency ?? "USD"),
          dueDate: String(expense.expense_date ?? expense.date_submitted),
          paid: Boolean(expense.paid),
        })),
      },
      payroll: {
        current: payrollMonthly,
        next: payrollMonthly,
        employees: 0,
        annual: roundMoney(payrollMonthly * 12),
        monthly: payrollMonthly,
        trend: payrollTrend,
      },
      charts,
      activity,
    };
  } catch {
    return emptyOverview();
  }
}
