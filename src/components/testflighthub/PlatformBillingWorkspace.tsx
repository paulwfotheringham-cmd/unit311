"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";

import {
  formatBillingFrequency,
  formatSubscriptionStatus,
  formatUsd,
  type PlatformCustomerSubscription,
} from "@/lib/platform-billing-data";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Search } from "lucide-react";

type PlatformBillingResponse = {
  subscriptions?: PlatformCustomerSubscription[];
  totals?: {
    customers: number;
    active: number;
    mrrUsd: number;
    arrUsd: number;
    outstandingBalanceUsd: number;
  };
  subscription?: PlatformCustomerSubscription;
  error?: string;
};

function statusClass(status: PlatformCustomerSubscription["subscriptionStatus"]) {
  switch (status) {
    case "active":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "pending_payment":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    case "suspended":
      return "border-orange-400/30 bg-orange-500/10 text-orange-200";
    case "cancelled":
    case "inactive":
      return "border-white/15 bg-white/[0.04] text-white/55";
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PlatformBillingWorkspace() {
  const [subscriptions, setSubscriptions] = useState<PlatformCustomerSubscription[]>([]);
  const [totals, setTotals] = useState<PlatformBillingResponse["totals"] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const ensureResponse = await fetch("/api/platform-billing/ensure", { method: "POST" });
      // Ensure may fail if DDL credentials are missing; list endpoint still serves seed fallback.
      void ensureResponse;

      const response = await fetch("/api/platform-billing", { cache: "no-store" });
      const data = (await response.json()) as PlatformBillingResponse & { warning?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load platform billing.");
      setSubscriptions(data.subscriptions ?? []);
      setTotals(data.totals ?? null);
      if (data.warning) setWarning(data.warning);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load platform billing.");
      setSubscriptions([]);
      setTotals(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subscriptions;
    return subscriptions.filter((row) => {
      const haystack = `${row.companyName} ${row.planName} ${row.subscriptionStatus}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [search, subscriptions]);

  const selected = useMemo(
    () => subscriptions.find((row) => row.id === selectedId) ?? null,
    [selectedId, subscriptions],
  );

  if (selected) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.08]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to all customers
        </button>

        <section className="overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.12] via-white/[0.04] to-sky-500/[0.08] shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
          <div className="border-b border-white/10 px-5 py-5 sm:px-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300/80">
              Customer billing record
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">{selected.companyName}</h2>
            <p className="mt-1 text-sm text-white/55">
              {selected.planName} · {formatBillingFrequency(selected.billingFrequency)}
            </p>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
            <Detail label="Subscription status" value={formatSubscriptionStatus(selected.subscriptionStatus)} />
            <Detail label="Outstanding balance" value={formatUsd(selected.outstandingBalanceUsd)} />
            <Detail label="Next invoice" value={formatDate(selected.nextInvoiceDate)} />
            <Detail label="MRR" value={formatUsd(selected.mrrUsd)} />
            <Detail label="ARR" value={formatUsd(selected.arrUsd)} />
            <Detail label="Billing frequency" value={formatBillingFrequency(selected.billingFrequency)} />
            <Detail label="Plan" value={selected.planName} />
            <Detail label="Currency" value={selected.currency} />
          </div>
          {selected.notes ? (
            <div className="border-t border-white/10 px-5 py-4 text-sm text-white/55 sm:px-6">
              {selected.notes}
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Customers" value={String(totals?.customers ?? "—")} />
        <SummaryCard label="Active subscriptions" value={String(totals?.active ?? "—")} />
        <SummaryCard label="MRR" value={totals ? formatUsd(totals.mrrUsd) : "—"} />
        <SummaryCard label="ARR" value={totals ? formatUsd(totals.arrUsd) : "—"} />
      </section>

      <section className="rounded-2xl border border-white/15 bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <p className="text-xs text-white/45">
            All customer subscriptions across Unit311 Central
          </p>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company or plan…"
              className="h-9 w-full rounded-xl border border-white/10 bg-[#0b1524] pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/35 focus:border-violet-400/40"
            />
          </div>
        </div>

        {error ? (
          <div className="m-4 space-y-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-50 transition-colors hover:bg-red-500/30"
            >
              Retry setup
            </button>
          </div>
        ) : null}

        {warning ? (
          <p className="mx-4 mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {warning}
          </p>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 px-5 py-10 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading customer billing…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-white/40">
                <tr>
                  <th className="px-4 py-3 font-medium sm:px-5">Company</th>
                  <th className="px-3 py-3 font-medium">Plan</th>
                  <th className="px-3 py-3 font-medium">Billing frequency</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Outstanding</th>
                  <th className="px-3 py-3 font-medium">Next invoice</th>
                  <th className="px-3 py-3 font-medium">MRR</th>
                  <th className="px-3 py-3 font-medium">ARR</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-sm text-white/45">
                      No customer subscriptions found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/[0.06] transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3 font-medium text-white sm:px-5">{row.companyName}</td>
                      <td className="px-3 py-3 text-white/75">{row.planName}</td>
                      <td className="px-3 py-3 text-white/65">
                        {formatBillingFrequency(row.billingFrequency)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]",
                            statusClass(row.subscriptionStatus),
                          )}
                        >
                          {formatSubscriptionStatus(row.subscriptionStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-white/75">
                        {formatUsd(row.outstandingBalanceUsd)}
                      </td>
                      <td className="px-3 py-3 text-white/65">{formatDate(row.nextInvoiceDate)}</td>
                      <td className="px-3 py-3 font-mono text-emerald-200/90">{formatUsd(row.mrrUsd)}</td>
                      <td className="px-3 py-3 font-mono text-sky-200/90">{formatUsd(row.arrUsd)}</td>
                      <td className="px-4 py-3 sm:px-5">
                        <button
                          type="button"
                          onClick={() => setSelectedId(row.id)}
                          className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-100 transition-colors hover:bg-violet-500/20"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1524]/50 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
