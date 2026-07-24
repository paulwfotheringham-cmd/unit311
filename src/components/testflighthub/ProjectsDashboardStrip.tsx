"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { ManagedClient } from "@/lib/client-management-data";
import type { ProjectPortfolioScope } from "@/lib/project-portfolios";
import { getPortfolioProject } from "@/lib/project-portfolios";
import { useInternalOperationsBasePath } from "./InternalOperationsBasePathContext";
import type { InternalProject } from "@/lib/projects-data";
import { cn } from "@/lib/utils";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Building2, CalendarClock, FolderKanban, Users } from "lucide-react";

type ProjectsDashboardStripProps = {
  projects: InternalProject[];
  clients: ManagedClient[];
  scope?: ProjectPortfolioScope;
};

const PHASE_COLORS = {
  live: "#34d399",
  upcoming: "#38bdf8",
};

export default function ProjectsDashboardStrip({
  projects,
  clients,
  scope = "all",
}: ProjectsDashboardStripProps) {
  const basePath = useInternalOperationsBasePath();
  const isInternal = scope === "internal";
  const liveCount = projects.filter((project) => project.phase === "live").length;
  const upcomingCount = projects.filter((project) => project.phase === "upcoming").length;
  const avgProgress = useMemo(() => {
    const live = projects.filter((project) => project.phase === "live");
    if (live.length === 0) return 0;
    return live.reduce((sum, project) => sum + project.progressPct, 0) / live.length;
  }, [projects]);

  const phaseChartData = [
    { name: "Live", value: liveCount, fill: PHASE_COLORS.live },
    { name: "Upcoming", value: upcomingCount, fill: PHASE_COLORS.upcoming },
  ];

  const groupChartData = useMemo(() => {
    const counts = new Map<string, { name: string; count: number; clientId?: string }>();

    for (const project of projects) {
      const portfolio = getPortfolioProject(project.id);
      if (isInternal) {
        const name = portfolio?.department || project.clientName || project.region || "Unassigned";
        const key = name.toLowerCase();
        const existing = counts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(key, { name, count: 1 });
        }
        continue;
      }

      const matchedClient = project.clientId
        ? clients.find((client) => client.id === project.clientId)
        : clients.find((client) => client.companyName === project.clientName);
      const key = project.clientId || project.clientName || "unassigned";
      const name = matchedClient?.companyName || project.clientName || "Unassigned";
      const existing = counts.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          name,
          count: 1,
          clientId: matchedClient?.id ?? project.clientId ?? undefined,
        });
      }
    }

    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [clients, isInternal, projects]);

  const maxGroupCount = Math.max(groupChartData[0]?.count ?? 1, 1);

  const activeClients = useMemo(
    () => clients.filter((client) => client.accountStatus === "Active").length,
    [clients],
  );

  const activeDepartments = groupChartData.length;

  return (
    <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
            Portfolio snapshot
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">
            {isInternal ? "Internal programmes dashboard" : "Projects dashboard"}
          </h3>
        </div>
        {!isInternal && (
          <div className="flex flex-wrap gap-2">
            {clients.slice(0, 4).map((client) => (
              <Link
                key={client.id}
                href={`${basePath}?view=projects-external&clientId=${encodeURIComponent(client.id)}`}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-white/70 transition-colors hover:border-sky-400/30 hover:text-sky-200"
              >
                {client.companyName}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-1 lg:grid-cols-2">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
            <div className="flex items-center gap-2 text-emerald-200">
              <Activity className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Live</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{liveCount}</p>
          </div>
          <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-3">
            <div className="flex items-center gap-2 text-sky-200">
              <CalendarClock className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Upcoming</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{upcomingCount}</p>
          </div>
          <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3">
            <div className="flex items-center gap-2 text-violet-200">
              <FolderKanban className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Avg progress</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{avgProgress.toFixed(0)}%</p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 text-amber-200">
              {isInternal ? <Building2 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                {isInternal ? "Departments" : "Active clients"}
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">
              {isInternal ? activeDepartments : activeClients}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
            By phase
          </p>
          <div className="mt-2 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "#0b1524",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {phaseChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
            {isInternal ? "Top departments" : "Top clients"}
          </p>
          <div className="mt-3 space-y-2.5">
            {groupChartData.length === 0 ? (
              <p className="text-xs text-white/45">
                {isInternal ? "No department programmes yet." : "No client projects yet."}
              </p>
            ) : (
              groupChartData.map((row) => (
                <div key={row.name}>
                  <div className="flex items-start justify-between gap-3">
                    {row.clientId && !isInternal ? (
                      <Link
                        href={`${basePath}?view=projects-external&clientId=${encodeURIComponent(row.clientId)}`}
                        className="min-w-0 flex-1 text-sm font-medium leading-snug text-white/85 transition-colors hover:text-sky-200"
                        title={row.name}
                      >
                        {row.name}
                      </Link>
                    ) : (
                      <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-white/85" title={row.name}>
                        {row.name}
                      </span>
                    )}
                    <span className="shrink-0 rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-200">
                      {row.count} {row.count === 1 ? "project" : "projects"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                      style={{ width: `${(row.count / maxGroupCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0b1524]/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
            Live workload
          </p>
          <div className="mt-3 space-y-2">
            {projects
              .filter((project) => project.phase === "live")
              .slice(0, 4)
              .map((project) => (
                <div key={project.id}>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-white/80">{project.name}</span>
                    <span className="font-mono text-white/50">{project.progressPct.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500")}
                      style={{ width: `${Math.min(100, project.progressPct)}%` }}
                    />
                  </div>
                </div>
              ))}
            {liveCount === 0 && <p className="text-xs text-white/45">No live projects.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
