"use client";

import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import DashboardTopTilesBar from "@/components/testflighthub/DashboardTopTilesBar";
import {
  CREDITORS_ACCOUNTS,
  CREDITORS_AGING_DATA,
  CREDITORS_KPIS,
  CREDITORS_MONTHLY_TREND,
  formatLedgerCurrency,
  formatLedgerDate,
  ledgerStatusClass,
  ledgerStatusLabel,
  type LedgerKpi,
} from "@/lib/financials-ledger-mock-data";
import {
  CREDITORS_DASHBOARD_TILES,
  DEFAULT_CREDITORS_TILE_LAYOUT,
} from "@/lib/view-dashboard-tile-catalogs";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function panelClassName() {
  return "rounded-2xl border border-white/10 bg-[#0a1422]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-5";
}

function KpiCard({ kpi }: { kpi: LedgerKpi }) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">{kpi.label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{kpi.value}</p>
      <p className="mt-2 text-xs text-white/45">{kpi.hint}</p>
    </article>
  );
}

export default function CreditorsWorkspace() {
  return (
    <div className="space-y-6">
      <DashboardTopTilesBar
        storageKey="unit311-creditors-dashboard-tiles"
        catalog={CREDITORS_DASHBOARD_TILES}
        defaultLayout={DEFAULT_CREDITORS_TILE_LAYOUT}
        title="Creditors key details"
        showCustomizeHint={false}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CREDITORS_KPIS.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={panelClassName()}>
          <h3 className="text-sm font-semibold text-white">Outstanding by ageing</h3>
          <p className="mt-1 text-xs text-white/45">Payables grouped by days until due (€k)</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CREDITORS_AGING_DATA} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                  tickFormatter={(value: number) => `€${value}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <ChartTooltip
                      active={active}
                      label={String(label ?? "")}
                      suffix="k"
                      payload={payload?.map((entry) => ({
                        name: String(entry.name ?? "Outstanding"),
                        value: entry.value as number,
                        color: String(entry.color ?? "#a78bfa"),
                      }))}
                    />
                  )}
                />
                <Bar dataKey="amount" name="Outstanding" radius={[6, 6, 0, 0]}>
                  {CREDITORS_AGING_DATA.map((entry) => (
                    <Cell key={entry.bucket} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={panelClassName()}>
          <h3 className="text-sm font-semibold text-white">Monthly payables trend</h3>
          <p className="mt-1 text-xs text-white/45">Outstanding vs settled (€k)</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CREDITORS_MONTHLY_TREND} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <ChartTooltip
                      active={active}
                      label={String(label ?? "")}
                      suffix="k"
                      payload={payload?.map((entry) => ({
                        name: String(entry.name ?? "Outstanding"),
                        value: entry.value as number,
                        color: String(entry.color ?? "#a78bfa"),
                      }))}
                    />
                  )}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }} />
                <Line
                  type="monotone"
                  dataKey="outstanding"
                  name="Outstanding"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="settled"
                  name="Settled"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className={panelClassName()}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Open creditor accounts</h3>
            <p className="mt-1 text-xs text-white/45">Suppliers with outstanding balances</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/45">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-violet-300" />
              Demo data
            </span>
            <span className="inline-flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-emerald-300" />
              Settlement run due Friday
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5">Reference</th>
                <th className="px-3 py-2.5">Outstanding</th>
                <th className="px-3 py-2.5">Due date</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {CREDITORS_ACCOUNTS.map((account) => (
                <tr key={account.id} className="border-b border-white/[0.05] last:border-0">
                  <td className="px-3 py-2.5 font-medium text-white/90">{account.name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-white/55">{account.reference}</td>
                  <td className="px-3 py-2.5 text-white/80">{formatLedgerCurrency(account.outstanding)}</td>
                  <td className="px-3 py-2.5 text-white/65">{formatLedgerDate(account.dueDate)}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                        ledgerStatusClass(account.status),
                      )}
                    >
                      {ledgerStatusLabel(account.status)}
                      {account.daysOverdue > 0 ? ` · ${account.daysOverdue}d` : ""}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
