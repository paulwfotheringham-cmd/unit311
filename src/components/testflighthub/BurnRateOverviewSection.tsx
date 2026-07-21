"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileSpreadsheet, Printer, Save, X } from "lucide-react";

import type { FinancialOverviewBurnRate } from "@/lib/accounting/types";
import {
  BURN_CATEGORIES,
  BURN_CATEGORY_LABELS,
  aggregateBurnSeries,
  computeBurnMetrics,
  defaultBurnFilters,
  filterBurnLines,
  formatBurnMoney,
  rollupBurnSeries,
  summarizeBurnDrilldown,
  type BurnRateFilters,
  type BurnRatePeriod,
} from "@/lib/accounting/burn-rate";
import { cn } from "@/lib/utils";

const PERIODS: Array<{ id: BurnRatePeriod; label: string }> = [
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "annual", label: "Annual" },
  { id: "historic", label: "Historic" },
];

const CATEGORY_COLORS: Record<string, string> = {
  total: "#34d399",
  payroll: "#60a5fa",
  contractors: "#a78bfa",
  software: "#22d3ee",
  office: "#fbbf24",
  marketing: "#fb7185",
  travel: "#c084fc",
  other: "#94a3b8",
};

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function selectClass() {
  return "h-9 w-full rounded-lg border border-white/10 bg-[#0a1422] px-2 text-xs text-white";
}

type BurnRateOverviewSectionProps = {
  burnRate: FinancialOverviewBurnRate;
  drillOpen: boolean;
  onDrillOpenChange: (open: boolean) => void;
};

export default function BurnRateOverviewSection({
  burnRate,
  drillOpen,
  onDrillOpenChange,
}: BurnRateOverviewSectionProps) {
  const [period, setPeriod] = useState<BurnRatePeriod>("monthly");
  const [filters, setFilters] = useState<BurnRateFilters>(() =>
    defaultBurnFilters(burnRate.lines),
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setFilters(defaultBurnFilters(burnRate.lines));
  }, [burnRate.lines]);

  const filteredLines = useMemo(
    () => filterBurnLines(burnRate.lines, filters),
    [burnRate.lines, filters],
  );

  const filteredSeries = useMemo(
    () => aggregateBurnSeries(filteredLines),
    [filteredLines],
  );

  const filteredMetrics = useMemo(
    () => computeBurnMetrics(filteredSeries, burnRate.cashBalance, burnRate.currency),
    [filteredSeries, burnRate.cashBalance, burnRate.currency],
  );

  const chartData = useMemo(
    () => rollupBurnSeries(filteredSeries, period),
    [filteredSeries, period],
  );

  const latestPoint = filteredSeries[filteredSeries.length - 1];
  const categoryTotals = BURN_CATEGORIES.map((category) => ({
    category,
    label: BURN_CATEGORY_LABELS[category],
    amount: latestPoint?.[category] ?? 0,
  }));

  const drilldown = useMemo(
    () => summarizeBurnDrilldown(filteredLines, burnRate.cashBalance),
    [filteredLines, burnRate.cashBalance],
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  function buildReportText() {
    const lines = [
      "Unit311 Central — Burn Rate Report",
      `Generated: ${new Date().toISOString()}`,
      `Source: ${burnRate.source === "live" ? "General Ledger" : "GL-derived demo"}`,
      "",
      `Monthly burn: ${formatBurnMoney(filteredMetrics.monthly, burnRate.currency)}`,
      `Quarterly burn: ${formatBurnMoney(filteredMetrics.quarterly, burnRate.currency)}`,
      `Annual burn: ${formatBurnMoney(filteredMetrics.annual, burnRate.currency)}`,
      `Trend: ${filteredMetrics.trend} (${filteredMetrics.changePct}%)`,
      `Forecast monthly: ${formatBurnMoney(filteredMetrics.forecastMonthly, burnRate.currency)}`,
      `Cash runway: ${filteredMetrics.runwayMonths ?? "—"} months`,
      "",
      "Operating expenses by category",
      ...drilldown.byCategory.map(
        (row) => `${row.label}: ${formatBurnMoney(row.amount, burnRate.currency)}`,
      ),
      "",
      "Top 10 expenses",
      ...drilldown.topExpenses.map(
        (row) =>
          `${row.date} | ${row.vendor} | ${row.description} | ${formatBurnMoney(row.amount, burnRate.currency)}`,
      ),
    ];
    return lines.join("\n");
  }

  function exportPdf() {
    downloadBlob(
      `burn-rate-report-${new Date().toISOString().slice(0, 10)}.pdf.txt`,
      buildReportText(),
      "application/pdf",
    );
    showToast("Burn rate PDF exported");
  }

  function exportExcel() {
    const header = [
      "Date",
      "Category",
      "Vendor",
      "Department",
      "Cost Centre",
      "Project",
      "Office",
      "Amount",
      "Description",
    ];
    const rows = filteredLines.map((line) =>
      [
        line.date,
        BURN_CATEGORY_LABELS[line.category],
        line.vendor,
        line.department,
        line.costCentre,
        line.project,
        line.office,
        line.amount,
        line.description,
      ].join("\t"),
    );
    downloadBlob(
      `burn-rate-ledger-${new Date().toISOString().slice(0, 10)}.xls`,
      [header.join("\t"), ...rows].join("\n"),
      "application/vnd.ms-excel",
    );
    showToast("Burn rate Excel exported");
  }

  function printReport() {
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!win) {
      showToast("Allow pop-ups to print");
      return;
    }
    win.document.write(
      `<pre style="font-family:ui-sans-serif,system-ui;white-space:pre-wrap;padding:24px">${buildReportText()
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")}</pre>`,
    );
    win.document.close();
    win.focus();
    win.print();
  }

  function saveReport() {
    const key = "unit311-burn-rate-saved-reports";
    const existing = (() => {
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as unknown[]) : [];
      } catch {
        return [];
      }
    })();
    const entry = {
      id: `burn-${Date.now()}`,
      savedAt: new Date().toISOString(),
      monthly: filteredMetrics.monthly,
      changePct: filteredMetrics.changePct,
      filters,
      preview: buildReportText().slice(0, 1200),
    };
    window.localStorage.setItem(key, JSON.stringify([entry, ...existing].slice(0, 20)));
    showToast("Burn rate report saved");
  }

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
              Burn Rate Analysis
            </p>
            <h3 className="mt-1 text-sm font-semibold text-white">Operating cost pace</h3>
            <p className="mt-1 text-xs text-white/45">
              {burnRate.source === "live"
                ? "Derived from posted General Ledger expense lines."
                : "Demo ledger derived from GL outgoings / operating cost model until expense journals are dense enough."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-[11px] font-semibold text-white/75"
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-[11px] font-semibold text-white/75"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={printReport}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-[11px] font-semibold text-white/75"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={saveReport}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 text-[11px] font-semibold text-emerald-100"
            >
              <Save className="h-3.5 w-3.5" />
              Save Report
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1 text-[10px] uppercase tracking-[0.12em] text-white/40">
            Date from
            <input
              type="date"
              className={selectClass()}
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </label>
          <label className="space-y-1 text-[10px] uppercase tracking-[0.12em] text-white/40">
            Date to
            <input
              type="date"
              className={selectClass()}
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </label>
          <label className="space-y-1 text-[10px] uppercase tracking-[0.12em] text-white/40">
            Department
            <select
              className={selectClass()}
              value={filters.department}
              onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
            >
              <option value="all">All</option>
              {burnRate.filterOptions.departments.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-[10px] uppercase tracking-[0.12em] text-white/40">
            Cost centre
            <select
              className={selectClass()}
              value={filters.costCentre}
              onChange={(e) => setFilters((f) => ({ ...f, costCentre: e.target.value }))}
            >
              <option value="all">All</option>
              {burnRate.filterOptions.costCentres.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-[10px] uppercase tracking-[0.12em] text-white/40">
            Project
            <select
              className={selectClass()}
              value={filters.project}
              onChange={(e) => setFilters((f) => ({ ...f, project: e.target.value }))}
            >
              <option value="all">All</option>
              {burnRate.filterOptions.projects.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-[10px] uppercase tracking-[0.12em] text-white/40 sm:col-span-2 xl:col-span-1">
            Office location
            <select
              className={selectClass()}
              value={filters.office}
              onChange={(e) => setFilters((f) => ({ ...f, office: e.target.value }))}
            >
              <option value="all">All</option>
              {burnRate.filterOptions.offices.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                period === item.id
                  ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                  : "border-white/10 text-white/55 hover:text-white",
              )}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onDrillOpenChange(true)}
            className="ml-auto rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold text-white/70 hover:text-white"
          >
            Open drill-down
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="h-64">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/40">
                No burn rate data for these filters
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                  />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#0a1422",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total Operating Costs"
                    stroke={CATEGORY_COLORS.total}
                    strokeWidth={2.5}
                    dot={false}
                  />
                  {BURN_CATEGORIES.map((category) => (
                    <Line
                      key={category}
                      type="monotone"
                      dataKey={category}
                      name={BURN_CATEGORY_LABELS[category]}
                      stroke={CATEGORY_COLORS[category]}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <dl className="space-y-2 rounded-xl border border-white/10 bg-[#0a1422]/50 p-3 text-xs">
            <div className="flex justify-between gap-2 border-b border-white/[0.06] pb-2">
              <dt className="text-white/45">Total Operating Costs</dt>
              <dd className="font-semibold tabular-nums text-white">
                {formatBurnMoney(latestPoint?.total ?? 0, burnRate.currency)}
              </dd>
            </div>
            {categoryTotals.map((row) => (
              <div key={row.category} className="flex justify-between gap-2">
                <dt className="text-white/45">{row.label}</dt>
                <dd className="tabular-nums text-white/85">
                  {formatBurnMoney(row.amount, burnRate.currency)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {drillOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/55 p-3 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a1422] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
                  Burn Rate Detail
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">Operating spend drill-down</h3>
              </div>
              <button
                type="button"
                onClick={() => onDrillOpenChange(false)}
                className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    ["Forecast Burn", formatBurnMoney(drilldown.forecastBurn, burnRate.currency)],
                    [
                      "Cash Runway",
                      drilldown.runwayMonths == null
                        ? "—"
                        : `${drilldown.runwayMonths} months`,
                    ],
                    ["Payroll %", `${drilldown.payrollPct}%`],
                    ["Non-payroll %", `${drilldown.nonPayrollPct}%`],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>

              <section>
                <h4 className="text-sm font-semibold text-white">Operating Expenses by Category</h4>
                <ul className="mt-3 space-y-2">
                  {drilldown.byCategory.map((row) => (
                    <li
                      key={row.category}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] px-3 py-2 text-sm"
                    >
                      <span className="text-white/70">{row.label}</span>
                      <span className="tabular-nums text-white">
                        {formatBurnMoney(row.amount, burnRate.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h4 className="text-sm font-semibold text-white">Top 10 Expenses</h4>
                <ul className="mt-3 divide-y divide-white/[0.06] rounded-xl border border-white/10">
                  {drilldown.topExpenses.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-start justify-between gap-3 px-3 py-2.5 text-xs"
                    >
                      <div>
                        <p className="font-medium text-white">{row.vendor}</p>
                        <p className="text-white/45">
                          {row.date} · {row.description}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums text-white">
                        {formatBurnMoney(row.amount, burnRate.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="grid gap-4 lg:grid-cols-3">
                {(
                  [
                    ["Monthly Trend", drilldown.monthlyTrend],
                    ["Quarterly Trend", drilldown.quarterlyTrend],
                    ["Yearly Trend", drilldown.yearlyTrend],
                  ] as const
                ).map(([title, data]) => (
                  <section
                    key={title}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <h4 className="text-xs font-semibold text-white">{title}</h4>
                    <div className="mt-2 h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                          <XAxis
                            dataKey="period"
                            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }}
                          />
                          <YAxis hide />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="total"
                            stroke="#34d399"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section>
                  <h4 className="text-sm font-semibold text-white">Largest Cost Centres</h4>
                  <ul className="mt-3 space-y-2 text-sm">
                    {drilldown.largestCostCentres.map((row) => (
                      <li key={row.name} className="flex justify-between gap-3 text-white/75">
                        <span>{row.name}</span>
                        <span className="tabular-nums text-white">
                          {formatBurnMoney(row.amount, burnRate.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h4 className="text-sm font-semibold text-white">Largest Vendors</h4>
                  <ul className="mt-3 space-y-2 text-sm">
                    {drilldown.largestVendors.map((row) => (
                      <li key={row.name} className="flex justify-between gap-3 text-white/75">
                        <span>{row.name}</span>
                        <span className="tabular-nums text-white">
                          {formatBurnMoney(row.amount, burnRate.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[60] rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-50 shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}
