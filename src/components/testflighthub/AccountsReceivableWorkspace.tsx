"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import Link from "next/link";
import { FileText, Loader2, RefreshCw, X } from "lucide-react";

import { formatMoney } from "@/lib/accounting/chart-of-accounts";
import type { LedgerInvoice } from "@/lib/accounting/types";
import { cn } from "@/lib/utils";

function isUnpaid(status: LedgerInvoice["status"]) {
  return status === "issued" || status === "overdue";
}

function daysBetween(fromIso: string, toIso: string) {
  const from = new Date(fromIso.includes("T") ? fromIso : `${fromIso}T00:00:00.000Z`);
  const to = new Date(toIso.includes("T") ? toIso : `${toIso}T00:00:00.000Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

function paidAtMonth(invoice: LedgerInvoice, monthPrefix: string) {
  const stamp = invoice.paidAt ?? invoice.updatedAt;
  return Boolean(stamp && stamp.slice(0, 7) === monthPrefix);
}

export default function AccountsReceivableWorkspace() {
  const [invoices, setInvoices] = useState<LedgerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/financials/invoices", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load invoices");
      setInvoices(data.invoices ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  async function reconcileWise() {
    setReconciling(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/financials/wise/reconcile", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Reconcile failed");
      setMessage(
        `Matched ${(data.matched ?? []).length} payment(s) across ${data.scannedBalances ?? 0} balance(s).`,
      );
      await load();
    } catch (reconcileError) {
      setError(reconcileError instanceof Error ? reconcileError.message : "Reconcile failed");
    } finally {
      setReconciling(false);
    }
  }

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const monthPrefix = todayIso.slice(0, 7);

  const kpis = useMemo(() => {
    if (invoices.length === 0) {
      return {
        outstanding: 0,
        overdue: 0,
        paidThisMonth: 0,
        collectionRate: 0,
        averageDaysToPayment: 0,
      };
    }

    const unpaid = invoices.filter((invoice) => isUnpaid(invoice.status));
    const outstanding = unpaid.reduce((sum, invoice) => sum + invoice.amount, 0);
    const overdue = unpaid
      .filter((invoice) => invoice.dueDate < todayIso)
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const paidThisMonth = invoices
      .filter((invoice) => invoice.status === "paid" && paidAtMonth(invoice, monthPrefix))
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const paidCount = invoices.filter((invoice) => invoice.status === "paid").length;
    const collectionRate = (paidCount / invoices.length) * 100;

    const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
    const averageDaysToPayment =
      paidInvoices.length === 0
        ? 0
        : paidInvoices.reduce((sum, invoice) => {
            const paidStamp = invoice.paidAt ?? invoice.updatedAt;
            return sum + daysBetween(invoice.issueDate, paidStamp);
          }, 0) / paidInvoices.length;

    return {
      outstanding,
      overdue,
      paidThisMonth,
      collectionRate,
      averageDaysToPayment,
    };
  }, [invoices, monthPrefix, todayIso]);

  const selected = selectedId
    ? invoices.find((invoice) => invoice.id === selectedId) ?? null
    : null;

  const cards = [
    { label: "Outstanding", value: formatMoney(kpis.outstanding) },
    { label: "Overdue", value: formatMoney(kpis.overdue) },
    { label: "Paid This Month", value: formatMoney(kpis.paidThisMonth) },
    { label: "Collection Rate", value: `${kpis.collectionRate.toFixed(1)}%` },
    {
      label: "Average Days To Payment",
      value: kpis.averageDaysToPayment.toFixed(1),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-white/55">Client invoices posted to the General Ledger.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void reconcileWise()}
              disabled={reconciling}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 text-xs font-semibold text-sky-100 disabled:opacity-60"
            >
              {reconciling ? "Syncing Wise…" : "Sync Wise payments"}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/80"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
        {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}
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

      <div className={cn("grid gap-4", selected && "xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]")}>
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {loading ? (
            <div className="flex items-center gap-2 px-5 py-10 text-sm text-white/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading invoices…
            </div>
          ) : invoices.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-white/25" />
              <p className="mt-3 text-sm text-white/50">
                No invoices yet. Values will appear from live ledger postings.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[64rem] text-left text-sm">
                <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/40">
                  <tr>
                    <th className="px-4 py-2">Invoice Number</th>
                    <th className="px-4 py-2">Client</th>
                    <th className="px-4 py-2">Issue Date</th>
                    <th className="px-4 py-2">Due Date</th>
                    <th className="px-4 py-2 text-right">Outstanding</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Payment Method</th>
                    <th className="px-4 py-2">Open Invoice</th>
                    <th className="px-4 py-2">View Journal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const outstandingAmount = isUnpaid(invoice.status) ? invoice.amount : 0;
                    const journalId =
                      invoice.paymentJournalEntryId ?? invoice.journalEntryId;
                    const active = selectedId === invoice.id;
                    return (
                      <tr
                        key={invoice.id}
                        className={cn(
                          "border-b border-white/[0.05]",
                          active && "bg-emerald-500/[0.06]",
                        )}
                      >
                        <td className="px-4 py-2 font-mono text-white/85">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-4 py-2 text-white">
                          {invoice.clientName ?? invoice.clientId}
                        </td>
                        <td className="px-4 py-2 text-white/60">{invoice.issueDate}</td>
                        <td className="px-4 py-2 text-white/60">{invoice.dueDate}</td>
                        <td className="px-4 py-2 text-right font-mono text-white/85">
                          {formatMoney(outstandingAmount, invoice.currency)}
                        </td>
                        <td className="px-4 py-2 capitalize text-white/75">{invoice.status}</td>
                        <td className="px-4 py-2 capitalize text-white/65">
                          {invoice.paymentMethod ?? "—"}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => setSelectedId(invoice.id)}
                            className="text-xs font-medium text-sky-300 hover:text-sky-200"
                          >
                            Open invoice
                          </button>
                        </td>
                        <td className="px-4 py-2">
                          {journalId ? (
                            <Link
                              href={`?view=general-ledger&journal=${journalId}`}
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

        {selected ? (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/90">
                  Invoice Detail
                </p>
                <h3 className="mt-1 font-mono text-sm font-semibold text-white">
                  {selected.invoiceNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:text-white"
                aria-label="Close invoice detail"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">Client</dt>
                <dd className="mt-1 text-white/85">
                  {selected.clientName ?? selected.clientId}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Payment Status
                </dt>
                <dd className="mt-1 capitalize text-white/85">{selected.status}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Wise Match Status
                </dt>
                <dd className="mt-1 text-white/85">
                  {selected.wiseMatched
                    ? `Matched${selected.wiseMatchedAt ? ` · ${selected.wiseMatchedAt.slice(0, 10)}` : ""}`
                    : "Not matched"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Payment Method
                </dt>
                <dd className="mt-1 capitalize text-white/85">
                  {selected.paymentMethod ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Outstanding
                </dt>
                <dd className="mt-1 tabular-nums text-white/85">
                  {formatMoney(
                    isUnpaid(selected.status) ? selected.amount : 0,
                    selected.currency,
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-col gap-2">
              {selected.pdfPath ? (
                <p className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100">
                  <FileText className="h-3.5 w-3.5" />
                  Invoice PDF on file · {selected.pdfPath}
                </p>
              ) : (
                <p className="text-xs text-white/40">No invoice PDF on file.</p>
              )}
              <Link
                href={`?view=clients&client=${encodeURIComponent(selected.clientId)}`}
                className="text-xs font-medium text-sky-300 hover:text-sky-200"
              >
                View client
              </Link>
              {selected.journalEntryId || selected.paymentJournalEntryId ? (
                <Link
                  href={`?view=general-ledger&journal=${encodeURIComponent(
                    selected.paymentJournalEntryId ?? selected.journalEntryId ?? "",
                  )}`}
                  className="text-xs font-medium text-sky-300 hover:text-sky-200"
                >
                  View journal
                </Link>
              ) : (
                <span className="text-xs text-white/35">No journal linked</span>
              )}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                Payment History
              </p>
              {selected.status === "paid" || selected.wiseMatched ? (
                <ul className="mt-3 space-y-2 text-xs text-white/70">
                  {selected.paidAt || selected.status === "paid" ? (
                    <li className="rounded-lg border border-white/10 bg-[#0b1524]/60 px-3 py-2">
                      Paid
                      {selected.paidAt ? ` · ${selected.paidAt.slice(0, 10)}` : ""}
                      {!selected.paidAt && selected.updatedAt
                        ? ` · ${selected.updatedAt.slice(0, 10)}`
                        : ""}
                      {selected.paymentMethod
                        ? ` · ${selected.paymentMethod}`
                        : ""}
                    </li>
                  ) : null}
                  {selected.wiseMatched ? (
                    <li className="rounded-lg border border-white/10 bg-[#0b1524]/60 px-3 py-2">
                      Wise match
                      {selected.wiseMatchedAt
                        ? ` · ${selected.wiseMatchedAt.slice(0, 10)}`
                        : ""}
                      {selected.wiseTransactionId
                        ? ` · ${selected.wiseTransactionId}`
                        : ""}
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-white/45">No payment events recorded yet.</p>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
