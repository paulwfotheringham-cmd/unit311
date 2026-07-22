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
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

import { formatMoney } from "@/lib/accounting/chart-of-accounts";
import type { FinancialOverviewSnapshot } from "@/lib/accounting/types";
import type { CalendarEvent } from "@/lib/calendar-data";
import type { ManagedClient } from "@/lib/client-management-data";
import {
  COMMAND_CENTRE_HOME_TILE_CATALOG,
  DEFAULT_COMMAND_CENTRE_HOME_LAYOUT,
  loadCommandCentreHomeLayout,
  saveCommandCentreHomeLayout,
  type CommandCentreHomeTileId,
} from "@/lib/command-centre-home-tiles";
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

/** Live spark only — no fabricated series. */
function liveSpark(points: Array<{ amount: number }>): Array<{ amount: number }> | undefined {
  return points.length >= 2 ? points : undefined;
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
}: {
  data: Array<{ amount: number }>;
  color: string;
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
    </div>
  );
}

function ProfessionalEmpty({
  children = "Historical financial trends will appear automatically as financial transactions are recorded.",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[3.5rem] items-center justify-center rounded-xl bg-white/[0.025] px-3 py-3 ring-1 ring-white/[0.05]">
      <p className="text-center text-[12px] leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}

/** Cascading opportunity funnel — stage width encodes volume. */
function OpportunityFunnel({
  stages,
}: {
  stages: Array<{ stage: string; count: number }>;
}) {
  const max = Math.max(1, ...stages.map((row) => row.count));
  const total = stages.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) {
    return (
      <ProfessionalEmpty>
        Pipeline stages will appear as opportunities are added to CRM.
      </ProfessionalEmpty>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end gap-1">
      {stages.map((row, index) => {
        const widthPct = Math.max(28, (row.count / max) * 100);
        const opacity = 0.95 - index * 0.12;
        return (
          <div key={row.stage} className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {row.stage}
            </span>
            <div className="flex min-w-0 flex-1 justify-center">
              <div
                className="flex h-6 items-center justify-between rounded-md px-2.5"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: `rgba(52, 211, 153, ${opacity})`,
                }}
              >
                <span className="truncate text-[10px] font-semibold text-emerald-950/80">
                  {row.stage}
                </span>
                <span className="text-[11px] font-bold tabular-nums text-emerald-950">
                  {row.count}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Portfolio health as a single stacked bar + legend. */
function ProjectHealthStrip({
  rows,
}: {
  rows: Array<{ label: string; count: number; tone: "ok" | "warn" | "neutral" }>;
}) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) {
    return (
      <ProfessionalEmpty>
        Project health will appear once delivery programmes are underway.
      </ProfessionalEmpty>
    );
  }

  const toneClass = {
    ok: "bg-emerald-400",
    warn: "bg-rose-400",
    neutral: "bg-amber-300/90",
  } as const;

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end gap-4 pt-1">
      <div className="flex h-5 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.06]">
        {rows.map((row) =>
          row.count > 0 ? (
            <div
              key={row.label}
              className={cn("h-full", toneClass[row.tone])}
              style={{ width: `${(row.count / total) * 100}%` }}
              title={`${row.label}: ${row.count}`}
            />
          ) : null,
        )}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg bg-white/[0.035] px-2 py-2.5 text-center ring-1 ring-white/[0.06]"
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {row.label}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-white">{row.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCell({
  label,
  value,
  delta,
  spark,
  sparkColor,
}: {
  label: string;
  value: string;
  delta?: number | null;
  spark?: Array<{ amount: number }>;
  sparkColor?: string;
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
          <MiniSpark data={spark} color={sparkColor ?? "#38bdf8"} />
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
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-[#223352] via-[#1c2a42] to-[#162338]",
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
 * Executive Command Centre — configurable equal tiles with customise controls.
 */
export default function InternalDashboardHome(props?: { showCustomize?: boolean }) {
  const showCustomize = props?.showCustomize !== false;
  const [bundle, setBundle] = useState<HomeBundle | null>(null);
  const [layout, setLayout] = useState<CommandCentreHomeTileId[]>([
    ...DEFAULT_COMMAND_CENTRE_HOME_LAYOUT,
  ]);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [layoutHydrated, setLayoutHydrated] = useState(false);

  useEffect(() => {
    setLayout(loadCommandCentreHomeLayout());
    setLayoutHydrated(true);
  }, []);

  useEffect(() => {
    if (!layoutHydrated) return;
    saveCommandCentreHomeLayout(layout);
  }, [layout, layoutHydrated]);

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

    const clients = bundle?.clients ?? [];
    const segments = [
      {
        label: "Active",
        count: clients.filter((client) => client.accountStatus === "Active").length,
      },
      {
        label: "Onboarding",
        count: clients.filter((client) =>
          ["Client Created", "Workspace Provisioned", "Onboarding"].includes(client.accountStatus),
        ).length,
      },
      {
        label: "Dormant",
        count: clients.filter((client) => client.accountStatus === "Dormant").length,
      },
      {
        label: "Archived",
        count: clients.filter((client) => client.accountStatus === "Archived").length,
      },
    ];
    const inactiveCustomers = segments
      .filter((row) => row.label !== "Active")
      .reduce((sum, row) => sum + row.count, 0);

    return {
      pipeline,
      closingValue,
      closingCount: closing.length,
      openCount: open.length,
      activeCustomers,
      inactiveCustomers,
      winRate,
      funnel,
      segments,
      leadCount: leads.length,
      customerTotal: clients.length,
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

  const avgProgress =
    projectsLive > 0
      ? Math.round(
          (bundle?.projects ?? [])
            .filter((project) => project.phase === "live")
            .reduce((sum, project) => sum + project.progressPct, 0) / projectsLive,
        )
      : 0;

  const projectHealth = useMemo(() => {
    const projects = bundle?.projects ?? [];
    const onTrack = Math.max(projectsLive - projectsAtRisk.length, 0);
    const upcoming = projects.filter((project) => project.phase === "upcoming").length;
    return [
      { label: "On track", count: onTrack, tone: "ok" as const },
      { label: "At risk", count: projectsAtRisk.length, tone: "warn" as const },
      { label: "Upcoming", count: upcoming, tone: "neutral" as const },
    ];
  }, [bundle, projectsAtRisk.length, projectsLive]);

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

  const revenueSpark = liveSpark(revenueLive);
  const spendSpark = liveSpark(spendLive);
  const cashSpark = liveSpark(cashLive);
  const payrollSpark = liveSpark(payrollLive);
  const burnSpark = liveSpark(spendLive);

  /** Always show a GBP amount — finance empty state is £0.00, never em dash. */
  const money = (value: number | null | undefined) => formatMoney(value ?? 0, "GBP");

  const burnPerMonth = (value: number | null | undefined) => {
    const formatted = money(value);
    return formatted.endsWith("/month") ? formatted : `${formatted}/month`;
  };

  const hasTrendHistory = Boolean(
    cashSpark || revenueSpark || spendSpark || (financial?.charts.cashPosition.length ?? 0) >= 2,
  );

  const runwayLabel =
    financial?.burnRate.runwayMonths != null
      ? `${financial.burnRate.runwayMonths} mo`
      : "0 mo";

  const burnTrendLabel = financial?.burnRate.trendLabel || "No change";

  const purple = ACCENT.purple.spark;
  const cyan = ACCENT.cyan.spark;

  const hiddenTiles = COMMAND_CENTRE_HOME_TILE_CATALOG.filter(
    (tile) => !layout.includes(tile.id),
  );

  function moveTile(id: CommandCentreHomeTileId, direction: -1 | 1) {
    setLayout((current) => {
      const index = current.indexOf(id);
      if (index < 0) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function hideTile(id: CommandCentreHomeTileId) {
    setLayout((current) => current.filter((tileId) => tileId !== id));
  }

  function showTile(id: CommandCentreHomeTileId) {
    setLayout((current) => (current.includes(id) ? current : [...current, id]));
  }

  function tileVisible(id: CommandCentreHomeTileId) {
    return layout.includes(id);
  }

  function tileOrder(id: CommandCentreHomeTileId) {
    const index = layout.indexOf(id);
    return index < 0 ? 99 : index;
  }

  return (
    <div
      data-ai-target="home-tiles"
      aria-label="Executive command centre"
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
    >
      {showCustomize ? (
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 px-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Executive command centre
          </p>
          <button
            type="button"
            data-ai-target="home-customize"
            onClick={() => setCustomizeOpen((open) => !open)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
              customizeOpen
                ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
                : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Customise tiles
          </button>
        </div>
      ) : null}

      {showCustomize && customizeOpen ? (
        <div className="mb-2 shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex flex-wrap items-center gap-2">
            {layout.map((id, index) => {
              const tile = COMMAND_CENTRE_HOME_TILE_CATALOG.find((entry) => entry.id === id);
              if (!tile) return null;
              return (
                <div
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0b1524]/80 px-2 py-1 text-[11px] text-white/80"
                >
                  <span>{tile.title}</span>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveTile(id, -1)}
                    className="rounded px-1 text-white/50 hover:text-white disabled:opacity-30"
                    aria-label={`Move ${tile.title} earlier`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === layout.length - 1}
                    onClick={() => moveTile(id, 1)}
                    className="rounded px-1 text-white/50 hover:text-white disabled:opacity-30"
                    aria-label={`Move ${tile.title} later`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => hideTile(id)}
                    className="rounded p-0.5 text-rose-200/80 hover:bg-rose-500/15"
                    aria-label={`Hide ${tile.title}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
            {hiddenTiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => showTile(tile.id)}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200"
              >
                <Plus className="h-3 w-3" />
                {tile.title}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setLayout([...DEFAULT_COMMAND_CENTRE_HOME_LAYOUT])}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/55 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              Restore defaults
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-2 overflow-hidden sm:gap-2.5",
          layout.length <= 1
            ? "grid-cols-1 grid-rows-1"
            : layout.length === 2
              ? "grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1"
              : layout.length <= 4
                ? "grid-cols-2 grid-rows-2"
                : "grid-cols-2 grid-rows-3 xl:grid-cols-3 xl:grid-rows-2",
        )}
      >
        {/* 1 — Executive Brief */}
        {tileVisible("executive-brief") ? (
        <div style={{ order: tileOrder("executive-brief") }} className="min-h-0 min-w-0">
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
        </div>
        ) : null}

        {/* 2 — Financial */}
        {tileVisible("financial") ? (
        <div style={{ order: tileOrder("financial") }} className="min-h-0 min-w-0">
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
                    delta={revenueSpark ? pctChange(revenueSpark) : null}
                    spark={revenueSpark}
                    sparkColor={purple}
                  />
                  <KpiCell
                    label="Current forecast"
                    value={money(financial?.burnRate.forecastMonthly)}
                    spark={burnSpark}
                    sparkColor="#c4b5fd"
                  />
                  <KpiCell
                    label="Spend"
                    value={money(financial?.monthlyExpenses)}
                    delta={spendSpark ? pctChange(spendSpark) : null}
                    spark={spendSpark}
                    sparkColor="#8b5cf6"
                  />
                  <KpiCell
                    label="Burn"
                    value={burnPerMonth(financial?.burnRate.monthly)}
                    spark={burnSpark}
                    sparkColor="#a78bfa"
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
                    spark={cashSpark}
                    sparkColor={purple}
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
                      spark={cashSpark}
                      sparkColor={purple}
                    />
                    <KpiCell
                      label="Burn / month"
                      value={burnPerMonth(financial?.burnRate.monthly)}
                    />
                    <KpiCell label="Debtors" value={money(financial?.accountsReceivable)} />
                    <KpiCell label="Creditors" value={money(financial?.accountsPayable)} />
                  </div>
                  <div className="relative min-h-0 flex-1">
                    {cashSpark ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cashSpark}>
                          <Tooltip
                            contentStyle={{
                              background: "#0f172a",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 8,
                              fontSize: 11,
                            }}
                            formatter={(value) => formatMoney(Number(value ?? 0))}
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
                    ) : (
                      <ProfessionalEmpty />
                    )}
                  </div>
                </div>
              ) : null}
              {tab === 2 ? (
                <div className="flex h-full flex-col gap-2">
                  <div className="grid grid-cols-2 content-start gap-2">
                    <KpiCell label="Revenue" value={money(financial?.monthlyRevenue)} />
                    <KpiCell
                      label="Current forecast"
                      value={money(financial?.burnRate.forecastMonthly)}
                    />
                    <KpiCell label="Runway" value={runwayLabel} />
                    <KpiCell label="Burn trend" value={burnTrendLabel} />
                    <KpiCell
                      label="Payroll"
                      value={money(financial?.payroll.monthly)}
                      spark={payrollSpark}
                      sparkColor="#c4b5fd"
                    />
                    <KpiCell label="Net profit" value={money(financial?.netProfit)} />
                  </div>
                  <div className="min-h-0 flex-1">
                    {revenueSpark || hasTrendHistory ? (
                      revenueSpark ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={revenueSpark}>
                            <Bar
                              dataKey="amount"
                              fill={purple}
                              radius={[4, 4, 0, 0]}
                              isAnimationActive={false}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <ProfessionalEmpty />
                      )
                    ) : (
                      <ProfessionalEmpty />
                    )}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Tile>
        </div>
        ) : null}

        {/* 3 — Commercial */}
        {tileVisible("commercial") ? (
        <div style={{ order: tileOrder("commercial") }} className="min-h-0 min-w-0">
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
                    <KpiCell label="Pipeline" value={money(commercial.pipeline)} />
                    <KpiCell label="Closing" value={money(commercial.closingValue)} />
                    <KpiCell label="Opportunities" value={String(commercial.openCount)} />
                    <KpiCell
                      label="Win rate"
                      value={commercial.winRate != null ? `${commercial.winRate}%` : "—"}
                    />
                  </div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Opportunity funnel
                  </p>
                  <OpportunityFunnel stages={commercial.funnel} />
                </div>
              ) : null}
              {tab === 1 ? (
                <div className="flex h-full flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <KpiCell label="Active" value={String(commercial.activeCustomers)} />
                    <KpiCell label="Inactive" value={String(commercial.inactiveCustomers)} />
                    <KpiCell label="Total" value={String(commercial.customerTotal)} />
                    <KpiCell label="Pipeline" value={money(commercial.pipeline)} />
                  </div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Customer portfolio
                  </p>
                  <ProjectHealthStrip
                    rows={[
                      {
                        label: "Active",
                        count: commercial.segments.find((row) => row.label === "Active")?.count ?? 0,
                        tone: "ok",
                      },
                      {
                        label: "Onboarding",
                        count:
                          commercial.segments.find((row) => row.label === "Onboarding")?.count ?? 0,
                        tone: "neutral",
                      },
                      {
                        label: "Dormant",
                        count:
                          (commercial.segments.find((row) => row.label === "Dormant")?.count ?? 0) +
                          (commercial.segments.find((row) => row.label === "Archived")?.count ?? 0),
                        tone: "warn",
                      },
                    ]}
                  />
                </div>
              ) : null}
              {tab === 2 ? (
                <div className="flex h-full flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <KpiCell label="Closing" value={String(commercial.closingCount)} />
                    <KpiCell label="Closing value" value={money(commercial.closingValue)} />
                    <KpiCell
                      label="Win rate"
                      value={commercial.winRate != null ? `${commercial.winRate}%` : "—"}
                    />
                    <KpiCell label="Opportunities" value={String(commercial.openCount)} />
                  </div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Sales funnel
                  </p>
                  <OpportunityFunnel stages={commercial.funnel} />
                </div>
              ) : null}
            </>
          )}
        </Tile>
        </div>
        ) : null}

        {/* 4 — Projects & Delivery */}
        {tileVisible("projects") ? (
        <div style={{ order: tileOrder("projects") }} className="min-h-0 min-w-0">
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
                <div className="flex h-full flex-col gap-4">
                  <div className="grid grid-cols-3 gap-2.5">
                    <KpiCell label="On track" value={String(Math.max(projectsLive - projectsAtRisk.length, 0))} />
                    <KpiCell label="At risk" value={String(projectsAtRisk.length)} />
                    <KpiCell
                      label="Upcoming"
                      value={String(
                        (bundle?.projects ?? []).filter((project) => project.phase === "upcoming")
                          .length,
                      )}
                    />
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Portfolio health
                    </p>
                    <ProjectHealthStrip rows={projectHealth} />
                  </div>
                </div>
              ) : null}
              {tab === 1 ? (
                <div className="flex h-full flex-col gap-2">
                  <KpiCell label="Pending approvals" value={String(approvals)} />
                  <div className="min-h-0 flex-1 space-y-0.5">
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
                      <ProfessionalEmpty>
                        No approvals are waiting for executive action.
                      </ProfessionalEmpty>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {tab === 2 ? (
                <div className="flex h-full flex-col gap-4">
                  <div className="grid grid-cols-2 gap-2.5">
                    <KpiCell
                      label="Avg progress"
                      value={projectsLive > 0 ? `${avgProgress}%` : "—"}
                    />
                    <KpiCell
                      label="On track"
                      value={String(Math.max(projectsLive - projectsAtRisk.length, 0))}
                    />
                    <KpiCell label="At risk" value={String(projectsAtRisk.length)} />
                    <KpiCell label="Live" value={String(projectsLive)} />
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Delivery status
                    </p>
                    <ProjectHealthStrip rows={projectHealth} />
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Tile>
        </div>
        ) : null}

        {/* 5 — Operations */}
        {tileVisible("operations") ? (
        <div style={{ order: tileOrder("operations") }} className="min-h-0 min-w-0">
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
        </div>
        ) : null}

        {/* 6 — Risks */}
        {tileVisible("risks") ? (
        <div style={{ order: tileOrder("risks") }} className="min-h-0 min-w-0">
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
        ) : null}
      </div>
    </div>
  );
}
