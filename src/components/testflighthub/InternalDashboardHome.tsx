"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import {
  DEFAULT_HOME_DASHBOARD_LAYOUT,
  HOME_DASHBOARD_TILE_CATALOG,
  getHomeDashboardTileDefinition,
  loadHomeDashboardLayout,
  saveHomeDashboardLayout,
  type HomeDashboardTileId,
} from "@/lib/internal-dashboard-home-layout";
import {
  emptyActionItems,
  emptyExecutiveRevenueSummary,
  emptyProjectsInProgress,
  emptyRevenueTrendData,
  emptySupportOutstandingTrend,
  emptyThisWeekSchedule,
  emptyUpcomingMissions,
  missionStatusClass,
  priorityDotClass,
  type ActionItem,
  type ProjectInProgress,
  type WeekDay,
} from "@/lib/home-dashboard-data";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  FolderKanban,
  LayoutGrid,
  LifeBuoy,
  Plus,
  RotateCcw,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TILE_THEMES = {
  action: {
    border: "border-rose-400/25",
    bg: "from-rose-500/[0.12] via-rose-500/[0.04] to-transparent",
    accent: "text-rose-300",
    icon: "bg-rose-500/20 text-rose-200",
  },
  revenue: {
    border: "border-emerald-400/25",
    bg: "from-emerald-500/[0.12] via-emerald-500/[0.04] to-transparent",
    accent: "text-emerald-300",
    icon: "bg-emerald-500/20 text-emerald-200",
  },
  support: {
    border: "border-amber-400/25",
    bg: "from-amber-500/[0.12] via-amber-500/[0.04] to-transparent",
    accent: "text-amber-300",
    icon: "bg-amber-500/20 text-amber-200",
  },
  calendar: {
    border: "border-violet-400/25",
    bg: "from-violet-500/[0.12] via-violet-500/[0.04] to-transparent",
    accent: "text-violet-300",
    icon: "bg-violet-500/20 text-violet-200",
  },
  projects: {
    border: "border-sky-400/25",
    bg: "from-sky-500/[0.12] via-sky-500/[0.04] to-transparent",
    accent: "text-sky-300",
    icon: "bg-sky-500/20 text-sky-200",
  },
  missions: {
    border: "border-cyan-400/25",
    bg: "from-cyan-500/[0.12] via-cyan-500/[0.04] to-transparent",
    accent: "text-cyan-300",
    icon: "bg-cyan-500/20 text-cyan-200",
  },
} as const;

const TILE_THEME_BY_ID: Record<HomeDashboardTileId, keyof typeof TILE_THEMES> = {
  "action-required": "action",
  revenue: "revenue",
  support: "support",
  "this-week": "calendar",
  projects: "projects",
  "upcoming-missions": "missions",
};

const TILE_ICON_BY_ID: Record<HomeDashboardTileId, React.ReactNode> = {
  "action-required": <TrendingUp className="h-4 w-4" />,
  revenue: <CircleDollarSign className="h-4 w-4" />,
  support: <LifeBuoy className="h-4 w-4" />,
  "this-week": <CalendarDays className="h-4 w-4" />,
  projects: <FolderKanban className="h-4 w-4" />,
  "upcoming-missions": <CalendarDays className="h-4 w-4" />,
};

const DAY_ACCENTS = [
  "border-sky-400/30 bg-sky-500/[0.08]",
  "border-violet-400/30 bg-violet-500/[0.08]",
  "border-emerald-400/30 bg-emerald-500/[0.08]",
  "border-amber-400/30 bg-amber-500/[0.08]",
  "border-rose-400/30 bg-rose-500/[0.08]",
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function SectionPanel({
  title,
  children,
  className,
  theme = "action",
  icon,
  panelId,
  headerAction,
  editMode = false,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp = false,
  canMoveDown = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  theme?: keyof typeof TILE_THEMES;
  icon?: React.ReactNode;
  panelId?: string;
  headerAction?: React.ReactNode;
  editMode?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const palette = TILE_THEMES[theme];

  return (
    <section
      id={panelId}
      className={cn(
        "relative rounded-2xl border bg-gradient-to-br shadow-[0_16px_48px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl",
        palette.border,
        palette.bg,
        editMode && "ring-1 ring-sky-400/35",
        className,
      )}
    >
      {editMode ? (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            className="rounded-lg border border-white/10 bg-[#0b1524]/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Up
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            className="rounded-lg border border-white/10 bg-[#0b1524]/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Down
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-400/25 bg-rose-500/10 text-rose-200 transition-colors hover:bg-rose-500/20"
            aria-label={`Remove ${title} tile`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon ? (
            <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl", palette.icon)}>
              {icon}
            </span>
          ) : null}
          <h3 className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", palette.accent)}>
            {title}
          </h3>
        </div>
        {!editMode && headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      <div className="px-4 py-3 sm:px-5 sm:py-4">{children}</div>
    </section>
  );
}

function actionItemLinkLabel(task: string) {
  if (task.startsWith("Executive session booked")) return "Open meeting";
  return "View";
}

function ActionRow({ item }: { item: ActionItem }) {
  return (
    <tr className="border-b border-white/[0.05] last:border-0">
      <td className="w-7 py-2 pr-2 align-middle">
        <span
          className={cn("inline-block h-2 w-2 rounded-full", priorityDotClass(item.priority))}
          aria-label={`${item.priority} priority`}
        />
      </td>
      <td className="py-2 pr-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] leading-snug text-white/90">{item.task}</span>
          {item.href ? (
            <Link
              href={item.href}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-400/25 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-100 transition-colors hover:bg-rose-500/20"
            >
              {actionItemLinkLabel(item.task)}
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </td>
      <td className="hidden py-2 pr-3 text-[13px] text-white/55 sm:table-cell">{item.assignedTo}</td>
      <td className="py-2 text-right text-[13px] font-medium text-white/50 sm:text-left">{item.due}</td>
    </tr>
  );
}

function WeekCalendarDay({ day, index }: { day: WeekDay; index: number }) {
  const accent = DAY_ACCENTS[index % DAY_ACCENTS.length];

  return (
    <div className={cn("flex min-h-[9.5rem] flex-col rounded-xl border p-3", accent)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white/90">{day.day}</p>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] tabular-nums text-white/45">
          {day.entries.length} {day.entries.length === 1 ? "item" : "items"}
        </span>
      </div>
      <ul className="flex flex-1 flex-col gap-2">
        {day.entries.map((entry, entryIndex) => (
          <li
            key={`${day.day}-${entryIndex}`}
            className="rounded-lg border border-white/[0.08] bg-black/20 px-2.5 py-2"
          >
            {entry.time ? (
              <p className="text-[10px] font-medium tabular-nums uppercase tracking-[0.08em] text-white/40">
                {entry.time}
              </p>
            ) : null}
            <p className="mt-0.5 text-[12px] leading-snug text-white/80">{entry.label}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectInProgress }) {
  const href = project.projectHref ?? "?view=projects";

  return (
    <article className="group flex flex-col rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 transition-colors hover:border-sky-400/30 hover:from-sky-500/[0.08]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-white">{project.project}</h4>
          <p className="mt-1 text-xs text-white/45">{project.client}</p>
        </div>
        <span className="shrink-0 rounded-full border border-sky-400/25 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-sky-200">
          {project.status}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/45">
          <span>Progress</span>
          <span className="font-mono tabular-nums text-white/70">{project.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-white/35">Updated {project.lastUpdate}</p>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-sky-100 transition-colors hover:bg-sky-500/20"
        >
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

function RevenueChart() {
  const revenueChartData = emptyRevenueTrendData.map((point) => ({
    label: point.label,
    actual: point.actual ?? null,
    forecast: point.forecast ?? null,
  }));

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.values(emptyExecutiveRevenueSummary).map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] p-3"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/40">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white sm:text-xl">
              {formatCurrency(item.value)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-emerald-300">{item.change}</p>
          </div>
        ))}
      </div>
      <div className="h-56 w-full min-w-0 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={revenueChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `€${value}k`}
            />
            <Tooltip content={<ChartTooltip suffix="k" />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }} />
            <Bar dataKey="actual" name="Recognised" fill="#34d399" radius={[6, 6, 0, 0]} />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={{ r: 3, fill: "#a78bfa" }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function SupportChart() {
  return (
    <>
      <p className="mb-3 text-xs text-white/45">
        Open tickets assigned and awaiting resolution — rolling six-week view for board review.
      </p>
      <div className="h-56 w-full min-w-0 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={emptySupportOutstandingTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }} />
            <Bar dataKey="outstanding" name="Outstanding" fill="#fbbf24" radius={[6, 6, 0, 0]} />
            <Bar dataKey="resolved" name="Resolved" fill="#34d399" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}


function renderTileContent(id: HomeDashboardTileId, actionItems: ActionItem[]) {
  switch (id) {
    case "action-required":
      return actionItems.length === 0 ? (
        <p className="text-sm text-white/45">No action items for this workspace.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
                  <th className="pb-2 pr-2 font-medium" scope="col">
                    <span className="sr-only">Priority</span>
                  </th>
                  <th className="pb-2 pr-3 font-medium" scope="col">
                    Task
                  </th>
                  <th className="hidden pb-2 pr-3 font-medium sm:table-cell" scope="col">
                    Assigned to
                  </th>
                  <th className="pb-2 font-medium" scope="col">
                    Due
                  </th>
                </tr>
              </thead>
              <tbody>
                {actionItems.map((item) => (
                  <ActionRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2.5 sm:hidden">
            {actionItems.map((item) => (
              <div
                key={`${item.id}-mobile`}
                className="flex gap-2.5 rounded-lg border border-white/[0.06] bg-black/15 p-3"
              >
                <span
                  className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", priorityDotClass(item.priority))}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="text-[13px] leading-snug text-white/90">{item.task}</p>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-400/25 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-100 transition-colors hover:bg-rose-500/20"
                      >
                        {actionItemLinkLabel(item.task)}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-white/45">
                    {item.assignedTo} · {item.due}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    case "revenue":
      return <RevenueChart />;
    case "support":
      return <SupportChart />;
    case "this-week":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {emptyThisWeekSchedule.map((day, index) => (
            <WeekCalendarDay key={day.day} day={day} index={index} />
          ))}
        </div>
      );
    case "projects":
      return emptyProjectsInProgress.length === 0 ? (
        <p className="text-sm text-white/45">No projects in progress for this workspace.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {emptyProjectsInProgress.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      );
    case "upcoming-missions":
      return emptyUpcomingMissions.length === 0 ? (
        <p className="text-sm text-white/45">No upcoming missions for this workspace.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[16rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
                <th className="pb-2 pr-2 font-medium" scope="col">
                  Mission
                </th>
                <th className="hidden pb-2 pr-2 font-medium sm:table-cell" scope="col">
                  Client
                </th>
                <th className="pb-2 pr-2 font-medium" scope="col">
                  Date
                </th>
                <th className="hidden pb-2 pr-2 font-medium md:table-cell" scope="col">
                  Pilot
                </th>
                <th className="pb-2 font-medium" scope="col">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {emptyUpcomingMissions.map((mission) => (
                <tr key={mission.id} className="border-b border-white/[0.05] last:border-0">
                  <td className="py-2 pr-2 align-top">
                    <p className="text-[13px] font-medium leading-snug text-white/85">{mission.name}</p>
                    <p className="mt-0.5 text-[10px] text-white/40 sm:hidden">{mission.client}</p>
                  </td>
                  <td className="hidden py-2 pr-2 text-[13px] text-white/55 sm:table-cell">
                    {mission.client}
                  </td>
                  <td className="py-2 pr-2 text-[13px] text-white/50">{mission.date}</td>
                  <td className="hidden py-2 pr-2 text-[13px] text-white/55 md:table-cell">
                    {mission.pilot}
                  </td>
                  <td className="py-2 align-top">
                    <span
                      className={cn(
                        "inline-flex rounded border px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.06em]",
                        missionStatusClass(mission.status),
                      )}
                    >
                      {mission.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function HomeTilesMenu({
  editMode,
  hiddenTiles,
  onEditLayout,
  onDoneEditing,
  onAddTile,
  onReset,
}: {
  editMode: boolean;
  hiddenTiles: HomeDashboardTileId[];
  onEditLayout: () => void;
  onDoneEditing: () => void;
  onAddTile: (id: HomeDashboardTileId) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 text-xs font-semibold text-sky-100 transition-colors hover:border-sky-400/50 hover:bg-sky-500/20"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Customize tiles
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#0b1524]/95 shadow-[0_20px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Home layout
            </p>
          </div>

          <div className="p-1.5">
            {editMode ? (
              <button
                type="button"
                onClick={() => {
                  onDoneEditing();
                  setOpen(false);
                }}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-emerald-200 transition-colors hover:bg-emerald-500/10"
              >
                Done editing
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onEditLayout();
                  setOpen(false);
                }}
                className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-white/85 transition-colors hover:bg-white/[0.06]"
              >
                Edit layout
              </button>
            )}

            {hiddenTiles.length > 0 ? (
              <>
                <div className="my-1.5 border-t border-white/10" />
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                  Add tile
                </p>
                {hiddenTiles.map((tileId) => {
                  const definition = getHomeDashboardTileDefinition(tileId);
                  if (!definition) return null;

                  return (
                    <button
                      key={tileId}
                      type="button"
                      onClick={() => {
                        onAddTile(tileId);
                        setOpen(false);
                      }}
                      className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
                    >
                      <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />
                      <span>
                        <span className="block text-sm text-white/85">{definition.title}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-white/40">
                          {definition.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </>
            ) : null}

            <div className="my-1.5 border-t border-white/10" />
            <button
              type="button"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/[0.06]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to default
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type InternalDashboardHomeProps = {
  showCustomize?: boolean;
};

export default function InternalDashboardHome({ showCustomize = true }: InternalDashboardHomeProps) {
  const [layout, setLayout] = useState<HomeDashboardTileId[]>(DEFAULT_HOME_DASHBOARD_LAYOUT);
  const [editMode, setEditMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [scrollToActionRequired, setScrollToActionRequired] = useState(false);
  const [liveActionItems, setLiveActionItems] = useState<ActionItem[]>([]);
  const [liveActionItemsLoaded, setLiveActionItemsLoaded] = useState(false);

  const displayedActionItems = useMemo(
    () => (liveActionItemsLoaded ? liveActionItems : emptyActionItems),
    [liveActionItems, liveActionItemsLoaded],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateWorkspaceLayout() {
      try {
        const response = await fetch("/api/auth/whoami", { cache: "no-store" });
        const data = (await response.json()) as {
          workspaceId?: string | null;
        };
        if (cancelled) return;
        const id = data.workspaceId?.trim() || null;
        setWorkspaceId(id);
        setLayout(loadHomeDashboardLayout(id));
      } catch {
        if (!cancelled) {
          setLayout(loadHomeDashboardLayout(null));
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void hydrateWorkspaceLayout();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadActionItems() {
      try {
        const response = await fetch("/api/internal/action-items", { cache: "no-store" });
        const data = (await response.json()) as {
          items?: Array<{
            id: string;
            priority: ActionItem["priority"];
            task: string;
            assignedTo: string;
            due: string;
            href: string | null;
          }>;
          workspace?: { id?: string };
        };
        if (cancelled) return;
        if (data.workspace?.id) {
          setWorkspaceId(data.workspace.id);
        }
        if (!response.ok) {
          setLiveActionItemsLoaded(true);
          setLiveActionItems([]);
          return;
        }
        setLiveActionItemsLoaded(true);
        setLiveActionItems(
          (data.items ?? []).map((item) => ({
            id: item.id,
            priority: item.priority,
            task: item.task,
            assignedTo: item.assignedTo,
            due: item.due,
            href: item.href ?? undefined,
          })),
        );
      } catch {
        if (!cancelled) {
          setLiveActionItemsLoaded(true);
          setLiveActionItems([]);
        }
      }
    }

    void loadActionItems();

    function handleRefreshAlerts() {
      void loadActionItems();
    }

    window.addEventListener("internal-dashboard:refresh-alerts", handleRefreshAlerts);
    return () => {
      cancelled = true;
      window.removeEventListener("internal-dashboard:refresh-alerts", handleRefreshAlerts);
    };
  }, []);

  useEffect(() => {
    if (!scrollToActionRequired || !layout.includes("action-required")) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById("home-tile-action-required")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setScrollToActionRequired(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [layout, scrollToActionRequired]);

  const persistLayout = useCallback(
    (next: HomeDashboardTileId[]) => {
      setLayout(next);
      saveHomeDashboardLayout(next, workspaceId);
    },
    [workspaceId],
  );

  const hiddenTiles = useMemo(
    () => HOME_DASHBOARD_TILE_CATALOG.map((tile) => tile.id).filter((id) => !layout.includes(id)),
    [layout],
  );

  const moveTile = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= layout.length) return;
      const next = [...layout];
      [next[index], next[target]] = [next[target], next[index]];
      persistLayout(next);
    },
    [layout, persistLayout],
  );

  const removeTile = useCallback(
    (id: HomeDashboardTileId) => {
      persistLayout(layout.filter((tileId) => tileId !== id));
    },
    [layout, persistLayout],
  );

  const addTile = useCallback(
    (id: HomeDashboardTileId) => {
      if (layout.includes(id)) return;
      persistLayout([...layout, id]);
    },
    [layout, persistLayout],
  );

  const resetLayout = useCallback(() => {
    persistLayout([...DEFAULT_HOME_DASHBOARD_LAYOUT]);
    setEditMode(false);
  }, [persistLayout]);

  const openActionRequired = useCallback(() => {
    if (!layout.includes("action-required")) {
      addTile("action-required");
      setScrollToActionRequired(true);
      return;
    }

    document.getElementById("home-tile-action-required")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [addTile, layout]);

  const renderTilePanel = (id: HomeDashboardTileId, index: number) => {
    const definition = getHomeDashboardTileDefinition(id);
    if (!definition) return null;

    return (
      <SectionPanel
        key={id}
        title={definition.title}
        theme={TILE_THEME_BY_ID[id]}
        icon={TILE_ICON_BY_ID[id]}
        panelId={id === "action-required" ? "home-tile-action-required" : undefined}
        editMode={editMode}
        canMoveUp={index > 0}
        canMoveDown={index < layout.length - 1}
        onMoveUp={() => moveTile(index, -1)}
        onMoveDown={() => moveTile(index, 1)}
        onRemove={() => removeTile(id)}
      >
        {renderTileContent(id, displayedActionItems)}
      </SectionPanel>
    );
  };

  const layoutRows = useMemo(() => {
    const rows: Array<HomeDashboardTileId | HomeDashboardTileId[]> = [];
    let index = 0;

    while (index < layout.length) {
      const current = layout[index];
      const next = layout[index + 1];
      const isChartPair =
        (current === "revenue" && next === "support") || (current === "support" && next === "revenue");

      if (isChartPair) {
        rows.push([current, next]);
        index += 2;
        continue;
      }

      rows.push(current);
      index += 1;
    }

    return rows;
  }, [layout]);

  if (!hydrated) {
    return (
      <section aria-label="Internal operations command centre" className="min-w-0">
        <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
      </section>
    );
  }

  return (
    <section aria-label="Internal operations command centre" className="min-w-0">
      {showCustomize ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              Command centre
            </p>
            {editMode ? (
              <p className="mt-1 text-sm text-white/55">
                Reorder or remove tiles, then choose Done editing.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openActionRequired}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 text-xs font-semibold text-rose-100 transition-colors hover:border-rose-400/45 hover:bg-rose-500/20"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Action required
            </button>
            <HomeTilesMenu
              editMode={editMode}
              hiddenTiles={hiddenTiles}
              onEditLayout={() => setEditMode(true)}
              onDoneEditing={() => setEditMode(false)}
              onAddTile={addTile}
              onReset={resetLayout}
            />
          </div>
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-4 lg:gap-5">
        {layoutRows.map((row, rowIndex) => {
          if (Array.isArray(row)) {
            return (
              <div key={`row-${row.join("-")}-${rowIndex}`} className="grid gap-4 xl:grid-cols-2">
                {row.map((tileId) => {
                  const index = layout.indexOf(tileId);
                  return renderTilePanel(tileId, index);
                })}
              </div>
            );
          }

          const index = layout.indexOf(row);
          return renderTilePanel(row, index);
        })}

        {layout.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center">
            <p className="text-sm font-medium text-white/70">No tiles on your home view</p>
            <p className="mt-2 text-xs text-white/45">
              Open Customize tiles to add action items, charts, calendar, or projects.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
