import { ACCOUNT_CODES } from "@/lib/accounting/chart-of-accounts";
import { listAccounts } from "@/lib/accounting/journal-service";
import type { TrialBalanceRow } from "@/lib/accounting/types";
import {
  resolveFinancialsWorkspaceId,
  type FinancialsWorkspaceScope,
} from "@/lib/financials-workspace";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

export async function getTrialBalance(scope?: FinancialsWorkspaceScope): Promise<{
  rows: TrialBalanceRow[];
  debitTotal: number;
  creditTotal: number;
  difference: number;
}> {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  const accounts = await listAccounts({ workspaceId });
  const supabase = requireSupabase();
  const { data: lines, error } = await supabase
    .from("journal_lines")
    .select("account_id, debit, credit, journal_entries!inner(status)")
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);

  const debitMap = new Map<string, number>();
  const creditMap = new Map<string, number>();

  for (const line of lines ?? []) {
    const status = (line as { journal_entries?: { status?: string } }).journal_entries?.status;
    if (status !== "posted") continue;
    const accountId = String((line as { account_id: string }).account_id);
    debitMap.set(
      accountId,
      roundMoney((debitMap.get(accountId) ?? 0) + (Number((line as { debit: number }).debit) || 0)),
    );
    creditMap.set(
      accountId,
      roundMoney(
        (creditMap.get(accountId) ?? 0) + (Number((line as { credit: number }).credit) || 0),
      ),
    );
  }

  let running = 0;
  const rows: TrialBalanceRow[] = accounts.map((account) => {
    const debit = debitMap.get(account.id) ?? 0;
    const credit = creditMap.get(account.id) ?? 0;
    running = roundMoney(running + debit - credit);
    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      type: account.type,
      debit,
      credit,
      runningBalance: running,
    };
  });

  const debitTotal = roundMoney(rows.reduce((sum, row) => sum + row.debit, 0));
  const creditTotal = roundMoney(rows.reduce((sum, row) => sum + row.credit, 0));

  return {
    rows,
    debitTotal,
    creditTotal,
    difference: roundMoney(debitTotal - creditTotal),
  };
}

export async function getAccountBalanceByCode(
  code: string,
  scope?: FinancialsWorkspaceScope,
) {
  const accounts = await listAccounts(scope);
  return accounts.find((account) => account.code === code)?.balance ?? 0;
}

export async function getTypeTotals(scope?: FinancialsWorkspaceScope) {
  const workspaceScope = { workspaceId: await resolveFinancialsWorkspaceId(scope) };
  const accounts = await listAccounts(workspaceScope);
  const totals = {
    assets: 0,
    liabilities: 0,
    equity: 0,
    income: 0,
    expenses: 0,
  };
  for (const account of accounts) {
    totals[`${account.type}s` as keyof typeof totals] = roundMoney(
      totals[`${account.type}s` as keyof typeof totals] + account.balance,
    );
  }
  // Fix pluralization for income/expense
  totals.income = roundMoney(
    accounts.filter((a) => a.type === "income").reduce((sum, a) => sum + a.balance, 0),
  );
  totals.expenses = roundMoney(
    accounts.filter((a) => a.type === "expense").reduce((sum, a) => sum + a.balance, 0),
  );
  totals.assets = roundMoney(
    accounts.filter((a) => a.type === "asset").reduce((sum, a) => sum + a.balance, 0),
  );
  totals.liabilities = roundMoney(
    accounts.filter((a) => a.type === "liability").reduce((sum, a) => sum + a.balance, 0),
  );
  totals.equity = roundMoney(
    accounts.filter((a) => a.type === "equity").reduce((sum, a) => sum + a.balance, 0),
  );

  return {
    ...totals,
    netProfit: roundMoney(totals.income - totals.expenses),
    cashPosition: roundMoney(
      (await getAccountBalanceByCode(ACCOUNT_CODES.wiseUsd, workspaceScope)) +
        (await getAccountBalanceByCode(ACCOUNT_CODES.wiseGbp, workspaceScope)) +
        (await getAccountBalanceByCode(ACCOUNT_CODES.wiseEur, workspaceScope)),
    ),
    accountsReceivable: await getAccountBalanceByCode(
      ACCOUNT_CODES.accountsReceivable,
      workspaceScope,
    ),
    accountsPayable: await getAccountBalanceByCode(
      ACCOUNT_CODES.accountsPayable,
      workspaceScope,
    ),
  };
}

export async function getMonthlySeriesFromPostedLines(scope?: FinancialsWorkspaceScope) {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("journal_lines")
    .select(
      "debit, credit, accounts!inner(code, type), journal_entries!inner(status, journal_date)",
    )
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);

  const months = new Map<
    string,
    { revenue: number; expenses: number; outgoings: number; cashDelta: number }
  >();

  for (const row of data ?? []) {
    const entry = (row as { journal_entries?: { status?: string; journal_date?: string } })
      .journal_entries;
    if (entry?.status !== "posted" || !entry.journal_date) continue;
    const month = entry.journal_date.slice(0, 7);
    const bucket = months.get(month) ?? {
      revenue: 0,
      expenses: 0,
      outgoings: 0,
      cashDelta: 0,
    };
    const account = (row as { accounts?: { code?: string; type?: string } }).accounts;
    const debit = Number((row as { debit: number }).debit) || 0;
    const credit = Number((row as { credit: number }).credit) || 0;

    if (account?.type === "income") {
      bucket.revenue = roundMoney(bucket.revenue + credit - debit);
    }
    if (account?.type === "expense") {
      bucket.expenses = roundMoney(bucket.expenses + debit - credit);
      bucket.outgoings = roundMoney(bucket.outgoings + debit - credit);
    }
    if (
      account?.code === ACCOUNT_CODES.wiseUsd ||
      account?.code === ACCOUNT_CODES.wiseGbp ||
      account?.code === ACCOUNT_CODES.wiseEur
    ) {
      bucket.cashDelta = roundMoney(bucket.cashDelta + debit - credit);
    }
    months.set(month, bucket);
  }

  const ordered = [...months.entries()].sort(([a], [b]) => a.localeCompare(b));
  let cashRunning = 0;
  return {
    monthlyRevenue: ordered.map(([month, value]) => ({ month, amount: value.revenue })),
    monthlyProfitLoss: ordered.map(([month, value]) => ({
      month,
      profit: Math.max(0, roundMoney(value.revenue - value.expenses)),
      loss: Math.max(0, roundMoney(value.expenses - value.revenue)),
    })),
    monthlyOutgoings: ordered.map(([month, value]) => ({ month, amount: value.outgoings })),
    cashPosition: ordered.map(([month, value]) => {
      cashRunning = roundMoney(cashRunning + value.cashDelta);
      return { month, amount: cashRunning };
    }),
  };
}
