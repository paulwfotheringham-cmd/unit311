"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import {
  FINANCIAL_KPIS,
  MONTHLY_REVENUE_DATA,
  PIPELINE_BY_REGION_DATA,
  PROFIT_LOSS_DATA,
  REVENUE_BY_SERVICE_DATA,
} from "@/lib/financials-mock-data";
import { formatSalary, type HrEmployee } from "@/lib/hr-data";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  LayoutGrid,
  LineChart as LineChartIcon,
  Plus,
  Table2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
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

type CustomTileType = "kpi" | "bar" | "line" | "table";

type CustomFinancialTile = {
  id: string;
  title: string;
  type: CustomTileType;
};

const BANK_BALANCES = [
  { bank: "Barclays", currency: "GBP", balance: 284_350.42, accountRef: "****4821" },
  { bank: "Caixa", currency: "EUR", balance: 512_890.0, accountRef: "****7734" },
  { bank: "Santander", currency: "EUR", balance: 198_420.75, accountRef: "****1190" },
  { bank: "HSBC", currency: "USD", balance: 156_200.0, accountRef: "****3305" },
] as const;

function formatBankBalance(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function panelClassName() {
  return "rounded-2xl border border-white/10 bg-[#0a1422]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-5";
}

function KpiCard({ kpi }: { kpi: (typeof FINANCIAL_KPIS)[number] }) {
  const TrendIcon = kpi.trend === "down" ? TrendingDown : TrendingUp;

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
        {kpi.label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{kpi.value}</p>
      <div className="mt-2 flex items-center gap-1.5">
        {kpi.trend !== "neutral" && (
          <TrendIcon
            className={cn(
              "h-3.5 w-3.5",
              kpi.trend === "up" ? "text-emerald-400" : "text-rose-400",
            )}
          />
        )}
        <span
          className={cn(
            "text-xs font-medium",
            kpi.trend === "up"
              ? "text-emerald-300"
              : kpi.trend === "down"
                ? "text-rose-300"
                : "text-white/50",
          )}
        >
          {kpi.change}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-white/35">{kpi.hint}</p>
    </article>
  );
}

function CustomTileCard({ tile }: { tile: CustomFinancialTile }) {
  const icon =
    tile.type === "kpi" ? (
      <LayoutGrid className="h-4 w-4 text-sky-300" />
    ) : tile.type === "bar" ? (
      <BarChart3 className="h-4 w-4 text-violet-300" />
    ) : tile.type === "line" ? (
      <LineChartIcon className="h-4 w-4 text-emerald-300" />
    ) : (
      <Table2 className="h-4 w-4 text-amber-300" />
    );

  return (
    <article className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-semibold text-white">{tile.title}</p>
      </div>
      <p className="mt-3 text-xs text-white/45">
        Custom {tile.type} report — connect data source to populate this tile.
      </p>
      <div className="mt-4 h-24 rounded-lg border border-white/10 bg-[#07111f]/80" />
    </article>
  );
}

function groupSalariesByDepartment(employees: HrEmployee[]) {
  const totals = new Map<string, number>();

  for (const employee of employees) {
    const key = employee.department || "Unassigned";
    totals.set(key, (totals.get(key) ?? 0) + employee.salaryCurrent + employee.bonus);
  }

  return [...totals.entries()]
    .map(([department, total]) => ({
      department,
      total: Math.round(total / 1000),
    }))
    .sort((a, b) => b.total - a.total);
}

export default function FinancialsWorkspace() {
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [salariesLoading, setSalariesLoading] = useState(true);
  const [customTiles, setCustomTiles] = useState<CustomFinancialTile[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTileTitle, setNewTileTitle] = useState("");
  const [newTileType, setNewTileType] = useState<CustomTileType>("kpi");

  const loadSalaries = useCallback(async () => {
    setSalariesLoading(true);
    try {
      const response = await fetch("/api/hr/employees", { cache: "no-store" });
      const data = (await response.json()) as { employees?: HrEmployee[] };
      if (response.ok && data.employees) {
        setEmployees(data.employees);
      }
    } catch {
      setEmployees([]);
    } finally {
      setSalariesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSalaries();
  }, [loadSalaries]);

  const salaryStats = useMemo(() => {
    const annualPayroll = employees.reduce(
      (sum, employee) => sum + employee.salaryCurrent + employee.bonus,
      0,
    );
    const monthlyPayroll = Math.round(annualPayroll / 12);
    const averageSalary = employees.length
      ? Math.round(annualPayroll / employees.length)
      : 0;

    return { annualPayroll, monthlyPayroll, averageSalary, headcount: employees.length };
  }, [employees]);

  const salaryByDepartment = useMemo(() => groupSalariesByDepartment(employees), [employees]);

  function handleCreateTile() {
    const title = newTileTitle.trim();
    if (!title) return;

    setCustomTiles((current) => [
      ...current,
      {
        id: `tile-${Date.now().toString(36)}`,
        title,
        type: newTileType,
      },
    ]);
    setNewTileTitle("");
    setNewTileType("kpi");
    setShowCreateModal(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10">
            <Wallet className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
              Finance
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">Financials</h2>
            <p className="mt-1 text-sm text-white/55">
              Revenue, payroll, pipeline, and P&amp;L — with HR salary data.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-200 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
          >
            <Plus className="h-3.5 w-3.5" />
            New tile / report
          </button>
          <span className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
            Preview data only
          </span>
        </div>
      </div>

      <section className={panelClassName()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Bank balances</h3>
            <p className="mt-1 text-xs text-white/45">
              Cash positions across operating accounts — mock preview data
            </p>
          </div>
          <span className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-200">
            Live sync preview
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {BANK_BALANCES.map((account) => (
            <article
              key={`${account.bank}-${account.currency}`}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white">{account.bank}</p>
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-medium text-white/55">
                  {account.currency}
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-white">
                {formatBankBalance(account.balance, account.currency)}
              </p>
              <p className="mt-2 text-[11px] text-white/40">Account {account.accountRef}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {FINANCIAL_KPIS.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {customTiles.length > 0 && (
        <section className={panelClassName()}>
          <h3 className="text-base font-semibold text-white">Custom reports</h3>
          <p className="mt-1 text-xs text-white/45">Tiles you have added to this dashboard</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {customTiles.map((tile) => (
              <CustomTileCard key={tile.id} tile={tile} />
            ))}
          </div>
        </section>
      )}

      <section className={panelClassName()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Salaries</h3>
            <p className="mt-1 text-xs text-white/45">
              Annual compensation from HR records — base salary plus bonus
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSalaries()}
            className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55 hover:bg-white/5"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
              Annual payroll
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {salariesLoading ? "…" : formatSalary(salaryStats.annualPayroll)}
            </p>
            <p className="mt-2 text-[11px] text-white/35">{salaryStats.headcount} staff on record</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
              Monthly payroll
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {salariesLoading ? "…" : formatSalary(salaryStats.monthlyPayroll)}
            </p>
            <p className="mt-2 text-[11px] text-white/35">Average across the year</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
              Average package
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {salariesLoading ? "…" : formatSalary(salaryStats.averageSalary)}
            </p>
            <p className="mt-2 text-[11px] text-white/35">Salary + bonus per employee</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
              Payroll vs revenue
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {salariesLoading || salaryStats.annualPayroll === 0
                ? "…"
                : `${Math.round((salaryStats.annualPayroll / 1_860_000) * 100)}%`}
            </p>
            <p className="mt-2 text-[11px] text-white/35">Of YTD revenue (mock €1.86M)</p>
          </article>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="h-[260px] w-full min-w-0">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-white/45">
              Payroll by department (€ thousands)
            </p>
            {salariesLoading ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-white/40">
                Loading salary data…
              </div>
            ) : salaryByDepartment.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-white/40">
                No HR salary data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryByDepartment} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    tickFormatter={(value) => `€${value}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="department"
                    axisLine={false}
                    tickLine={false}
                    width={96}
                    tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => (
                      <ChartTooltip
                        active={active}
                        label={String(label ?? "")}
                        suffix="k"
                        payload={payload?.map(() => ({
                          name: "Payroll",
                          value: payload?.[0]?.value as number,
                          color: "#c4b5fd",
                        }))}
                      />
                    )}
                  />
                  <Bar dataKey="total" fill="#c4b5fd" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-white/45">
              Staff salaries
            </p>
            <div className="max-h-[260px] overflow-y-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0a1422] text-[10px] uppercase tracking-[0.12em] text-white/40">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium text-right">Salary</th>
                    <th className="px-3 py-2 font-medium text-right">Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {salariesLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-white/40">
                        Loading…
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-white/40">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id} className="border-t border-white/5 text-white/75">
                        <td className="px-3 py-2.5 font-medium text-white">{employee.fullName}</td>
                        <td className="px-3 py-2.5 text-white/50">{employee.role || "—"}</td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          {formatSalary(employee.salaryCurrent)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-300/90">
                          {employee.bonus > 0 ? formatSalary(employee.bonus) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={panelClassName()}>
          <h3 className="text-base font-semibold text-white">Monthly revenue</h3>
          <p className="mt-1 text-xs text-white/45">Recognised revenue vs target (€ thousands)</p>
          <div className="mt-4 h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...MONTHLY_REVENUE_DATA]}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                  tickFormatter={(value) => `€${value}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <ChartTooltip
                      active={active}
                      label={String(label ?? "")}
                      suffix="k"
                      payload={payload?.map((entry) => ({
                        name: entry.name === "revenue" ? "Revenue" : "Target",
                        value: entry.value as number,
                        color: entry.name === "revenue" ? "#38bdf8" : "#94a3b8",
                      }))}
                    />
                  )}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}
                  formatter={(value) => (value === "revenue" ? "Revenue" : "Target")}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#38bdf8" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={panelClassName()}>
          <h3 className="text-base font-semibold text-white">Profit &amp; loss</h3>
          <p className="mt-1 text-xs text-white/45">Monthly revenue, direct costs, and net profit (€ thousands)</p>
          <div className="mt-4 h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...PROFIT_LOSS_DATA]} barGap={4}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                  tickFormatter={(value) => `€${value}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <ChartTooltip
                      active={active}
                      label={String(label ?? "")}
                      suffix="k"
                      payload={payload?.map((entry) => ({
                        name:
                          entry.dataKey === "revenue"
                            ? "Revenue"
                            : entry.dataKey === "costs"
                              ? "Costs"
                              : "Profit",
                        value: entry.value as number,
                        color:
                          entry.dataKey === "revenue"
                            ? "#38bdf8"
                            : entry.dataKey === "costs"
                              ? "#f87171"
                              : "#34d399",
                      }))}
                    />
                  )}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}
                  formatter={(value) =>
                    value === "revenue" ? "Revenue" : value === "costs" ? "Costs" : "Profit"
                  }
                />
                <Bar dataKey="revenue" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="costs" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="profit" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className={panelClassName()}>
          <h3 className="text-base font-semibold text-white">Pipeline by region</h3>
          <p className="mt-1 text-xs text-white/45">Forecast contract value (€ thousands)</p>
          <div className="mt-4 h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...PIPELINE_BY_REGION_DATA]} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                  tickFormatter={(value) => `€${value}k`}
                />
                <YAxis
                  type="category"
                  dataKey="region"
                  axisLine={false}
                  tickLine={false}
                  width={72}
                  tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <ChartTooltip
                      active={active}
                      label={String(label ?? "")}
                      suffix="k"
                      payload={payload?.map(() => ({
                        name: "Pipeline",
                        value: payload?.[0]?.value as number,
                        color: "#a78bfa",
                      }))}
                    />
                  )}
                />
                <Bar dataKey="value" fill="#a78bfa" radius={[0, 4, 4, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={panelClassName()}>
          <h3 className="text-base font-semibold text-white">Revenue mix</h3>
          <p className="mt-1 text-xs text-white/45">Share of YTD revenue by service line</p>
          <div className="mt-4 h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[...REVENUE_BY_SERVICE_DATA]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {REVENUE_BY_SERVICE_DATA.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => (
                    <ChartTooltip
                      active={active}
                      label={String(payload?.[0]?.name ?? "")}
                      suffix="%"
                      payload={payload?.map((entry) => ({
                        name: "Share",
                        value: entry.value as number,
                        color: (entry.payload as { color: string }).color,
                      }))}
                    />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {REVENUE_BY_SERVICE_DATA.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs text-white/55">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span>{entry.name}</span>
                <span className="ml-auto font-mono text-white/75">{entry.value}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0b1524] p-5 shadow-2xl sm:p-6">
            <h3 className="text-lg font-semibold text-white">New tile / report</h3>
            <p className="mt-1 text-sm text-white/50">
              Add a custom report tile to this financial dashboard.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  Report name
                </label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  value={newTileTitle}
                  placeholder="e.g. Q3 cash flow"
                  onChange={(event) => setNewTileTitle(event.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  Report type
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none focus:border-sky-400/50"
                  value={newTileType}
                  onChange={(event) => setNewTileType(event.target.value as CustomTileType)}
                >
                  <option value="kpi">KPI summary</option>
                  <option value="bar">Bar chart</option>
                  <option value="line">Line chart</option>
                  <option value="table">Data table</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newTileTitle.trim()}
                onClick={handleCreateTile}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add tile
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
