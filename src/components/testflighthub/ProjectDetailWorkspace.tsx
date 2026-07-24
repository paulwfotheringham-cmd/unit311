"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { ManagedClient } from "@/lib/client-management-data";
import {
  ganttBarStyle,
  getProjectDetail,
  type ProjectTask,
} from "@/lib/project-detail-data";
import { getPortfolioProject } from "@/lib/project-portfolios";
import { formatProjectDate, type InternalProject } from "@/lib/projects-data";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Diamond,
  FolderOpen,
  Milestone,
  Zap,
} from "lucide-react";

import { useInternalOperationsBasePath } from "./InternalOperationsBasePathContext";

type ProjectDetailWorkspaceProps = {
  project: InternalProject;
  onBack?: () => void;
  clients?: ManagedClient[];
  /** When true, omit the back control (used inside master-detail layouts). */
  embedded?: boolean;
};

function panelClassName() {
  return "rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6";
}

function taskStatusLabel(progress: number) {
  if (progress >= 100) return "Complete";
  if (progress > 0) return "In progress";
  return "Not started";
}

function taskStatusClass(progress: number) {
  if (progress >= 100) return "border-emerald-400/40 bg-emerald-500/15 text-emerald-300";
  if (progress > 0) return "border-sky-400/40 bg-sky-500/15 text-sky-300";
  return "border-white/15 bg-white/[0.04] text-white/55";
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export default function ProjectDetailWorkspace({
  project,
  onBack,
  clients,
  embedded = false,
}: ProjectDetailWorkspaceProps) {
  const basePath = useInternalOperationsBasePath();
  const detail = useMemo(() => getProjectDetail(project.id), [project.id]);
  const portfolio = useMemo(() => getPortfolioProject(project.id), [project.id]);
  const [tasks, setTasks] = useState<ProjectTask[]>(() => detail.tasks.map((task) => ({ ...task })));

  useEffect(() => {
    setTasks(detail.tasks.map((task) => ({ ...task })));
  }, [detail]);

  const client = useMemo(
    () =>
      portfolio?.kind === "internal"
        ? null
        : clients?.find(
            (entry) =>
              entry.id === project.clientId || entry.companyName === project.clientName,
          ) ?? null,
    [clients, portfolio?.kind, project.clientId, project.clientName],
  );

  const folderId = detail.folderId ?? client?.filesFolderId ?? null;

  const ganttRange = useMemo(() => {
    if (tasks.length === 0) {
      const start = project.startDate ? new Date(`${project.startDate}T12:00:00`) : new Date();
      const end = project.endDate
        ? new Date(`${project.endDate}T12:00:00`)
        : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
      return { start, end };
    }

    const starts = tasks.map((task) => new Date(`${task.startDate}T12:00:00`).getTime());
    const ends = tasks.map((task) => new Date(`${task.dueDate}T12:00:00`).getTime());
    const pad = 2 * 24 * 60 * 60 * 1000;
    return {
      start: new Date(Math.min(...starts) - pad),
      end: new Date(Math.max(...ends) + pad),
    };
  }, [tasks, project.startDate, project.endDate]);

  const milestones = useMemo(() => tasks.filter((task) => task.milestone), [tasks]);

  function updateTask(id: string, patch: Partial<ProjectTask>) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {!embedded && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs text-white/60 transition-colors hover:border-white/20 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to projects
            </button>
          ) : null}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
              Project detail
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">{project.name}</h2>
            <p className="mt-1 text-sm text-white/50">
              {portfolio?.kind === "internal"
                ? `Department · ${portfolio.department ?? project.clientName}`
                : project.clientName}
              {project.site ? ` · ${project.site}` : ""}
            </p>
            <p className="mt-1 text-xs text-white/40">
              Start {formatProjectDate(project.startDate)}
              {project.endDate ? ` · End ${formatProjectDate(project.endDate)}` : ""}
              {(portfolio?.projectManager || project.operator)
                ? ` · PM ${portfolio?.projectManager ?? project.operator}`
                : ""}
              {portfolio?.accountManager ? ` · AM ${portfolio.accountManager}` : ""}
            </p>
          </div>
        </div>

        {folderId ? (
          <Link
            href={`${basePath}?view=files-internal&folderId=${encodeURIComponent(folderId)}`}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Project folder
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-white/35">
            <FolderOpen className="h-3.5 w-3.5" />
            No linked folder
          </span>
        )}
      </header>

      {portfolio ? (
        <section className={panelClassName()}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                {portfolio.kind === "internal" ? "Budget" : "Contract value"}
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {portfolio.contractValueLabel ?? portfolio.budgetLabel}
              </p>
            </div>
            {portfolio.kind === "external" ? (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                    Delivery status
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {portfolio.deliveryStatus ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                    Billing status
                  </p>
                  <p className="mt-1 text-sm text-white/80">{portfolio.billingStatus ?? "—"}</p>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Stakeholders
                </p>
                <p className="mt-1 text-sm text-white/80">
                  {(portfolio.stakeholders ?? []).join(" · ") || "—"}
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Progress</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-white">
                {project.progressPct.toFixed(0)}%
              </p>
            </div>
          </div>

          {portfolio.kind === "external" && portfolio.customerContacts?.length ? (
            <p className="mt-4 text-xs text-white/50">
              Customer contacts · {portfolio.customerContacts.join(" · ")}
            </p>
          ) : null}

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Milestones</h3>
              <ul className="mt-2 space-y-2">
                {portfolio.milestones.map((milestone) => (
                  <li
                    key={milestone.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1524]/70 px-3 py-2 text-xs"
                  >
                    <span className="text-white/80">{milestone.name}</span>
                    <span className="shrink-0 text-white/45">
                      {formatProjectDate(milestone.dueDate)} · {milestone.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Risks</h3>
              <ul className="mt-2 space-y-2">
                {portfolio.risks.map((risk) => (
                  <li
                    key={risk.id}
                    className="rounded-xl border border-white/10 bg-[#0b1524]/70 px-3 py-2 text-xs"
                  >
                    <p className="text-white/85">{risk.title}</p>
                    <p className="mt-1 text-white/40">
                      {risk.severity} · Owner {risk.owner}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <section className={panelClassName()}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Tasks</h3>
            <p className="mt-1 text-xs text-white/45">
              {tasks.length} tasks · edit progress inline
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-white/40">
            <span className="inline-flex items-center gap-1">
              <Diamond className="h-3 w-3 text-amber-300" />
              Milestone
            </span>
            <span className="inline-flex items-center gap-1">
              <Zap className="h-3 w-3 text-rose-300" />
              Critical path
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">
                <th className="pb-2 pr-3 font-medium">Task</th>
                <th className="pb-2 pr-3 font-medium">Start</th>
                <th className="pb-2 pr-3 font-medium">Due</th>
                <th className="pb-2 pr-3 font-medium">Progress</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Resource</th>
                <th className="pb-2 pr-3 font-medium">Flags</th>
                <th className="pb-2 font-medium">Timeline</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const bar = ganttBarStyle(
                  task.startDate,
                  task.dueDate,
                  ganttRange.start,
                  ganttRange.end,
                );

                return (
                  <tr key={task.id} className="border-b border-white/[0.05] last:border-0">
                    <td className="py-3 pr-3 font-medium text-white/90">{task.name}</td>
                    <td className="py-3 pr-3 text-white/55">{formatShortDate(task.startDate)}</td>
                    <td className="py-3 pr-3 text-white/55">{formatShortDate(task.dueDate)}</td>
                    <td className="py-3 pr-3">
                      <div className="flex min-w-[8rem] items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={task.progress}
                          onChange={(event) =>
                            updateTask(task.id, { progress: Number(event.target.value) })
                          }
                          className="h-1.5 w-full accent-sky-500"
                          aria-label={`Progress for ${task.name}`}
                        />
                        <span className="w-8 shrink-0 font-mono text-xs text-white/70">
                          {task.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <select
                        value={taskStatusLabel(task.progress)}
                        onChange={(event) => {
                          const label = event.target.value;
                          const progress =
                            label === "Complete" ? 100 : label === "Not started" ? 0 : 50;
                          updateTask(task.id, { progress });
                        }}
                        className="rounded-lg border border-white/10 bg-[#0b1524] px-2 py-1 text-xs text-white outline-none focus:border-sky-400/50"
                      >
                        <option value="Not started">Not started</option>
                        <option value="In progress">In progress</option>
                        <option value="Complete">Complete</option>
                      </select>
                    </td>
                    <td className="py-3 pr-3 text-white/60">{task.resource}</td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-1.5">
                        {task.milestone && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                            <Milestone className="h-3 w-3" />
                            Milestone
                          </span>
                        )}
                        {task.critical && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-200">
                            <Zap className="h-3 w-3" />
                            Critical
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="relative h-5 w-36 min-w-[9rem] rounded-md bg-white/[0.06]">
                        <div
                          className={cn(
                            "absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full",
                            task.critical
                              ? "bg-gradient-to-r from-rose-500 to-amber-400"
                              : "bg-gradient-to-r from-sky-500 to-emerald-400",
                          )}
                          style={bar}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={panelClassName()}>
        <div className="flex items-center gap-2">
          <Milestone className="h-4 w-4 text-amber-300" />
          <h3 className="text-base font-semibold text-white">Milestones</h3>
        </div>
        <p className="mt-1 text-xs text-white/45">
          Key delivery checkpoints on the critical path
        </p>

        {milestones.length === 0 ? (
          <p className="mt-4 text-sm text-white/45">No milestones defined for this project.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {milestones.map((task) => (
              <article
                key={task.id}
                className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{task.name}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      taskStatusClass(task.progress),
                    )}
                  >
                    {taskStatusLabel(task.progress)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/50">
                  Due {formatProjectDate(task.dueDate)} · {task.resource}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                    style={{ width: `${Math.min(100, task.progress)}%` }}
                  />
                </div>
                {task.critical && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em] text-rose-300">
                    <Zap className="h-3 w-3" />
                    Critical path
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
