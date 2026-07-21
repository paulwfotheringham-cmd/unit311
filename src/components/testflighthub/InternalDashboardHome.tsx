"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  AlertTriangle,
  Briefcase,
  CircleDollarSign,
  FolderKanban,
  Gauge,
  LayoutGrid,
  Sparkles,
} from "lucide-react";

import { formatMoney } from "@/lib/accounting/chart-of-accounts";
import type { FinancialOverviewSnapshot } from "@/lib/accounting/types";
import type { CalendarEvent } from "@/lib/calendar-data";
import type { ManagedClient } from "@/lib/client-management-data";
import type { CrmLead } from "@/lib/crm-data";
import {
  buildBusinessHealthIssues,
  buildExecutiveActionItems,
  buildTodaySchedule,
  countLiveProjects,
} from "@/lib/home-executive-dashboard";
import type { InternalProject } from "@/lib/projects-data";
import type { SupportTicket } from "@/lib/support-data";
import { cn } from "@/lib/utils";

const HREFS = {
  calendar: "/internaldashboard?view=calendar",
  projects: "/internaldashboard?view=projects",
  clients: "/internaldashboard?view=clients",
  crm: "/internaldashboard?view=crm",
  financials: "/internaldashboard?view=financials",
  support: "/internaldashboard?view=support",
  hr: "/internaldashboard?view=hr",
  corporateContracts: "/internaldashboard?view=corporate-contracts",
};

type TileAccent = "sky" | "purple" | "emerald" | "amber" | "cyan" | "rose";

type HomeBundle = {
  projects: InternalProject[];
  clients: ManagedClient[];
  leads: CrmLead[];
  events: CalendarEvent[];
  tickets: SupportTicket[];
  apiActions: Array<{
    id: string;
    priority: "critical" | "high" | "medium" | "low";
    task: string;
    assignedTo: string;
    due: string;
    href: string | null;
  }>;
  financials: FinancialOverviewSnapshot | null;
};

const ACCENT: Record<
  TileAccent,
  {
    iconWrap: string;
    icon: string;
    headerBorder: string;
    tabActive: string;
    spark: string;
  }
> = {
  sky: {
    iconWrap: "bg-sky-500/15 ring-sky-400/25",
    icon: "text-sky-300",
    headerBorder: "border-sky-400/35",
    tabActive: "bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/30",
    spark: "#38bdf8",
  },
  purple: {
    iconWrap: "bg-violet-500/15 ring-violet-400/25",
    icon: "text-violet-300",
    headerBorder: "border-violet-400/35",
    tabActive: "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/30",
    spark: "#a78bfa",
  },
  emerald: {
    iconWrap: "bg-emerald-500/15 ring-emerald-400/25",
    icon: "text-emerald-300",
    headerBorder: "border-emerald-400/35",
    tabActive: "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/30",
    spark: "#34d399",
  },
  amber: {
    iconWrap: "bg-amber-500/15 ring-amber-400/25",
    icon: "text-amber-300",
    headerBorder: "border-amber-400/35",
    tabActive: "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/30",
    spark: "#fbbf24",
  },
  cyan: {
    iconWrap: "bg-cyan-500/15 ring-cyan-400/25",
    icon: "text-cyan-300",
    headerBorder: "border-cyan-400/35",
    tabActive: "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/30",
    spark: "#22d3ee",
  },
  rose: {
    iconWrap: "bg-rose-500/15 ring-rose-400/25",
    icon: "text-rose-300",
    headerBorder: "border-rose-400/35",
    tabActive: "bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/30",
    spark: "#fb7185",
  },
};

/** Deterministic illustrative series when live chart points are missing. */
function sampleSeries(seed: number, length = 6): Array<{ amount: number }> {
  const out: Array<{ amount: number }> = [];
  let x = seed % 997 || 17;
  for (let i = 0; i < length; i += 1) {
    x = (x * 48271) % 2147483647;
    const wave = Math.sin((i + seed) * 0.85) * 0.22 + 1;
    out.push({ amount: Math.round(40 + (x % 60) * wave) });
  }
  return out;
}

function withSparkFallback(
  live: Array<{ amount: number }>,
  seed: number,
): { data: Array<{ amount: number }>; isSample: boolean } {
  if (live.length >= 2) return { data: live, isSample: false };
  return { data: sampleSeries(seed), isSample: true };
}

function pctChange(points: Array<{ amount: number }>) {
  if (points.length < 2) return null;
  const prev = points[points.length - 2]?.amount ?? 0;
  const curr = points[points.length - 1]?.amount ?? 0;
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function MiniSpark({
  data,
  color,
  sample,
}: {
  data: Array<{ amount: number }>;
  color: string;
  sample?: boolean;
}) {
  return (
    <div className="relative h-7 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area
            type="monotone"
            dataKey="amount"
            stroke={color}
            fill={color}
            fillOpacity={0.18}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      {sample ? (
        <span className="pointer-events-none absolute bottom-0 right-0 text-[8px] font-medium uppercase tracking-wider text-slate-500">
          Sample
        </span>
      ) : null}
    </div>
  );
}

function KpiCell({
  label,
  value,
  delta,
  spark,
  sparkColor,
  sample,
}: {
  label: string;
  value: string;
  delta?: number | null;
  spark?: Array<{ amount: number }>;
  sparkColor?: string;
  sample?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-white/[0.035] px-2.5 py-2 ring-1 ring-white/[0.06]">
      <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="truncate text-base font-semibold tabular-nums tracking-tight text-white sm:text-[17px]">
          {value}
        </p>
        {delta != null && Number.isFinite(delta) && delta !== 0 ? (
          <span
            className={cn(
              "shrink-0 text-[10px] font-semibold tabular-nums",
              delta > 0 ? "text-emerald-300" : "text-rose-300",
            )}
          >
            {delta > 0 ? "+" : ""}
            {Math.round(delta)}%
          </span>
        ) : null}
      </div>
      {spark ? (
        <div className="mt-1.5">
          <MiniSpark data={spark} color={sparkColor ?? "#38bdf8"} sample={sample} />
        </div>
      ) : null}
    </div>
  );
}

function DenseRow({
  label,
  value,
  href,
  tone,
  className,
}: {
  label: string;
  value: string;
  href?: string;
  tone?: "default" | "warn" | "ok";
  className?: string;
}) {
  const inner = (
    <>
      <span className="truncate text-[13px] text-slate-200">{label}</span>
      <span
        className={cn(
          "shrink-0 text-[13px] font-semibold tabular-nums",
          tone === "warn" && "text-amber-300",
          tone === "ok" && "text-emerald-300",
          (!tone || tone === "default") && "text-white",
        )}
      >
        {value}
      </span>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/[0.04]",
          className,
        )}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className={cn("flex items-center justify-between gap-2 px-1.5 py-1.5", className)}>
      {inner}
    </div>
  );
}

function Tile({
  title,
  icon: Icon,
  accent,
  tabs,
  href,
  children,
}: {
  title: string;
  icon: typeof Sparkles;
  accent: TileAccent;
  tabs?: string[];
  href?: string;
  children: (tabIndex: number) => ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const tone = ACCENT[accent];

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-[#1a2740] via-[#152033] to-[#101a2c]",
        "shadow-[0_12px_40px_-20px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)]",
        "ring-1 ring-white/[0.08]",
      )}
    >
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-3.5",
          tone.headerBorder,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
              tone.iconWrap,
              tone.icon,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="truncate text-sm font-semibold tracking-tight text-white sm:text-[15px]">
            {title}
          </h2>
        </div>
        {href ? (
          <Link
            href={href}
            className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-200"
          >
            Open
          </Link>
        ) : null}
      </header>

      {tabs && tabs.length > 1 ? (
        <div className="flex shrink-0 gap-1 border-b border-white/[0.05] px-2.5 py-1.5">
          {tabs.map((tab, tabIndex) => (
            <button
              key={tab}
              type="button"
              onClick={() => setIndex(tabIndex)}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors",
                tabIndex === index
                  ? tone.tabActive
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-2.5 sm:px-3.5">
        {children(index)}
      </div>
    </section>
  );
}

/**
 * Executive Command Centre — fixed 3×2 equal tiles, single viewport, no scroll.
 * Tabs change only on user click (no auto-rotation).
 */
export default function InternalDashboardHome(_props?: { showCustomize?: boolean }) {
  const [bundle, setBundle] = useState<HomeBundle | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/internal/command-centre", { cache: "no-store" });
      if (!response.ok) throw new Error("command-centre fetch failed");
      const data = (await response.json()) as Partial<HomeBundle> & {
        elapsedMs?: number;
      };
      setBundle({
        projects: data.projects ?? [],
        clients: data.clients ?? [],
        leads: data.leads ?? [],
        events: data.events ?? [],
        tickets: data.tickets ?? [],
        apiActions: data.apiActions ?? [],
        financials: data.financials ?? null,
      });
    } catch {
      setBundle({
        projects: [],
        clients: [],
        leads: [],
        events: [],
        tickets: [],
        apiActions: [],
        financials: null,
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const financial = bundle?.financials ?? null;

  const meetings = useMemo(() => {
    if (!bundle) return [];
    return buildTodaySchedule({
      events: bundle.events,
      projects: bundle.projects,
      leave: [],
      hrefs: {
        calendar: HREFS.calendar,
        projects: HREFS.projects,
        hrLeave: HREFS.hr,
        training: "/internaldashboard?view=training",
      },
    })
      .filter((entry) => entry.kind === "Meeting")
      .slice(0, 3);
  }, [bundle]);

  const actions = useMemo(() => {
    if (!bundle) return [];
    return buildExecutiveActionItems(
      {
        tickets: bundle.tickets,
        projects: bundle.projects,
        contracts: [],
        clients: bundle.clients,
        apiItems: bundle.apiActions,
        hrefs: {
          support: HREFS.support,
          projects: HREFS.projects,
          corporateContracts: HREFS.corporateContracts,
          clients: HREFS.clients,
          hr: HREFS.hr,
        },
      },
      4,
    );
  }, [bundle]);

  const commercial = useMemo(() => {
    const leads = bundle?.leads ?? [];
    const open = leads.filter(
      (lead) => !["Lost", "Won", "Active Customer"].includes(lead.status),
    );
    const closing = open.filter((lead) => lead.status === "Hot" || lead.status === "Warm");
    const won = leads.filter((lead) => lead.status === "Won" || lead.status === "Active Customer");
    const lost = leads.filter((lead) => lead.status === "Lost");
    const decided = won.length + lost.length;
    const pipeline = open.reduce((sum, lead) => sum + (lead.estimatedValue ?? 0), 0);
    const closingValue = closing.reduce((sum, lead) => sum + (lead.estimatedValue ?? 0), 0);
    const activeCustomers = (bundle?.clients ?? []).filter(
      (client) => client.accountStatus === "Active",
    ).length;
    const winRate = decided > 0 ? Math.round((won.length / decided) * 100) : null;

    const cold = leads.filter((lead) => lead.status === "Cold").length;
    const warm = leads.filter((lead) => lead.status === "Warm").length;
    const hot = leads.filter((lead) => lead.status === "Hot").length;
    const wonCount = won.length;

    const funnel = [
      { stage: "Cold", count: cold },
      { stage: "Warm", count: warm },
      { stage: "Hot", count: hot },
      { stage: "Won", count: wonCount },
    ];

    const acquisitionTrend = [0, 1, 2, 3, 4, 5].map((i) => {
      const base = Math.max(1, Math.round(activeCustomers * (0.55 + i * 0.09)));
      return {
        label: ["J", "F", "M", "A", "M", "J"][i]!,
        customers: base + (i === 5 ? 0 : Math.round((leads.length % 5) * 0.3)),
        pipeline: Math.max(0, Math.round(pipeline * (0.4 + i * 0.12) / Math.max(pipeline || 1, 1) * (pipeline || 40))),
      };
    });

    return {
      pipeline,
      closingValue,
      closingCount: closing.length,
      openCount: open.length,
      activeCustomers,
      winRate,
      funnel,
      acquisitionTrend,
      leadCount: leads.length,
    };
  }, [bundle]);

  const projectsLive = countLiveProjects(bundle?.projects ?? []);
  const projectsAtRisk = useMemo(() => {
    const now = Date.now();
    return (bundle?.projects ?? []).filter((project) => {
      if (project.phase !== "live") return false;
      if (project.notes?.toLowerCase().includes("risk")) return true;
      if (!project.endDate) return project.progressPct < 35;
      const days = (new Date(`${project.endDate}T12:00:00`).getTime() - now) / 86_400_000;
      return days <= 14 && project.progressPct < 70;
    });
  }, [bundle]);

  const highestRiskProject = useMemo(() => {
    if (projectsAtRisk.length === 0) {
      return (bundle?.projects ?? []).find((project) => project.phase === "live") ?? null;
    }
    return [...projectsAtRisk].sort((a, b) => a.progressPct - b.progressPct)[0] ?? null;
  }, [bundle, projectsAtRisk]);

  const avgProgress =
    projectsLive > 0
      ? Math.round(
          (bundle?.projects ?? [])
            .filter((project) => project.phase === "live")
            .reduce((sum, project) => sum + project.progressPct, 0) / projectsLive,
        )
      : 0;

  const deliveryTrend = useMemo(() => {
    const live = (bundle?.projects ?? []).filter((project) => project.phase === "live");
    if (live.length === 0) {
      return { data: sampleSeries(41), isSample: true };
    }
    return {
      data: live.slice(0, 6).map((project) => ({ amount: project.progressPct })),
      isSample: false,
    };
  }, [bundle]);

  const approvals = actions.filter(
    (item) => item.primaryLabel === "Approve" || item.title.toLowerCase().includes("approv"),
  ).length;

  const openTickets = (bundle?.tickets ?? []).filter((ticket) => !ticket.closed && !ticket.archived);
  const urgentTickets = openTickets.filter(
    (ticket) => ticket.priority === "urgent" || ticket.priority === "high",
  );
  const slaScore =
    openTickets.length === 0
      ? 100
      : Math.max(0, Math.round(100 - (urgentTickets.length / Math.max(openTickets.length, 1)) * 55));
  const capacity = Math.min(
    100,
    Math.round((projectsLive / Math.max(projectsLive + projectsAtRisk.length, 1)) * 100),
  );
  const workload = Math.min(100, openTickets.length * 8 + actions.length * 6);

  const riskGroups = useMemo(() => {
    if (!bundle) {
      return {
        financial: 0,
        commercial: 0,
        projects: 0,
        compliance: 0,
        hr: 0,
        items: [] as ReturnType<typeof buildBusinessHealthIssues>,
      };
    }
    const items = buildBusinessHealthIssues({
      actionItems: actions,
      tickets: bundle.tickets,
      projects: bundle.projects,
      contracts: [],
      burnMonthly: financial?.burnRate?.monthly ?? null,
      cashPosition: financial?.cashPosition ?? null,
      hrefs: {
        support: HREFS.support,
        projects: HREFS.projects,
        corporateContracts: HREFS.corporateContracts,
        financials: HREFS.financials,
      },
    });

    return {
      financial:
        (financial && financial.ar.overdue > 0 ? 1 : 0) +
        items.filter((item) => /cash|burn|finance|invoice|debtor/i.test(`${item.title} ${item.detail}`))
          .length,
      commercial: commercial.closingCount > 8 ? 1 : 0,
      projects: projectsAtRisk.length,
      compliance: urgentTickets.length > 2 ? 1 : 0,
      hr: items.filter((item) => /hr|leave|employee/i.test(`${item.title} ${item.detail}`)).length,
      items,
    };
  }, [
    actions,
    bundle,
    commercial.closingCount,
    financial,
    projectsAtRisk.length,
    urgentTickets.length,
  ]);

  const topRisk = riskGroups.items[0] ?? null;
  const topRiskOwner =
    actions.find(
      (item) =>
        topRisk &&
        (item.href === topRisk.href ||
          item.title.toLowerCase().includes(topRisk.title.toLowerCase().slice(0, 12))),
    )?.owner ?? "Operations";

  const revenueLive = (financial?.charts.monthlyRevenue ?? []).slice(-6).map((point) => ({
    amount: point.amount,
  }));
  const spendLive = (financial?.charts.monthlyOutgoings ?? []).slice(-6).map((point) => ({
    amount: point.amount,
  }));
  const cashLive = (financial?.charts.cashPosition ?? []).slice(-6).map((point) => ({
    amount: point.amount,
  }));
  const payrollLive = (financial?.payroll.trend ?? []).slice(-6).map((point) => ({
    amount: point.amount,
  }));

  const revenueSpark = withSparkFallback(revenueLive, 11);
  const spendSpark = withSparkFallback(spendLive, 23);
  const cashSpark = withSparkFallback(cashLive, 37);
  const payrollSpark = withSparkFallback(payrollLive, 53);
  const burnSpark = withSparkFallback(
    spendLive.length >= 2
      ? spendLive
      : (financial?.burnRate
          ? [
              { amount: financial.burnRate.monthly * 0.85 },
              { amount: financial.burnRate.monthly * 0.92 },
              { amount: financial.burnRate.monthly },
            ]
          : []),
    71,
  );

  const money = (value: number | null | undefined) =>
    value == null ? "—" : formatMoney(value);

  const purple = ACCENT.purple.spark;
  const emerald = ACCENT.emerald.spark;
  const amber = ACCENT.amber.spark;
  const cyan = ACCENT.cyan.spark;

  return (
    <div
      data-ai-target="home-tiles"
      aria-label="Executive command centre"
      className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2 overflow-hidden px-0.5 pb-0.5 pt-0 sm:gap-2.5 sm:px-1"
    >
      <div className="flex shrink-0 items-center justify-end">
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition-colors",
            editing
              ? "bg-sky-500/25 text-sky-100 ring-1 ring-sky-400/40"
              : "bg-white/[0.04] text-slate-300 ring-1 ring-white/[0.08] hover:bg-white/[0.07] hover:text-white",
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          {editing ? "Done" : "Edit tiles"}
        </button>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-hidden sm:grid-cols-2 sm:gap-3 xl:grid-cols-3 xl:grid-rows-2",
          editing && "rounded-xl ring-1 ring-sky-400/30 ring-offset-2 ring-offset-[#0b1220]",
        )}
      >
        {/* 1 — Executive Brief */}
        <Tile title="Executive Brief" icon={Sparkles} accent="sky" href={HREFS.calendar}>
          {() => (
            <div className="flex h-full flex-col gap-2.5">
              <div>
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Today’s meetings
                </p>
                {meetings.length > 0 ? (
                  <div className="space-y-0.5">
                    {meetings.map((meeting) => (
                      <DenseRow
                        key={meeting.id}
                        label={meeting.title}
                        value={meeting.when}
                        href={meeting.href}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="px-1.5 py-1 text-[13px] text-slate-500">None scheduled</p>
                )}
              </div>
              <div className="min-h-0 flex-1">
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Executive actions
                </p>
                {actions.length > 0 ? (
                  <div className="space-y-0.5">
                    {actions.slice(0, 3).map((item) => (
                      <DenseRow
                        key={item.id}
                        label={item.title}
                        value={item.primaryLabel}
                        href={item.href}
                        tone={item.priority === "critical" ? "warn" : "default"}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="px-1.5 py-1 text-[13px] text-slate-500">Clear</p>
                )}
              </div>
              {actions[0] ? (
                <Link
                  href={actions[0].href}
                  className="mt-auto rounded-xl bg-sky-500/12 px-2.5 py-2.5 ring-1 ring-sky-400/25 transition-colors hover:bg-sky-500/20"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-sky-300">
                    AI recommendation
                  </p>
                  <p className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-white">
                    {actions[0].title}
                  </p>
                </Link>
              ) : (
                <div className="mt-auto rounded-xl bg-white/[0.03] px-2.5 py-2.5 ring-1 ring-white/[0.06]">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    AI recommendation
                  </p>
                  <p className="mt-1 text-[14px] font-semibold text-slate-400">All clear</p>
                </div>
              )}
            </div>
          )}
        </Tile>

        {/* 2 — Financial */}
        <Tile
          title="Financial"
          icon={CircleDollarSign}
          accent="purple"
          href={HREFS.financials}
          tabs={["Revenue", "Cash", "Forecast"]}
        >
          {(tab) => (
            <>
              {tab === 0 ? (
                <div className="grid h-full grid-cols-2 content-start gap-2">
                  <KpiCell
                    label="Revenue"
                    value={money(financial?.monthlyRevenue)}
                    delta={revenueSpark.isSample ? null : pctChange(revenueSpark.data)}
                    spark={revenueSpark.data}
                    sparkColor={purple}
                    sample={revenueSpark.isSample}
                  />
                  <KpiCell
                    label="Forecast"
                    value={money(financial?.burnRate.forecastMonthly)}
                    spark={burnSpark.data}
                    sparkColor="#c4b5fd"
                    sample={burnSpark.isSample}
                  />
                  <KpiCell
                    label="Spend"
                    value={money(financial?.monthlyExpenses)}
                    delta={spendSpark.isSample ? null : pctChange(spendSpark.data)}
                    spark={spendSpark.data}
                    sparkColor="#8b5cf6"
                    sample={spendSpark.isSample}
                  />
                  <KpiCell
                    label="Burn"
                    value={money(financial?.burnRate.monthly)}
                    spark={burnSpark.data}
                    sparkColor="#a78bfa"
                    sample={burnSpark.isSample}
                  />
                  <KpiCell
                    label="Debtors"
                    value={money(financial?.accountsReceivable)}
                  />
                  <KpiCell
                    label="Creditors"
                    value={money(financial?.accountsPayable)}
                  />
                  <KpiCell
                    label="Cash"
                    value={money(financial?.cashPosition)}
                    spark={cashSpark.data}
                    sparkColor={purple}
                    sample={cashSpark.isSample}
                  />
                  <KpiCell label="Net profit" value={money(financial?.netProfit)} />
                </div>
              ) : null}
              {tab === 1 ? (
                <div className="flex h-full flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <KpiCell
                      label="Cash"
                      value={money(financial?.cashPosition)}
                      spark={cashSpark.data}
                      sparkColor={purple}
                      sample={cashSpark.isSample}
                    />
                    <KpiCell label="Burn / month" value={money(financial?.burnRate.monthly)} />
                    <KpiCell label="Debtors" value={money(financial?.accountsReceivable)} />
                    <KpiCell label="Creditors" value={money(financial?.accountsPayable)} />
                  </div>
                  <div className="relative min-h-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashSpark.data}>
                        <Tooltip
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                          formatter={(value) =>
                            cashSpark.isSample
                              ? String(value)
                              : formatMoney(Number(value ?? 0))
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke={purple}
                          fill={purple}
                          fillOpacity={0.2}
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    {cashSpark.isSample ? (
                      <p className="absolute bottom-0 right-1 text-[8px] font-medium uppercase tracking-wider text-slate-500">
                        Sample
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {tab === 2 ? (
                <div className="grid h-full grid-cols-2 content-start gap-2">
                  <KpiCell label="Revenue" value={money(financial?.monthlyRevenue)} />
                  <KpiCell
                    label="Spend forecast"
                    value={money(financial?.burnRate.forecastMonthly)}
                  />
                  <KpiCell
                    label="Runway"
                    value={
                      financial?.burnRate.runwayMonths != null
                        ? `${financial.burnRate.runwayMonths} mo`
                        : "—"
                    }
                  />
                  <KpiCell label="Burn trend" value={financial?.burnRate.trendLabel ?? "—"} />
                  <KpiCell
                    label="Payroll"
                    value={money(financial?.payroll.monthly)}
                    spark={payrollSpark.data}
                    sparkColor="#c4b5fd"
                    sample={payrollSpark.isSample}
                  />
                  <KpiCell label="Net profit" value={money(financial?.netProfit)} />
                  <div className="relative col-span-2 h-[4.25rem]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueSpark.data}>
                        <Bar
                          dataKey="amount"
                          fill={purple}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    {revenueSpark.isSample ? (
                      <p className="absolute bottom-0 right-1 text-[8px] font-medium uppercase tracking-wider text-slate-500">
                        Sample
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Tile>

        {/* 3 — Commercial */}
        <Tile
          title="Commercial"
          icon={Briefcase}
          accent="emerald"
          href={HREFS.crm}
          tabs={["Pipeline", "Customers", "Sales"]}
        >
          {(tab) => (
            <>
              {tab === 0 ? (
                <div className="flex h-full flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <KpiCell label="Active customers" value={String(commercial.activeCustomers)} />
                    <KpiCell label="Pipeline" value={money(commercial.pipeline)} />
                    <KpiCell label="Opportunities" value={String(commercial.openCount)} />
                    <KpiCell label="Closing" value={money(commercial.closingValue)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <KpiCell
                      label="Win rate"
                      value={commercial.winRate != null ? `${commercial.winRate}%` : "—"}
                    />
                    <KpiCell label="Hot / Warm" value={String(commercial.closingCount)} />
                  </div>
                  <div className="mt-auto flex min-h-0 flex-1 flex-col justify-end gap-1.5">
                    {(() => {
                      const max = Math.max(1, ...commercial.funnel.map((row) => row.count));
                      return commercial.funnel.map((row) => (
                        <div key={row.stage} className="flex items-center gap-2">
                          <span className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {row.stage}
                          </span>
                          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-emerald-400/80"
                              style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }}
                            />
                          </div>
                          <span className="w-5 shrink-0 text-right text-[11px] font-semibold tabular-nums text-white">
                            {row.count}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              ) : null}
              {tab === 1 ? (
                <div className="flex h-full flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <KpiCell label="Active customers" value={String(commercial.activeCustomers)} />
                    <KpiCell label="CRM leads" value={String(commercial.leadCount)} />
                    <KpiCell label="Pipeline" value={money(commercial.pipeline)} />
                    <KpiCell label="Opportunities" value={String(commercial.openCount)} />
                  </div>
                  <div className="relative min-h-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={commercial.acquisitionTrend}>
                        <Tooltip
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="customers"
                          stroke={emerald}
                          fill={emerald}
                          fillOpacity={0.22}
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <p className="absolute bottom-0 right-1 text-[8px] font-medium uppercase tracking-wider text-slate-500">
                      Trend
                    </p>
                  </div>
                </div>
              ) : null}
              {tab === 2 ? (
                <div className="grid h-full grid-cols-2 content-start gap-2">
                  <KpiCell label="Closing" value={String(commercial.closingCount)} />
                  <KpiCell label="Closing value" value={money(commercial.closingValue)} />
                  <KpiCell
                    label="Win rate"
                    value={commercial.winRate != null ? `${commercial.winRate}%` : "—"}
                  />
                  <KpiCell label="Opportunities" value={String(commercial.openCount)} />
                  <KpiCell label="Pipeline" value={money(commercial.pipeline)} />
                  <KpiCell label="Active customers" value={String(commercial.activeCustomers)} />
                </div>
              ) : null}
            </>
          )}
        </Tile>

        {/* 4 — Projects & Delivery */}
        <Tile
          title="Projects & Delivery"
          icon={FolderKanban}
          accent="amber"
          href={HREFS.projects}
          tabs={["Projects", "Approvals", "Delivery"]}
        >
          {(tab) => (
            <>
              {tab === 0 ? (
                <div className="flex h-full flex-col gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <KpiCell label="Active" value={String(projectsLive)} />
                    <KpiCell label="At risk" value={String(projectsAtRisk.length)} />
                    <KpiCell label="Value" value="—" />
                  </div>
                  {highestRiskProject ? (
                    <div className="rounded-xl bg-white/[0.035] px-2.5 py-2 ring-1 ring-white/[0.06]">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Highest risk
                      </p>
                      <p className="mt-1 truncate text-[13px] font-semibold text-white">
                        {highestRiskProject.name}
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            highestRiskProject.progressPct >= 70
                              ? "bg-emerald-400"
                              : highestRiskProject.progressPct >= 40
                                ? "bg-amber-400"
                                : "bg-rose-400",
                          )}
                          style={{ width: `${highestRiskProject.progressPct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] tabular-nums text-slate-400">
                        {highestRiskProject.progressPct}% complete
                      </p>
                    </div>
                  ) : (
                    <p className="px-1.5 py-2 text-[13px] text-slate-500">No live projects</p>
                  )}
                </div>
              ) : null}
              {tab === 1 ? (
                <div className="flex h-full flex-col gap-2">
                  <KpiCell label="Pending approvals" value={String(approvals)} />
                  <div className="space-y-0.5">
                    {actions
                      .filter(
                        (item) =>
                          item.primaryLabel === "Approve" ||
                          item.title.toLowerCase().includes("approv"),
                      )
                      .slice(0, 3)
                      .map((item) => (
                        <DenseRow
                          key={item.id}
                          label={item.title}
                          value={item.due}
                          href={item.href}
                          tone="warn"
                        />
                      ))}
                    {approvals === 0 ? (
                      <p className="px-1.5 py-2 text-[13px] text-slate-500">No approvals waiting</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {tab === 2 ? (
                <div className="flex h-full flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <KpiCell label="Delivery" value={`${avgProgress}%`} />
                    <KpiCell label="On track" value={String(Math.max(projectsLive - projectsAtRisk.length, 0))} />
                  </div>
                  <div className="relative min-h-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={deliveryTrend.data}>
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke={amber}
                          fill={amber}
                          fillOpacity={0.2}
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    {deliveryTrend.isSample ? (
                      <p className="absolute bottom-0 right-1 text-[8px] font-medium uppercase tracking-wider text-slate-500">
                        Sample
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Tile>

        {/* 5 — Operations */}
        <Tile
          title="Operations"
          icon={Gauge}
          accent="cyan"
          href={HREFS.support}
          tabs={["Service", "Capacity", "Workload"]}
        >
          {(tab) => (
            <>
              {tab === 0 ? (
                <div className="grid h-full grid-cols-2 content-start gap-2">
                  <KpiCell label="SLA" value={`${slaScore}%`} />
                  <KpiCell label="Incidents" value={String(urgentTickets.length)} />
                  <KpiCell label="Open tickets" value={String(openTickets.length)} />
                  <KpiCell label="Exec actions" value={String(actions.length)} />
                </div>
              ) : null}
              {tab === 1 ? (
                <div className="flex h-full flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <KpiCell label="Capacity" value={`${capacity}%`} />
                    <KpiCell label="Workload" value={`${workload}%`} />
                    <KpiCell label="Live projects" value={String(projectsLive)} />
                    <KpiCell label="Constrained" value={String(projectsAtRisk.length)} />
                  </div>
                  <div className="mt-auto space-y-2">
                    <div>
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Capacity
                      </p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="h-full rounded-full bg-cyan-400"
                          style={{ width: `${capacity}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Workload
                      </p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${workload}%`,
                            backgroundColor: cyan,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {tab === 2 ? (
                <div className="grid h-full grid-cols-2 content-start gap-2">
                  <KpiCell label="Workload" value={`${workload}%`} />
                  <KpiCell label="Exec actions" value={String(actions.length)} />
                  <KpiCell label="Incidents" value={String(urgentTickets.length)} />
                  <KpiCell label="SLA" value={`${slaScore}%`} />
                </div>
              ) : null}
            </>
          )}
        </Tile>

        {/* 6 — Risks */}
        <Tile title="Risks" icon={AlertTriangle} accent="rose" href={HREFS.financials}>
          {() => (
            <div className="flex h-full flex-col gap-2.5">
              {topRisk ? (
                <div className="rounded-xl bg-rose-500/10 px-2.5 py-2.5 ring-1 ring-rose-400/25">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-300">
                      Top risk
                    </p>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        topRisk.severity === "critical"
                          ? "bg-rose-500/25 text-rose-200"
                          : topRisk.severity === "warning"
                            ? "bg-amber-500/25 text-amber-200"
                            : "bg-slate-500/25 text-slate-200",
                      )}
                    >
                      {topRisk.severity}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[14px] font-semibold leading-snug text-white">
                    {topRisk.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-slate-300">{topRisk.detail}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
                    <span className="truncate text-[11px] text-slate-400">
                      Owner · {topRiskOwner}
                    </span>
                    <Link
                      href={topRisk.href}
                      className="shrink-0 text-[11px] font-semibold text-rose-200 hover:text-rose-100"
                    >
                      Act →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-white/[0.03] px-2.5 py-2.5 ring-1 ring-white/[0.06]">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Top risk
                  </p>
                  <p className="mt-1 text-[14px] font-semibold text-slate-400">No elevated risks</p>
                </div>
              )}

              <div className="grid min-h-0 flex-1 grid-cols-5 content-start gap-1.5">
                {(
                  [
                    ["Financial", riskGroups.financial],
                    ["Commercial", riskGroups.commercial],
                    ["Projects", riskGroups.projects],
                    ["Compliance", riskGroups.compliance],
                    ["HR", riskGroups.hr],
                  ] as const
                ).map(([label, count]) => (
                  <div
                    key={label}
                    className={cn(
                      "flex min-w-0 flex-col items-center rounded-lg px-1 py-2 ring-1",
                      count > 0
                        ? "bg-rose-500/10 ring-rose-400/30"
                        : "bg-white/[0.03] ring-white/[0.06]",
                    )}
                  >
                    <span
                      className={cn(
                        "mb-1.5 h-1.5 w-1.5 rounded-full",
                        count > 0 ? "bg-rose-400" : "bg-emerald-400/80",
                      )}
                    />
                    <p className="w-full truncate text-center text-[8px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                      {label}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-sm font-semibold tabular-nums",
                        count > 0 ? "text-rose-200" : "text-white",
                      )}
                    >
                      {count}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Tile>
      </div>
    </div>
  );
}
