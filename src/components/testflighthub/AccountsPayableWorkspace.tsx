"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Receipt } from "lucide-react";

import { formatMoney } from "@/lib/accounting/chart-of-accounts";
import { cn } from "@/lib/utils";

type PayableRow = {
  id: string;
  supplier: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  paid: boolean;
  journalEntryId: string | null;
  paymentJournalEntryId: string | null;
  reference: string | null;
};

export default function AccountsPayableWorkspace() {
  const [rows, setRows] = useState<PayableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/financials/expenses", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load payables");
      const expenses = (data.expenses ?? []) as Array<Record<string, unknown>>;
      setRows(
        expenses.map((expense) => ({
          id: String(expense.id),
          supplier: String(expense.supplier ?? expense.submitterName ?? "Supplier"),
          description: String(expense.purposeDescription ?? ""),
          amount: Number(expense.amount) || 0,
          currency: String(expense.currency ?? "USD"),
          expenseDate: String(expense.expenseDate ?? expense.dateSubmitted ?? ""),
          paid: Boolean(expense.paid),
          journalEntryId: expense.journalEntryId ? String(expense.journalEntryId) : null,
          paymentJournalEntryId: expense.paymentJournalEntryId
            ? String(expense.paymentJournalEntryId)
            : null,
          reference: expense.reference ? String(expense.reference) : null,
        })),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const monthPrefix = todayIso.slice(0, 7);

  const kpis = useMemo(() => {
    if (rows.length === 0) {
      return {
        outstanding: 0,
        dueThisMonth: 0,
        overdue: 0,
        paidThisMonth: 0,
        openExpenses: 0,
      };
    }

    const unpaid = rows.filter((row) => !row.paid);
    const outstanding = unpaid.reduce((sum, row) => sum + row.amount, 0);
    const dueThisMonth = unpaid
      .filter(
        (row) =>
          row.expenseDate >= `${monthPrefix}-01` && row.expenseDate <= `${monthPrefix}-31`,
      )
      .reduce((sum, row) => sum + row.amount, 0);
    const overdue = unpaid
      .filter((row) => row.expenseDate && row.expenseDate < todayIso)
      .reduce((sum, row) => sum + row.amount, 0);
    const paidThisMonth = rows
      .filter((row) => row.paid && row.expenseDate.slice(0, 7) === monthPrefix)
      .reduce((sum, row) => sum + row.amount, 0);

    return {
      outstanding,
      dueThisMonth,
      overdue,
      paidThisMonth,
      openExpenses: unpaid.length,
    };
  }, [rows, monthPrefix, todayIso]);

  const cards = [
    { label: "Outstanding", value: formatMoney(kpis.outstanding) },
    { label: "Due This Month", value: formatMoney(kpis.dueThisMonth) },
    { label: "Overdue", value: formatMoney(kpis.overdue) },
    { label: "Paid This Month", value: formatMoney(kpis.paidThisMonth) },
    { label: "Open Expenses", value: String(kpis.openExpenses) },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-white/55">
            Supplier expenses awaiting settlement, driven by the ledger.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/80"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-white/10 bg-[#0b1524]/70 px-4 py-3"
            >
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                {card.label}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-white">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        {loading ? (
          <div className="flex items-center gap-2 px-5 py-10 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading payables…
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Receipt className="mx-auto h-8 w-8 text-white/25" />
            <p className="mt-3 text-sm text-white/50">
              No supplier invoices or expenses yet. Live zeros until expenses are posted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/40">
                <tr>
                  <th className="px-4 py-2">Supplier</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2">Due</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">View Expense</th>
                  <th className="px-4 py-2">View Journal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const journalId = row.paymentJournalEntryId ?? row.journalEntryId;
                  return (
                    <tr key={row.id} className="border-b border-white/[0.05]">
                      <td className="px-4 py-2 text-white">{row.supplier}</td>
                      <td className="px-4 py-2 text-white/70">
                        {row.description || "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-white/85">
                        {formatMoney(row.amount, row.currency)}
                      </td>
                      <td className="px-4 py-2 text-white/55">{row.expenseDate || "—"}</td>
                      <td className="px-4 py-2 text-white/75">
                        {row.paid ? "Paid" : "Open"}
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href="?view=expenses"
                          className="text-xs font-medium text-sky-300 hover:text-sky-200"
                        >
                          View expense
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        {journalId ? (
                          <Link
                            href={`?view=general-ledger&journal=${encodeURIComponent(journalId)}`}
                            className="text-xs font-medium text-sky-300 hover:text-sky-200"
                          >
                            View journal
                          </Link>
                        ) : (
                          <span className="text-xs text-white/35">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
