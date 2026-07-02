"use client";

import {
  actionRequiredItems,
  missionStatusClass,
  priorityDotClass,
  progressBar,
  projectsInProgress,
  thisWeekSchedule,
  upcomingMissions,
  type ActionItem,
} from "@/lib/internal-operations-command-data";
import { cn } from "@/lib/utils";

function SectionPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.015] shadow-[0_12px_40px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="border-b border-white/[0.06] px-3.5 py-2 sm:px-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
          {title}
        </h3>
      </div>
      <div className="px-3.5 py-2.5 sm:px-4">{children}</div>
    </section>
  );
}

function ActionRow({ item }: { item: ActionItem }) {
  return (
    <tr className="border-b border-white/[0.05] last:border-0">
      <td className="w-7 py-1.5 pr-2 align-middle">
        <span
          className={cn("inline-block h-1.5 w-1.5 rounded-full", priorityDotClass(item.priority))}
          aria-label={`${item.priority} priority`}
        />
      </td>
      <td className="py-1.5 pr-3 text-[13px] leading-snug text-white/85">{item.task}</td>
      <td className="hidden py-1.5 pr-3 text-[13px] text-white/50 sm:table-cell">{item.assignedTo}</td>
      <td className="py-1.5 text-right text-[13px] text-white/45 sm:text-left">{item.due}</td>
    </tr>
  );
}

export default function InternalDashboardHome() {
  return (
    <section aria-label="Internal operations command centre" className="min-w-0">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 xl:max-w-7xl 2xl:max-w-[80rem]">
        <SectionPanel title="Action required">
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
                  <th className="pb-1.5 pr-2 font-medium" scope="col">
                    <span className="sr-only">Priority</span>
                  </th>
                  <th className="pb-1.5 pr-3 font-medium" scope="col">
                    Task
                  </th>
                  <th className="hidden pb-1.5 pr-3 font-medium sm:table-cell" scope="col">
                    Assigned to
                  </th>
                  <th className="pb-1.5 font-medium" scope="col">
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
          <div className="space-y-2 sm:hidden">
            {actionRequiredItems.map((item) => (
              <div
                key={`${item.id}-mobile`}
                className="flex gap-2 border-b border-white/[0.05] pb-2 last:border-0 last:pb-0"
              >
                <span
                  className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", priorityDotClass(item.priority))}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-white/85">{item.task}</p>
                  <p className="mt-0.5 text-[11px] text-white/40">
                    {item.assignedTo} · {item.due}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <SectionPanel title="This week">
            <div className="grid grid-cols-1 gap-y-3 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {thisWeekSchedule.map((day) => (
                <div key={day.day} className="min-w-0">
                  <p className="text-[11px] font-medium text-white/65">{day.day}</p>
                  <ul className="mt-1 space-y-0.5">
                    {day.entries.map((entry, index) => (
                      <li
                        key={`${day.day}-${index}`}
                        className="text-[11px] leading-snug text-white/55"
                      >
                        {entry.time ? (
                          <span className="tabular-nums text-white/35">{entry.time} </span>
                        ) : null}
                        <span className="text-white/70">{entry.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </SectionPanel>

          <SectionPanel title="Upcoming missions">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[16rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
                    <th className="pb-1.5 pr-2 font-medium" scope="col">
                      Mission
                    </th>
                    <th className="hidden pb-1.5 pr-2 font-medium sm:table-cell" scope="col">
                      Client
                    </th>
                    <th className="pb-1.5 pr-2 font-medium" scope="col">
                      Date
                    </th>
                    <th className="hidden pb-1.5 pr-2 font-medium md:table-cell" scope="col">
                      Pilot
                    </th>
                    <th className="pb-1.5 font-medium" scope="col">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingMissions.map((mission) => (
                    <tr key={mission.id} className="border-b border-white/[0.05] last:border-0">
                      <td className="py-1.5 pr-2 align-top">
                        <p className="text-[13px] font-medium leading-snug text-white/80">{mission.name}</p>
                        <p className="mt-0.5 text-[10px] text-white/40 sm:hidden">{mission.client}</p>
                      </td>
                      <td className="hidden py-1.5 pr-2 text-[13px] text-white/50 sm:table-cell">
                        {mission.client}
                      </td>
                      <td className="py-1.5 pr-2 text-[13px] text-white/45">{mission.date}</td>
                      <td className="hidden py-1.5 pr-2 text-[13px] text-white/50 md:table-cell">
                        {mission.pilot}
                      </td>
                      <td className="py-1.5 align-top">
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
          </SectionPanel>
        </div>

        <SectionPanel title="Projects in progress">
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[28rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
                  <th className="pb-1.5 pr-3 font-medium" scope="col">
                    Project
                  </th>
                  <th className="hidden pb-1.5 pr-3 font-medium sm:table-cell" scope="col">
                    Client
                  </th>
                  <th className="pb-1.5 pr-3 font-medium" scope="col">
                    Progress
                  </th>
                  <th className="pb-1.5 pr-3 font-medium" scope="col">
                    Status
                  </th>
                  <th className="pb-1.5 font-medium" scope="col">
                    Last update
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectsInProgress.map((project) => (
                  <tr key={project.id} className="border-b border-white/[0.05] last:border-0">
                    <td className="py-1.5 pr-3 text-[13px] font-medium text-white/80">{project.project}</td>
                    <td className="hidden py-1.5 pr-3 text-[13px] text-white/50 sm:table-cell">
                      {project.client}
                    </td>
                    <td className="py-1.5 pr-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] tracking-tight text-white/35">
                          {progressBar(project.progress)}
                        </span>
                        <span className="text-[11px] tabular-nums text-white/45">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="py-1.5 pr-3 text-[13px] text-white/55">{project.status}</td>
                    <td className="py-1.5 text-[13px] text-white/40">{project.lastUpdate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2.5 sm:hidden">
            {projectsInProgress.map((project) => (
              <div
                key={`${project.id}-mobile`}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[13px] font-medium leading-snug text-white/85">
                    {project.project}
                  </p>
                  <span className="shrink-0 text-[11px] tabular-nums text-white/45">
                    {project.progress}%
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-white/40">{project.client}</p>
                <div className="mt-2 font-mono text-[10px] tracking-tight text-white/35">
                  {progressBar(project.progress)}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-white/45">
                  <span>{project.status}</span>
                  <span>{project.lastUpdate}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>
    </section>
  );
}
