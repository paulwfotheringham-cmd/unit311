"use client";

import { useCallback, useEffect, useState } from "react";

import TreasuryTransactionDetailPanel from "@/components/treasury/TreasuryTransactionDetailPanel";
import {
  formatTreasuryDateTime,
  formatTreasuryMoney,
  readTreasuryApiJson,
  treasuryInputClassName,
  treasuryPanelClassName,
  TreasuryDirectionBadge,
  TreasuryFieldLabel,
  TreasurySkeleton,
  TreasuryStatusBadge,
} from "@/components/treasury/treasury-ui";
import { defaultStatementInterval } from "@/lib/treasury/treasury-utils";
import type {
  TreasuryTransaction,
  TreasuryTransferDirection,
} from "@/lib/treasury/treasury-types";
import { isWiseStatementAccessError } from "@/lib/wise-service";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";

type StatementResponse = {
  items: TreasuryTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
  code?: string;
  wise?: {
    status: number;
    requestUrl: string;
    method: string;
    requestParameters: Record<string, unknown> | null;
    responseBody: string;
    responseHeaders?: Record<string, string | null>;
  };
};

type TreasuryTransactionsPageProps = {
  balanceId: number;
  currency: string;
  onBack: () => void;
  isAdmin?: boolean;
};

export default function TreasuryTransactionsPage({
  balanceId,
  currency,
  onBack,
  isAdmin = false,
}: TreasuryTransactionsPageProps) {
  const [items, setItems] = useState<TreasuryTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [wiseErrorDetails, setWiseErrorDetails] = useState<StatementResponse["wise"] | null>(null);
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<TreasuryTransferDirection | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<TreasuryTransaction | null>(null);
  const pageSize = 25;

  const loadTransactions = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      setErrorCode(null);
      setWiseErrorDetails(null);

      try {
        const { intervalStart, intervalEnd } = defaultStatementInterval(90);
        const params = new URLSearchParams({
          currency,
          intervalStart,
          intervalEnd,
          page: String(page),
          pageSize: String(pageSize),
          direction,
        });
        if (search.trim()) params.set("search", search.trim());
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const response = await fetch(
          `/api/financials/wise/statements/${balanceId}?${params.toString()}`,
          { cache: "no-store" },
        );
        const data = await readTreasuryApiJson<StatementResponse>(response);
        if (!response.ok) {
          setErrorCode(data.code ?? null);
          setWiseErrorDetails(data.wise ?? null);
          throw new Error(data.error ?? "Failed to load transactions.");
        }

        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load transactions.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [balanceId, currency, page, search, direction, dateFrom, dateTo],
  );

  useEffect(() => {
    void loadTransactions("initial");
  }, [loadTransactions]);

  const exportStatement = (format: "csv" | "pdf") => {
    const { intervalStart, intervalEnd } = defaultStatementInterval(90);
    const params = new URLSearchParams({
      currency,
      intervalStart,
      intervalEnd,
      format,
    });
    window.open(
      `/api/financials/wise/statements/${balanceId}/export?${params.toString()}`,
      "_blank",
    );
  };

  return (
    <div className="space-y-4">
      <section className={treasuryPanelClassName()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-white/80 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
                {currency} balance
              </p>
              <h2 className="mt-0.5 text-lg font-semibold text-white">Transactions</h2>
              <p className="mt-1 text-xs text-white/45">
                {total} transaction{total === 1 ? "" : "s"} · Balance {balanceId}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportStatement("csv")}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/80 transition-colors hover:border-white/25 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => exportStatement("pdf")}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/80 transition-colors hover:border-white/25 hover:text-white"
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </button>
            <button
              type="button"
              onClick={() => void loadTransactions("refresh")}
              disabled={loading || refreshing}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/80 transition-colors hover:border-white/25 hover:text-white disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <TreasuryFieldLabel>Search</TreasuryFieldLabel>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Description, reference, counterparty…"
                className={cn(treasuryInputClassName(), "mt-0 pl-9")}
              />
            </div>
          </div>
          <div>
            <TreasuryFieldLabel>Direction</TreasuryFieldLabel>
            <select
              value={direction}
              onChange={(event) => {
                setPage(1);
                setDirection(event.target.value as TreasuryTransferDirection | "all");
              }}
              className={treasuryInputClassName()}
            >
              <option value="all">All</option>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <TreasuryFieldLabel>From</TreasuryFieldLabel>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setPage(1);
                  setDateFrom(event.target.value);
                }}
                className={treasuryInputClassName()}
              />
            </div>
            <div>
              <TreasuryFieldLabel>To</TreasuryFieldLabel>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setPage(1);
                  setDateTo(event.target.value);
                }}
                className={treasuryInputClassName()}
              />
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <section
          className={cn(
            treasuryPanelClassName(),
            errorCode === "statement_access_denied" || isWiseStatementAccessError(error)
              ? "border-amber-400/25 bg-amber-500/10"
              : "border-rose-400/20 bg-rose-500/10",
          )}
        >
          <p
            className={cn(
              "text-sm",
              errorCode === "statement_access_denied" || isWiseStatementAccessError(error)
                ? "text-amber-100"
                : "text-rose-200",
            )}
          >
            {error}
          </p>
          {wiseErrorDetails ? (
            <details className="mt-3 text-xs text-white/55">
              <summary className="cursor-pointer text-white/70">Wise API details</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-[11px] leading-relaxed text-white/60">
                {JSON.stringify(wiseErrorDetails, null, 2)}
              </pre>
            </details>
          ) : null}
        </section>
      ) : null}

      <section className={cn(treasuryPanelClassName(), "overflow-hidden p-0 sm:p-0")}>
        {loading ? (
          <div className="space-y-2 p-4 sm:p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <TreasurySkeleton key={index} className="h-14" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-white/55 sm:p-5">No transactions match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-[0.12em] text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium sm:px-5">Date</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Description</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell sm:px-5">
                    Counterparty
                  </th>
                  <th className="px-4 py-3 font-medium sm:px-5">Direction</th>
                  <th className="px-4 py-3 text-right font-medium sm:px-5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelected(tx)}
                    className="cursor-pointer border-b border-white/[0.06] transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-white/70 sm:px-5">
                      {formatTreasuryDateTime(tx.date)}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <p className="font-medium text-white">{tx.description}</p>
                      <p className="mt-0.5 text-xs text-white/40">{tx.reference}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-white/60 md:table-cell sm:px-5">
                      {tx.counterparty}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <TreasuryDirectionBadge direction={tx.direction} />
                    </td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <p
                        className={cn(
                          "font-semibold tabular-nums",
                          tx.direction === "incoming" ? "text-emerald-300" : "text-white",
                        )}
                      >
                        {tx.direction === "incoming" ? "+" : "−"}
                        {formatTreasuryMoney(Math.abs(tx.amount), tx.currency)}
                      </p>
                      <div className="mt-1 flex justify-end">
                        <TreasuryStatusBadge status={tx.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 sm:px-5">
            <p className="text-xs text-white/45">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 text-xs text-white/80 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 text-xs text-white/80 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <TreasuryTransactionDetailPanel
        transaction={selected}
        onClose={() => setSelected(null)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
