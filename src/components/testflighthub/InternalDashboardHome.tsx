"use client";

import Link from "next/link";

import { ChartTooltip } from "@/components/dashboard/ChartTooltip";
import {
  actionRequiredItems,
  executiveRevenueSummary,
  priorityDotClass,
  projectsInProgress,
  revenueTrendData,
  supportOutstandingTrend,
  thisWeekSchedule,
  type ActionItem,
  type ProjectInProgress,
  type WeekDay,
} from "@/lib/internal-operations-command-data";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  FolderKanban,
  LifeBuoy,
  TrendingUp,
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
} as const;

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
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  theme?: keyof typeof TILE_THEMES;
  icon?: React.ReactNode;
}) {
  const palette = TILE_THEMES[theme];

  return (
    <section
      className={cn(
        "rounded-2xl border bg-gradient-to-br shadow-[0_16px_48px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl",
        palette.border,
        palette.bg,
        className,
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        {icon ? (
          <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl", palette.icon)}>
            {icon}
          </span>
        ) : null}
        <h3 className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", palette.accent)}>
          {title}
        </h3>
      </div>
      <div className="px-4 py-3 sm:px-5 sm:py-4">{children}</div>
    </section>
  );
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
      <td className="py-2 pr-3 text-[13px] leading-snug text-white/90">{item.task}</td>
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

export default function InternalDashboardHome() {
  const revenueChartData = revenueTrendData.map((point) => ({
    label: point.label,
    actual: point.actual ?? null,
    forecast: point.forecast ?? null,
  }));

  return (
    <section aria-label="Internal operations command centre" className="min-w-0">
      <div className="flex w-full flex-col gap-4 lg:gap-5">
        <SectionPanel
          title="Action required"
          theme="action"
          icon={<TrendingUp className="h-4 w-4" />}
        >
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
                {actionRequiredItems.map((item) => (
                  <ActionRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2.5 sm:hidden">
            {actionRequiredItems.map((item) => (
              <div
                key={`${item.id}-mobile`}
                className="flex gap-2.5 rounded-lg border border-white/[0.06] bg-black/15 p-3"
              >
                <span
                  className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", priorityDotClass(item.priority))}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-white/90">{item.task}</p>
                  <p className="mt-1 text-[11px] text-white/45">
                    {item.assignedTo} · {item.due}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>

        <div className="grid gap-4 xl:grid-cols-2">
          <SectionPanel
            title="Revenue overview"
            theme="revenue"
            icon={<CircleDollarSign className="h-4 w-4" />}
          >
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.values(executiveRevenueSummary).map((item) => (
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
          </SectionPanel>

          <SectionPanel
            title="Support tickets outstanding"
            theme="support"
            icon={<LifeBuoy className="h-4 w-4" />}
          >
            <p className="mb-3 text-xs text-white/45">
              Open tickets assigned and awaiting resolution — rolling six-week view for board review.
            </p>
            <div className="h-56 w-full min-w-0 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supportOutstandingTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
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
          </SectionPanel>
        </div>

        <SectionPanel
          title="This week"
          theme="calendar"
          icon={<CalendarDays className="h-4 w-4" />}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {thisWeekSchedule.map((day, index) => (
              <WeekCalendarDay key={day.day} day={day} index={index} />
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Projects in progress"
          theme="projects"
          icon={<FolderKanban className="h-4 w-4" />}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projectsInProgress.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </SectionPanel>
      </div>
    </section>
  );
}
