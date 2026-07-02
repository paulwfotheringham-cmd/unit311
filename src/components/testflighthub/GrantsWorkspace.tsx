"use client";

import { useMemo, useState } from "react";

import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import {
  GRANT_APPLICATIONS,
  GRANTS_BY_PROGRAMME,
  GRANTS_BY_STATUS,
  GRANTS_KPIS,
  GRANTS_MONTHLY_SUBMISSIONS,
  formatGrantAmount,
  grantStatusClass,
  type GrantApplication,
  type GrantStatus,
} from "@/lib/grants-data";
import { cn } from "@/lib/utils";
import { Landmark, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_FILTER_OPTIONS: Array<GrantStatus | "All"> = [
  "All",
  "Draft",
  "Submitted",
  "Under Review",
  "Approved",
  "Rejected",
  "Disbursed",
];

const PIE_COLORS = ["#94a3b8", "#38bdf8", "#fbbf24", "#34d399", "#f87171", "#a78bfa"];

function panelClassName() {
  return "rounded-2xl border border-white/10 bg-[#0a1422]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-5";
}

function KpiCard({ kpi }: { kpi: (typeof GRANTS_KPIS)[number] }) {
  const TrendIcon = TrendingUp;

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
        {kpi.label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{kpi.value}</p>
      <div className="mt-2 flex items-center gap-1.5">
        {kpi.trend === "up" && <TrendIcon className="h-3.5 w-3.5 text-emerald-400" />}
        <span
          className={cn(
            "text-xs font-medium",
            kpi.trend === "up"
              ? "text-emerald-300"
              : "text-white/50",
          )}
        >
          {kpi.change}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-white/40">{kpi.hint}</p>
    </article>
  );
}

function GrantRow({ grant }: { grant: GrantApplication }) {
  return (
    <tr className="border-b border-white/[0.06] last:border-0">
      <td className="py-2.5 pr-3">
        <p className="text-sm font-medium text-white/90">{grant.title}</p>
        <p className="mt-0.5 text-xs text-white/45">
          {grant.programme} · {grant.funder}
        </p>
      </td>
      <td className="hidden py-2.5 pr-3 text-sm text-white/60 md:table-cell">{grant.region}</td>
      <td className="py-2.5 pr-3 text-sm tabular-nums text-white/75">
        {formatGrantAmount(grant.amountEur)}
      </td>
      <td className="hidden py-2.5 pr-3 text-sm text-white/55 sm:table-cell">{grant.owner}</td>
      <td className="py-2.5 pr-3">
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            grantStatusClass(grant.status),
          )}
        >
          {grant.status}
        </span>
      </td>
      <td className="hidden py-2.5 text-sm text-white/45 lg:table-cell">{grant.deadline}</td>
    </tr>
  );
}

function GrantCard({ grant }: { grant: GrantApplication }) {
  return (
    <article className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium leading-snug text-white/90">{grant.title}</p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide",
            grantStatusClass(grant.status),
          )}
        >
          {grant.status}
        </span>
      </div>
      <p className="mt-1 text-xs text-white/45">
        {grant.programme} · {grant.funder}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
        <span className="tabular-nums text-white/75">{formatGrantAmount(grant.amountEur)}</span>
        <span>{grant.owner}</span>
        <span>{grant.region}</span>
        <span>Due {grant.deadline}</span>
      </div>
    </article>
  );
}

export default function GrantsWorkspace() {
  const [statusFilter, setStatusFilter] = useState<GrantStatus | "All">("All");

  const filteredGrants = useMemo(() => {
    if (statusFilter === "All") return GRANT_APPLICATIONS;
    return GRANT_APPLICATIONS.filter((grant) => grant.status === statusFilter);
  }, [statusFilter]);

  const pipelineChartData = GRANTS_BY_STATUS.map((item) => ({
    name: item.status,
    applications: item.count,
    value: item.value / 1000,
  }));

  return (
    <section className="min-w-0 space-y-4 sm:space-y-5" aria-label="Grants workspace">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-[#60a5fa]">
            <Landmark className="h-4 w-4 shrink-0" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Business Central</p>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl md:text-2xl">Grants</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/50">
            Track funding programmes, application pipeline, approval rates, and disbursement status
            across EU, national, and regional schemes.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {GRANTS_KPIS.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className={panelClassName()}>
          <h3 className="text-sm font-semibold text-white">Pipeline by status</h3>
          <p className="mt-1 text-xs text-white/45">Application count and value (€k) by stage</p>
          <div className="mt-4 h-52 min-h-[13rem] sm:h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={pipelineChartData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }} />
                <Bar dataKey="applications" name="Applications" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="value" name="Value (€k)" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={panelClassName()}>
          <h3 className="text-sm font-semibold text-white">Funding by programme</h3>
          <p className="mt-1 text-xs text-white/45">Approved and in-flight awards by scheme</p>
          <div className="mt-4 h-52 min-h-[13rem] sm:h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={GRANTS_BY_PROGRAMME}
                  dataKey="amount"
                  nameKey="programme"
                  cx="50%"
                  cy="50%"
                  innerRadius="42%"
                  outerRadius="72%"
                  paddingAngle={2}
                >
                  {GRANTS_BY_PROGRAMME.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={panelClassName()}>
        <h3 className="text-sm font-semibold text-white">Submissions vs approvals</h3>
        <p className="mt-1 text-xs text-white/45">Monthly grant activity — last 6 months</p>
        <div className="mt-4 h-48 min-h-[12rem] sm:h-56">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={GRANTS_MONTHLY_SUBMISSIONS} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }} />
              <Line
                type="monotone"
                dataKey="submitted"
                name="Submitted"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="approved"
                name="Approved"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={panelClassName()}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Grant applications</h3>
            <p className="mt-1 text-xs text-white/45">{filteredGrants.length} records</p>
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {STATUS_FILTER_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatusFilter(option)}
                className={cn(
                  "shrink-0 touch-manipulation rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors sm:py-1",
                  statusFilter === option
                    ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                    : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white/75",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[42rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">
                <th className="pb-2 pr-3 font-medium">Application</th>
                <th className="hidden pb-2 pr-3 font-medium md:table-cell">Region</th>
                <th className="pb-2 pr-3 font-medium">Amount</th>
                <th className="hidden pb-2 pr-3 font-medium sm:table-cell">Owner</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="hidden pb-2 font-medium lg:table-cell">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {filteredGrants.map((grant) => (
                <GrantRow key={grant.id} grant={grant} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 space-y-2.5 md:hidden">
          {filteredGrants.map((grant) => (
            <GrantCard key={`${grant.id}-mobile`} grant={grant} />
          ))}
        </div>
      </div>
    </section>
  );
}
