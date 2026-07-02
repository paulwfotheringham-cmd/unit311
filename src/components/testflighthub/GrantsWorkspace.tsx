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
import { Landmark, LayoutGrid, Plus, TrendingUp, X } from "lucide-react";
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

type DashboardSection =
  | "kpis"
  | "pipelineChart"
  | "programmeChart"
  | "submissionsChart"
  | "applicationsTable";

const SECTION_LABELS: Record<DashboardSection, string> = {
  kpis: "KPI cards",
  pipelineChart: "Pipeline by status",
  programmeChart: "Funding by programme",
  submissionsChart: "Submissions vs approvals",
  applicationsTable: "Grant applications",
};

function inputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function createBlankGrantInput(): Omit<GrantApplication, "id"> {
  return {
    programme: "",
    funder: "",
    title: "",
    amountEur: 0,
    status: "Draft",
    owner: "Tom",
    submittedAt: null,
    deadline: new Date().toISOString().slice(0, 10),
    region: "",
    coFundingPct: 25,
  };
}

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
  const [grants, setGrants] = useState<GrantApplication[]>(() => [...GRANT_APPLICATIONS]);
  const [statusFilter, setStatusFilter] = useState<GrantStatus | "All">("All");
  const [showNewGrantModal, setShowNewGrantModal] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [newGrantDraft, setNewGrantDraft] = useState(createBlankGrantInput);
  const [visibleSections, setVisibleSections] = useState<Record<DashboardSection, boolean>>({
    kpis: true,
    pipelineChart: true,
    programmeChart: true,
    submissionsChart: true,
    applicationsTable: true,
  });

  const filteredGrants = useMemo(() => {
    if (statusFilter === "All") return grants;
    return grants.filter((grant) => grant.status === statusFilter);
  }, [grants, statusFilter]);

  const pipelineChartData = GRANTS_BY_STATUS.map((item) => ({
    name: item.status,
    applications: item.count,
    value: item.value / 1000,
  }));

  function toggleSection(section: DashboardSection) {
    setVisibleSections((current) => ({ ...current, [section]: !current[section] }));
  }

  function handleCreateGrant() {
    if (!newGrantDraft.title.trim() || !newGrantDraft.programme.trim()) return;

    const grant: GrantApplication = {
      ...newGrantDraft,
      id: `grant-${Date.now().toString(36)}`,
      title: newGrantDraft.title.trim(),
      programme: newGrantDraft.programme.trim(),
      funder: newGrantDraft.funder.trim() || newGrantDraft.programme.trim(),
      region: newGrantDraft.region.trim() || "EU",
    };

    setGrants((current) => [grant, ...current]);
    setNewGrantDraft(createBlankGrantInput());
    setShowNewGrantModal(false);
  }

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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomize((open) => !open)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
              showCustomize
                ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white/80",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Customize dashboard
          </button>
          <button
            type="button"
            onClick={() => setShowNewGrantModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
          >
            <Plus className="h-4 w-4" />
            New grant
          </button>
        </div>
      </header>

      {showCustomize && (
        <div className={panelClassName()}>
          <h3 className="text-sm font-semibold text-white">Visible sections</h3>
          <p className="mt-1 text-xs text-white/45">Choose which dashboard sections to show</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {(Object.keys(SECTION_LABELS) as DashboardSection[]).map((section) => (
              <label
                key={section}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70"
              >
                <input
                  type="checkbox"
                  checked={visibleSections[section]}
                  onChange={() => toggleSection(section)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-sky-500"
                />
                {SECTION_LABELS[section]}
              </label>
            ))}
          </div>
        </div>
      )}

      {visibleSections.kpis && (
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {GRANTS_KPIS.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
      )}

      {(visibleSections.pipelineChart || visibleSections.programmeChart) && (
      <div className="grid gap-4 xl:grid-cols-2">
        {visibleSections.pipelineChart && (
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
        )}

        {visibleSections.programmeChart && (
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
        )}
      </div>
      )}

      {visibleSections.submissionsChart && (
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
      )}

      {visibleSections.applicationsTable && (
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
      )}

      {showNewGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <section className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0b1524] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">New grant application</h3>
                <p className="mt-1 text-sm text-white/50">Add a grant to the local pipeline</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewGrantModal(false)}
                className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel>Title</FieldLabel>
                <input
                  value={newGrantDraft.title}
                  onChange={(event) =>
                    setNewGrantDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Application title"
                  className={inputClassName()}
                />
              </div>
              <div>
                <FieldLabel>Programme</FieldLabel>
                <input
                  value={newGrantDraft.programme}
                  onChange={(event) =>
                    setNewGrantDraft((current) => ({ ...current, programme: event.target.value }))
                  }
                  placeholder="Horizon Europe"
                  className={inputClassName()}
                />
              </div>
              <div>
                <FieldLabel>Amount (EUR)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  value={newGrantDraft.amountEur || ""}
                  onChange={(event) =>
                    setNewGrantDraft((current) => ({
                      ...current,
                      amountEur: Number(event.target.value) || 0,
                    }))
                  }
                  className={inputClassName()}
                />
              </div>
              <div>
                <FieldLabel>Region</FieldLabel>
                <input
                  value={newGrantDraft.region}
                  onChange={(event) =>
                    setNewGrantDraft((current) => ({ ...current, region: event.target.value }))
                  }
                  placeholder="EU, Spain, UK…"
                  className={inputClassName()}
                />
              </div>
              <div>
                <FieldLabel>Owner</FieldLabel>
                <input
                  value={newGrantDraft.owner}
                  onChange={(event) =>
                    setNewGrantDraft((current) => ({ ...current, owner: event.target.value }))
                  }
                  placeholder="Tom"
                  className={inputClassName()}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewGrantModal(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newGrantDraft.title.trim() || !newGrantDraft.programme.trim()}
                onClick={handleCreateGrant}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add grant
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
