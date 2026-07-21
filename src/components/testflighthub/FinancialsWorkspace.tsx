"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, RefreshCw } from "lucide-react";

import { formatMoney } from "@/lib/accounting/chart-of-accounts";
import type { FinancialOverviewSnapshot } from "@/lib/accounting/types";
import DashboardTopTilesBar from "@/components/testflighthub/DashboardTopTilesBar";
import BurnRateOverviewSection from "@/components/testflighthub/BurnRateOverviewSection";
import {
  DEFAULT_FINANCIALS_TILE_LAYOUT,
  FINANCIALS_DASHBOARD_TILES,
  buildFinancialsDashboardCatalog,
} from "@/lib/view-dashboard-tile-catalogs";
import { cn } from "@/lib/utils";

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/40">
      No {label} data yet
    </div>
  );
}

export default function FinancialsWorkspace() {
  const [overview, setOverview] = useState<FinancialOverviewSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [burnDrillOpen, setBurnDrillOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/financials/ledger/overview", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load overview");
      setOverview(data.overview);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  const tiles = useMemo(
    () => buildFinancialsDashboardCatalog(overview),
    [overview],
  );

  return (
    <div className="space-y-4">
      <DashboardTopTilesBar
        storageKey="unit311-financials-dashboard-tiles-v2"
        catalog={tiles.length ? tiles : FINANCIALS_DASHBOARD_TILES}
        defaultLayout={DEFAULT_FINANCIALS_TILE_LAYOUT}
        title="Customize tiles"
        showCustomizeHint
        onTileClick={(tileId) => {
          if (tileId === "burn-rate") setBurnDrillOpen(true);
        }}
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/90">
              Financials
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Overview</h2>
            <p className="mt-1 text-sm text-white/55">
              Live figures from the General Ledger. Burn Rate uses posted expenses when available,
              otherwise a GL-derived demo ledger.
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
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}
        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading financial overview…
          </div>
        ) : null}
      </section>

      {overview?.burnRate ? (
        <BurnRateOverviewSection
          burnRate={overview.burnRate}
          drillOpen={burnDrillOpen}
          onDrillOpenChange={setBurnDrillOpen}
        />
      ) : null}

      {overview ? (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-white">Accounts Receivable</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Outstanding invoices</dt>
                  <dd className="tabular-nums text-white">{formatMoney(overview.ar.outstanding)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Overdue invoices</dt>
                  <dd className="tabular-nums text-white">{formatMoney(overview.ar.overdue)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Invoices due</dt>
                  <dd className="tabular-nums text-white">{formatMoney(overview.ar.dueSoon)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Collection rate</dt>
                  <dd className="tabular-nums text-white">{overview.ar.collectionRate.toFixed(1)}%</dd>
                </div>
              </dl>
              <div className="mt-4 h-40">
                {overview.ar.ageing.every((bucket) => bucket.amount === 0) ? (
                  <EmptyChart label="ageing" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.ar.ageing}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="bucket" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Recent unpaid invoices
                </p>
                {overview.ar.recentUnpaid.length === 0 ? (
                  <p className="text-xs text-white/40">None</p>
                ) : (
                  overview.ar.recentUnpaid.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between gap-2 text-xs text-white/70"
                    >
                      <span>
                        {invoice.invoiceNumber} · {invoice.clientName ?? "Client"}
                      </span>
                      <span className="tabular-nums">
                        {formatMoney(invoice.amount, invoice.currency)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-white">Accounts Payable</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Outstanding supplier invoices</dt>
                  <dd className="tabular-nums text-white">{formatMoney(overview.ap.outstanding)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Due this month</dt>
                  <dd className="tabular-nums text-white">{formatMoney(overview.ap.dueThisMonth)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Overdue</dt>
                  <dd className="tabular-nums text-white">{formatMoney(overview.ap.overdue)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Upcoming payments</dt>
                  <dd className="tabular-nums text-white">{formatMoney(overview.ap.upcoming)}</dd>
                </div>
              </dl>
              <div className="mt-4 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Recent supplier invoices
                </p>
                {overview.ap.recent.length === 0 ? (
                  <p className="text-xs text-white/40">None</p>
                ) : (
                  overview.ap.recent.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-2 text-xs text-white/70"
                    >
                      <span>
                        {row.supplier} · {row.description}
                      </span>
                      <span className="tabular-nums">
                        {formatMoney(row.amount, row.currency)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-white">Payroll</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Current payroll</dt>
                  <dd className="tabular-nums text-white">{formatMoney(overview.payroll.current)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Next payroll</dt>
                  <dd className="tabular-nums text-white">{formatMoney(overview.payroll.next)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Employees</dt>
                  <dd className="tabular-nums text-white">{overview.payroll.employees}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Annual payroll</dt>
                  <dd className="tabular-nums text-white">{formatMoney(overview.payroll.annual)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/50">Monthly payroll</dt>
                  <dd className="tabular-nums text-white">{formatMoney(overview.payroll.monthly)}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <EmptyChart label="payroll trend" />
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {(
              [
                ["Monthly Revenue", overview.charts.monthlyRevenue, "amount"],
                ["Monthly Outgoings", overview.charts.monthlyOutgoings, "amount"],
                ["Cash Position", overview.charts.cashPosition, "amount"],
              ] as const
            ).map(([title, data, key]) => (
              <section
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <div className="mt-4 h-52">
                  {data.length === 0 ? (
                    <EmptyChart label={title.toLowerCase()} />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey={key} stroke="#34d399" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </section>
            ))}

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-white">Monthly Profit & Loss</h3>
              <div className="mt-4 h-52">
                {overview.charts.monthlyProfitLoss.length === 0 ? (
                  <EmptyChart label="profit and loss" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.charts.monthlyProfitLoss}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="profit" fill="#34d399" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="loss" fill="#fb7185" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="text-sm font-semibold text-white">Recent Financial Activity</h3>
            <p className="mt-1 text-xs text-white/45">
              Invoice Created · Invoice Paid · Wise Payment Received · Expense Recorded · Journal Posted ·
              Refund — newest first.
            </p>
            {overview.activity.length === 0 ? (
              <p className="mt-4 text-sm text-white/45">No activity yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06]">
                {overview.activity.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-white/55">{item.description}</p>
                    </div>
                    <p className="shrink-0 text-xs text-white/40">
                      {new Date(item.at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
