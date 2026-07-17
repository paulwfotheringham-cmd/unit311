"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

import { formatMoney } from "@/lib/accounting/chart-of-accounts";
import type { JournalEntry, LedgerAccount, TrialBalanceRow } from "@/lib/accounting/types";
import { centralLoginUrl } from "@/lib/app-domains";
import { cn } from "@/lib/utils";

type Totals = {
  assets: number;
  liabilities: number;
  equity: number;
  income: number;
  expenses: number;
  netProfit: number;
};

type Tab = "journal" | "accounts" | "trial";

type AccountTransaction = {
  journalId: string;
  reference: string;
  description: string;
  journalDate: string;
  sourceType: string | null;
  debit: number;
  credit: number;
  lineDescription: string;
};

type ClientOption = {
  id: string;
  name: string;
};

function sourceHref(sourceType: string | null): string | null {
  if (!sourceType) return null;
  if (sourceType === "invoice_issue" || sourceType === "invoice_payment") {
    return "?view=accounts-receivable";
  }
  if (sourceType.startsWith("expense")) return "?view=expenses";
  if (sourceType.startsWith("wise")) return "?view=wise";
  return null;
}

function sourceLabel(sourceType: string | null): string {
  if (!sourceType) return "—";
  return sourceType.replace(/_/g, " ");
}

export default function GeneralLedgerWorkspace() {
  const [journalParam, setJournalParam] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("journal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [trialRows, setTrialRows] = useState<TrialBalanceRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [difference, setDifference] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "posted" | "draft">("all");
  const [referenceQuery, setReferenceQuery] = useState("");

  const [selectedAccount, setSelectedAccount] = useState<LedgerAccount | null>(null);
  const [accountTxLoading, setAccountTxLoading] = useState(false);
  const [accountTxError, setAccountTxError] = useState<string | null>(null);
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [journalsRes, accountsRes, trialRes, clientsRes] = await Promise.all([
        fetch("/api/financials/ledger/journals", { cache: "no-store" }),
        fetch("/api/financials/ledger/accounts", { cache: "no-store" }),
        fetch("/api/financials/ledger/trial-balance", { cache: "no-store" }),
        fetch("/api/clients", { cache: "no-store" }).catch(() => null),
      ]);
      const journalsData = await journalsRes.json();
      const accountsData = await accountsRes.json();
      const trialData = await trialRes.json();
      if (!journalsRes.ok) throw new Error(journalsData.error ?? "Failed to load journals");
      if (!accountsRes.ok) throw new Error(accountsData.error ?? "Failed to load accounts");
      if (!trialRes.ok) throw new Error(trialData.error ?? "Failed to load trial balance");

      const nextJournals = (journalsData.journals ?? []) as JournalEntry[];
      setJournals(nextJournals);
      setAccounts(accountsData.accounts ?? []);
      setTrialRows(trialData.trialBalance?.rows ?? []);
      setDifference(trialData.trialBalance?.difference ?? 0);
      setTotals(trialData.totals ?? null);

      const journalClientIds = [
        ...new Set(
          nextJournals
            .map((journal) => journal.clientId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      const nameById = new Map<string, string>();
      if (clientsRes?.ok) {
        const clientsData = await clientsRes.json();
        for (const client of clientsData.clients ?? []) {
          const id = String(client.id ?? "");
          if (!id) continue;
          nameById.set(
            id,
            String(client.companyName ?? client.company_name ?? client.name ?? id),
          );
        }
      }
      setClientOptions(
        journalClientIds.map((id) => ({
          id,
          name: nameById.get(id) ?? id,
        })),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    startTransition(() => {
      setJournalParam(params.get("journal"));
    });
  }, []);

  useEffect(() => {
    if (!journalParam) return;
    startTransition(() => {
      setTab("journal");
      setExpanded((current) => ({ ...current, [journalParam]: true }));
      setSelectedJournalId(journalParam);
    });
  }, [journalParam]);

  const sourceOptions = useMemo(() => {
    const values = new Set<string>();
    for (const journal of journals) {
      if (journal.sourceType) values.add(journal.sourceType);
    }
    return [...values].sort();
  }, [journals]);

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of clientOptions) map.set(option.id, option.name);
    return map;
  }, [clientOptions]);

  const filteredJournals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const refQ = referenceQuery.trim().toLowerCase();
    return journals.filter((journal) => {
      if (dateFrom && journal.journalDate < dateFrom) return false;
      if (dateTo && journal.journalDate > dateTo) return false;
      if (clientFilter !== "all" && journal.clientId !== clientFilter) return false;
      if (sourceFilter !== "all" && journal.sourceType !== sourceFilter) return false;
      if (statusFilter !== "all" && journal.status !== statusFilter) return false;
      if (refQ && !journal.reference.toLowerCase().includes(refQ)) return false;
      if (q) {
        const haystack = [
          journal.reference,
          journal.description,
          journal.sourceType ?? "",
          journal.clientId ?? "",
          journal.status,
          ...journal.lines.map((line) => `${line.accountCode} ${line.accountName}`),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    journals,
    searchQuery,
    dateFrom,
    dateTo,
    clientFilter,
    sourceFilter,
    statusFilter,
    referenceQuery,
  ]);

  const selectedJournal =
    selectedJournalId != null
      ? journals.find((journal) => journal.id === selectedJournalId) ?? null
      : null;

  const cards = [
    { label: "Assets", value: totals?.assets ?? 0 },
    { label: "Liabilities", value: totals?.liabilities ?? 0 },
    { label: "Equity", value: totals?.equity ?? 0 },
    { label: "Income", value: totals?.income ?? 0 },
    { label: "Expenses", value: totals?.expenses ?? 0 },
    { label: "Net Profit", value: totals?.netProfit ?? 0 },
  ];

  const trialDebitTotal = trialRows.reduce((sum, row) => sum + row.debit, 0);
  const trialCreditTotal = trialRows.reduce((sum, row) => sum + row.credit, 0);

  async function openAccount(account: LedgerAccount) {
    setSelectedAccount(account);
    setAccountTxLoading(true);
    setAccountTxError(null);
    setAccountTransactions([]);
    try {
      const response = await fetch(
        `/api/financials/ledger/accounts/${account.id}/transactions`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load transactions");
      setAccountTransactions(data.transactions ?? []);
    } catch (txError) {
      setAccountTxError(
        txError instanceof Error ? txError.message : "Failed to load transactions",
      );
    } finally {
      setAccountTxLoading(false);
    }
  }

  function toggleJournal(id: string) {
    setExpanded((current) => {
      const nextOpen = !current[id];
      return { ...current, [id]: nextOpen };
    });
    setSelectedJournalId((current) => (current === id ? null : id));
  }

  function openJournalDetail(id: string) {
    setExpanded((current) => ({ ...current, [id]: true }));
    setSelectedJournalId(id);
  }

  const inputClass =
    "h-9 rounded-lg border border-white/10 bg-[#0b1524]/80 px-2.5 text-xs text-white placeholder:text-white/35 outline-none focus:border-emerald-400/40";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/90">
              Financials
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">General Ledger</h2>
            <p className="mt-1 text-sm text-white/55">
              Source of truth for all Unit311 financial postings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/80"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-white/10 bg-[#0b1524]/70 px-3 py-3"
            >
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                {card.label}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                {formatMoney(card.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["journal", "Journal"],
            ["accounts", "Chart Of Accounts"],
            ["trial", "Trial Balance"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              if (id !== "accounts") setSelectedAccount(null);
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold",
              tab === id
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                : "border-white/10 text-white/60",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          <p>{error}</p>
          {/unauthorized|authentication required/i.test(error) ? (
            <p className="mt-2 text-rose-100/80">
              Your session is missing or expired on this host.{" "}
              <a
                href={centralLoginUrl()}
                className="font-semibold underline underline-offset-2 hover:text-white"
              >
                Sign in again
              </a>{" "}
              so financials can load on internal.unit311central.com.
            </p>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading general ledger…
        </div>
      ) : null}

      {!loading && tab === "journal" ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <label className="relative xl:col-span-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search journals…"
                  className={cn(inputClass, "w-full pl-8")}
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Date from
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className={cn(inputClass, "w-full")}
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Date to
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className={cn(inputClass, "w-full")}
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Client
                </span>
                <select
                  value={clientFilter}
                  onChange={(event) => setClientFilter(event.target.value)}
                  className={cn(inputClass, "w-full")}
                >
                  <option value="all">All clients</option>
                  {clientOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="block text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Source
                </span>
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  className={cn(inputClass, "w-full")}
                >
                  <option value="all">All sources</option>
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {sourceLabel(source)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="block text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Status
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | "posted" | "draft")
                  }
                  className={cn(inputClass, "w-full")}
                >
                  <option value="all">All</option>
                  <option value="posted">Posted</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <label className="space-y-1 xl:col-span-2">
                <span className="block text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Reference
                </span>
                <input
                  type="search"
                  value={referenceQuery}
                  onChange={(event) => setReferenceQuery(event.target.value)}
                  placeholder="Filter by reference…"
                  className={cn(inputClass, "w-full")}
                />
              </label>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              {filteredJournals.length === 0 ? (
                <p className="px-5 py-10 text-sm text-white/50">
                  {journals.length === 0
                    ? "No journal entries posted yet."
                    : "No journals match the current filters."}
                </p>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {filteredJournals.map((journal) => {
                    const open = Boolean(expanded[journal.id]);
                    const active = selectedJournalId === journal.id;
                    return (
                      <div
                        key={journal.id}
                        className={cn(active && "bg-emerald-500/[0.04]")}
                      >
                        <div className="flex w-full items-stretch gap-2 px-3 py-2 sm:px-4">
                          <button
                            type="button"
                            onClick={() => toggleJournal(journal.id)}
                            className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left hover:bg-white/[0.02]"
                          >
                            {open ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
                            )}
                            <div className="min-w-0 flex-1 grid gap-1 sm:grid-cols-6 sm:items-center">
                              <span className="text-xs text-white/55">
                                {journal.journalDate}
                              </span>
                              <span className="text-xs font-medium text-white">
                                {journal.reference}
                              </span>
                              <span className="truncate text-xs text-white/70 sm:col-span-2">
                                {journal.description || "—"}
                              </span>
                              <span className="text-xs tabular-nums text-white/80">
                                {formatMoney(journal.debitTotal)}
                              </span>
                              <span className="text-xs font-semibold uppercase text-emerald-200/90">
                                {journal.status}
                              </span>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => openJournalDetail(journal.id)}
                            className="shrink-0 self-center rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-sky-200 hover:border-sky-400/30 hover:bg-sky-500/10"
                          >
                            Open detail
                          </button>
                        </div>
                        {open ? (
                          <div className="border-t border-white/[0.04] bg-black/20 px-6 py-3 sm:px-8">
                            <div className="mb-2 grid gap-1 text-xs text-white/55 sm:grid-cols-3">
                              <p>
                                Client:{" "}
                                <span className="text-white/80">
                                  {journal.clientId
                                    ? clientNameById.get(journal.clientId) ?? journal.clientId
                                    : "—"}
                                </span>
                              </p>
                              <p>
                                Source:{" "}
                                <span className="capitalize text-white/80">
                                  {sourceLabel(journal.sourceType)}
                                </span>
                              </p>
                              <p>
                                Totals:{" "}
                                <span className="tabular-nums text-white/80">
                                  Dr {formatMoney(journal.debitTotal)} / Cr{" "}
                                  {formatMoney(journal.creditTotal)}
                                </span>
                              </p>
                            </div>
                            {journal.lines.length === 0 ? (
                              <p className="text-xs text-white/45">No lines on this journal.</p>
                            ) : (
                              journal.lines.map((line) => (
                                <div
                                  key={line.id}
                                  className="grid grid-cols-[1fr_6rem_6rem] gap-2 py-1 text-xs text-white/70"
                                >
                                  <span>
                                    {line.accountCode} · {line.accountName}
                                    {line.description ? (
                                      <span className="text-white/40"> — {line.description}</span>
                                    ) : null}
                                  </span>
                                  <span className="text-right tabular-nums">
                                    {line.debit ? formatMoney(line.debit) : "—"}
                                  </span>
                                  <span className="text-right tabular-nums">
                                    {line.credit ? formatMoney(line.credit) : "—"}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/90">
                Journal Detail
              </p>
              {!selectedJournal ? (
                <p className="mt-4 text-sm text-white/50">
                  Expand a journal or click Open detail to inspect posting lines.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                        Reference
                      </dt>
                      <dd className="mt-1 font-mono text-white">{selectedJournal.reference}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                        Status
                      </dt>
                      <dd className="mt-1 uppercase text-emerald-200/90">
                        {selectedJournal.status}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                        Journal Date
                      </dt>
                      <dd className="mt-1 text-white/85">{selectedJournal.journalDate}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                        Client
                      </dt>
                      <dd className="mt-1 text-white/85">
                        {selectedJournal.clientId
                          ? clientNameById.get(selectedJournal.clientId) ??
                            selectedJournal.clientId
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                        Source
                      </dt>
                      <dd className="mt-1 capitalize text-white/85">
                        {sourceLabel(selectedJournal.sourceType)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                        Source Link
                      </dt>
                      <dd className="mt-1">
                        {sourceHref(selectedJournal.sourceType) ? (
                          <Link
                            href={sourceHref(selectedJournal.sourceType)!}
                            className="text-sky-300 hover:text-sky-200"
                          >
                            Open source
                          </Link>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/40">
                        <tr>
                          <th className="px-3 py-2">Account</th>
                          <th className="px-3 py-2 text-right">Debit</th>
                          <th className="px-3 py-2 text-right">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedJournal.lines.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-3 py-6 text-white/45">
                              No journal lines.
                            </td>
                          </tr>
                        ) : (
                          selectedJournal.lines.map((line) => (
                            <tr key={line.id} className="border-b border-white/[0.05]">
                              <td className="px-3 py-2 text-white/80">
                                <div>
                                  {line.accountCode} · {line.accountName}
                                </div>
                                {line.description ? (
                                  <div className="text-white/40">{line.description}</div>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-white/80">
                                {line.debit ? formatMoney(line.debit) : "—"}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-white/80">
                                {line.credit ? formatMoney(line.credit) : "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                        Debit Total
                      </p>
                      <p className="mt-1 text-base font-semibold tabular-nums text-white">
                        {formatMoney(selectedJournal.debitTotal)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                        Credit Total
                      </p>
                      <p className="mt-1 text-base font-semibold tabular-nums text-white">
                        {formatMoney(selectedJournal.creditTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {!loading && tab === "accounts" ? (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {selectedAccount ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAccount(null);
                      setAccountTransactions([]);
                      setAccountTxError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:text-sky-200"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to chart of accounts
                  </button>
                  <h3 className="mt-2 text-sm font-semibold text-white">
                    {selectedAccount.code} · {selectedAccount.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-white/50">
                    Balance {formatMoney(selectedAccount.balance, selectedAccount.currency ?? "USD")}
                    {" · "}
                    {selectedAccount.transactionCount} transaction
                    {selectedAccount.transactionCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {accountTxLoading ? (
                <div className="flex items-center gap-2 px-5 py-10 text-sm text-white/55">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading account transactions…
                </div>
              ) : accountTxError ? (
                <p className="px-5 py-8 text-sm text-rose-100">{accountTxError}</p>
              ) : accountTransactions.length === 0 ? (
                <p className="px-5 py-10 text-sm text-white/50">
                  No posted transactions on this account yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[52rem] text-left text-sm">
                    <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/40">
                      <tr>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Reference</th>
                        <th className="px-4 py-2">Description</th>
                        <th className="px-4 py-2">Source</th>
                        <th className="px-4 py-2 text-right">Debit</th>
                        <th className="px-4 py-2 text-right">Credit</th>
                        <th className="px-4 py-2">Journal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountTransactions.map((tx, index) => (
                        <tr
                          key={`${tx.journalId}-${index}`}
                          className="border-b border-white/[0.05]"
                        >
                          <td className="px-4 py-2 text-white/60">{tx.journalDate}</td>
                          <td className="px-4 py-2 font-mono text-white/85">{tx.reference}</td>
                          <td className="px-4 py-2 text-white/70">
                            {tx.lineDescription || tx.description || "—"}
                          </td>
                          <td className="px-4 py-2 capitalize text-white/55">
                            {sourceLabel(tx.sourceType)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-white/85">
                            {tx.debit ? formatMoney(tx.debit) : "—"}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-white/85">
                            {tx.credit ? formatMoney(tx.credit) : "—"}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTab("journal");
                                openJournalDetail(tx.journalId);
                              }}
                              className="text-xs font-medium text-sky-300 hover:text-sky-200"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : accounts.length === 0 ? (
            <p className="px-5 py-10 text-sm text-white/50">
              No accounts in the chart of accounts yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/40">
                  <tr>
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2 text-right">Current Balance</th>
                    <th className="px-4 py-2 text-right">Transaction Count</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr
                      key={account.id}
                      className="cursor-pointer border-b border-white/[0.05] hover:bg-white/[0.03]"
                      onClick={() => void openAccount(account)}
                    >
                      <td className="px-4 py-2 font-mono text-white/80">{account.code}</td>
                      <td className="px-4 py-2 text-white">{account.name}</td>
                      <td className="px-4 py-2 capitalize text-white/55">{account.type}</td>
                      <td className="px-4 py-2 text-right font-mono text-white/85">
                        {formatMoney(account.balance, account.currency ?? "USD")}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-white/70">
                        {account.transactionCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {!loading && tab === "trial" ? (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div
            className={cn(
              "border-b border-white/10 px-4 py-3 text-sm",
              difference === 0
                ? "bg-emerald-500/10 text-emerald-100"
                : "bg-rose-500/10 text-rose-100",
            )}
          >
            Difference:{" "}
            <span
              className={cn(
                "font-semibold tabular-nums",
                difference === 0 ? "text-emerald-300" : "text-rose-300",
              )}
            >
              {formatMoney(difference)}
            </span>
          </div>
          {trialRows.length === 0 ? (
            <p className="px-5 py-10 text-sm text-white/50">
              No trial balance rows yet. Posted journals will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/40">
                  <tr>
                    <th className="px-4 py-2">Account</th>
                    <th className="px-4 py-2 text-right">Debit</th>
                    <th className="px-4 py-2 text-right">Credit</th>
                    <th className="px-4 py-2 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {trialRows.map((row) => (
                    <tr key={row.accountId} className="border-b border-white/[0.05]">
                      <td className="px-4 py-2 text-white">
                        {row.code} · {row.name}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-white/80">
                        {row.debit ? formatMoney(row.debit) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-white/80">
                        {row.credit ? formatMoney(row.credit) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-white/80">
                        {formatMoney(row.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10 bg-black/20 text-sm font-semibold text-white">
                    <td className="px-4 py-3">Totals</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(trialDebitTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(trialCreditTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white/50">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
