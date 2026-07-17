"use client";

import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import {
  formatTreasuryMoney,
  treasuryPanelClassName,
} from "@/components/treasury/treasury-ui";
import type { TreasuryAnalytics } from "@/lib/treasury/treasury-types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TreasuryAnalyticsPageProps = {
  analytics: TreasuryAnalytics;
};

const CHART_COLORS = {
  incoming: "#34d399",
  outgoing: "#fb7185",
  net: "#38bdf8",
  gbp: "#34d399",
  usd: "#38bdf8",
  eur: "#a78bfa",
  fees: "#fbbf24",
};

export default function TreasuryAnalyticsPage({ analytics }: TreasuryAnalyticsPageProps) {
  const balanceHistory = analytics.balanceHistory.map((entry) => ({
    ...entry,
    label: entry.date.slice(5),
  }));

  const incomingVsOutgoing = analytics.incomingVsOutgoing.map((entry) => ({
    ...entry,
    label: entry.month.slice(5),
  }));

  const monthlyCashFlow = analytics.monthlyCashFlow.map((entry) => ({
    ...entry,
    label: entry.month.slice(5),
  }));

  const feesByMonth = analytics.feesByMonth.map((entry) => ({
    ...entry,
    label: entry.month.slice(5),
  }));

  return (
    <div className="space-y-4">
      <section className={treasuryPanelClassName()}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
          Insights
        </p>
        <h2 className="mt-0.5 text-lg font-semibold text-white">Treasury analytics</h2>
        <p className="mt-1 text-sm text-white/55">
          Balance trends, cash flow, and transfer volume across currencies.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={treasuryPanelClassName()}>
          <h3 className="text-base font-semibold text-white">Balance history</h3>
          <p className="mt-1 text-xs text-white/45">Running balances by currency (last 30 days)</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceHistory}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                <Tooltip content={<ChartTooltip suffix="" />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
                <Line type="monotone" dataKey="GBP" stroke={CHART_COLORS.gbp} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="USD" stroke={CHART_COLORS.usd} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="EUR" stroke={CHART_COLORS.eur} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={treasuryPanelClassName()}>
          <h3 className="text-base font-semibold text-white">Incoming vs outgoing</h3>
          <p className="mt-1 text-xs text-white/45">Monthly volume (GBP equivalent)</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomingVsOutgoing}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                <Tooltip content={<ChartTooltip suffix="" />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
                <Bar dataKey="incoming" fill={CHART_COLORS.incoming} radius={[4, 4, 0, 0]} />
                <Bar dataKey="outgoing" fill={CHART_COLORS.outgoing} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={treasuryPanelClassName()}>
          <h3 className="text-base font-semibold text-white">Monthly net cash flow</h3>
          <p className="mt-1 text-xs text-white/45">Net position by month (GBP equivalent)</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCashFlow}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                <Tooltip content={<ChartTooltip suffix="" />} />
                <Bar dataKey="net" fill={CHART_COLORS.net} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={treasuryPanelClassName()}>
          <h3 className="text-base font-semibold text-white">Fees by month</h3>
          <p className="mt-1 text-xs text-white/45">Total Wise fees (GBP equivalent)</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={feesByMonth}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                <Tooltip content={<ChartTooltip suffix="" />} />
                <Line
                  type="monotone"
                  dataKey="fees"
                  stroke={CHART_COLORS.fees}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_COLORS.fees }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className={treasuryPanelClassName()}>
        <h3 className="text-base font-semibold text-white">Transfers by currency</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-white/45">
              <tr>
                <th className="pb-2 font-medium">Currency</th>
                <th className="pb-2 font-medium">Count</th>
                <th className="pb-2 font-medium">Volume</th>
              </tr>
            </thead>
            <tbody>
              {analytics.transfersByCurrency.map((row) => (
                <tr key={row.currency} className="border-t border-white/[0.06]">
                  <td className="py-2.5 font-medium text-white">{row.currency}</td>
                  <td className="py-2.5 text-white/70">{row.count}</td>
                  <td className="py-2.5 tabular-nums text-white/90">
                    {formatTreasuryMoney(row.volume, row.currency)}
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
