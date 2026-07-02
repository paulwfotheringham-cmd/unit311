"use client";

import { useMemo, useState } from "react";

import {
  computeHeadcountGrowth,
  countStaffByLocation,
  formatVacationRange,
  HR_HEADCOUNT_PERIOD_DAYS,
  HR_UPCOMING_VACATIONS,
  upcomingVacationsSorted,
} from "@/lib/hr-dashboard-data";
import type { HrEmployee } from "@/lib/hr-data";
import { cn } from "@/lib/utils";
import { CalendarDays, LayoutGrid, MapPin, TrendingUp, Users } from "lucide-react";

const LOCATION_COLORS: Record<string, string> = {
  Barcelona: "bg-sky-400",
  Madrid: "bg-amber-400",
  Remote: "bg-emerald-400",
  Hybrid: "bg-violet-400",
};

type HrDashboardPanelProps = {
  employees: HrEmployee[];
};

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateInRange(dateKey: string, startDate: string, endDate: string) {
  return dateKey >= startDate && dateKey <= endDate;
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startDay);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function toDateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function HrDashboardPanel({ employees }: HrDashboardPanelProps) {
  const [showLeaveCalendar, setShowLeaveCalendar] = useState(false);
  const staffByLocation = useMemo(() => countStaffByLocation(employees), [employees]);
  const growth = useMemo(() => computeHeadcountGrowth(employees), [employees]);
  const upcoming = useMemo(() => upcomingVacationsSorted(HR_UPCOMING_VACATIONS), []);
  const maxLocationCount = Math.max(...staffByLocation.map((entry) => entry.count), 1);

  const leaveCalendar = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
      now,
    );
    const grid = buildMonthGrid(year, month);
    const leaveByDate = new Map<string, string[]>();

    for (const vacation of HR_UPCOMING_VACATIONS) {
      for (const date of grid) {
        const key = toDateKey(date);
        if (dateInRange(key, vacation.startDate, vacation.endDate)) {
          const list = leaveByDate.get(key) ?? [];
          list.push(vacation.employeeName);
          leaveByDate.set(key, list);
        }
      }
    }

    return { monthLabel, grid, month, leaveByDate };
  }, []);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <article className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-5">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-sky-300" />
          <h3 className="text-sm font-semibold text-white">Staff by location</h3>
        </div>
        <p className="mt-1 text-xs text-white/45">{employees.length} employees across sites</p>

        <ul className="mt-4 space-y-3">
          {staffByLocation.length === 0 ? (
            <li className="text-xs text-white/40">No employees on record yet.</li>
          ) : (
            staffByLocation.map((entry) => (
              <li key={entry.location}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-white/85">{entry.location}</span>
                  <span className="text-white/50">
                    {entry.count} · {entry.share}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      LOCATION_COLORS[entry.location] ?? "bg-violet-400",
                    )}
                    style={{ width: `${(entry.count / maxLocationCount) * 100}%` }}
                  />
                </div>
              </li>
            ))
          )}
        </ul>
      </article>

      <article className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-300" />
          <h3 className="text-sm font-semibold text-white">Headcount growth</h3>
        </div>
        <p className="mt-1 text-xs text-white/45">Last {HR_HEADCOUNT_PERIOD_DAYS} days</p>

        <div className="mt-4 flex items-end gap-3">
          <p className="text-4xl font-semibold tabular-nums text-white">
            +{growth.joinedInPeriod}
          </p>
          <div className="pb-1">
            <p
              className={cn(
                "text-sm font-semibold",
                growth.percentChange > 0 ? "text-emerald-300" : "text-white/50",
              )}
            >
              {growth.percentChange > 0 ? `+${growth.percentChange}%` : "No change"}
            </p>
            <p className="text-[11px] text-white/40">vs prior {growth.previousTotal}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">Total staff</p>
            <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-white">
              <Users className="h-4 w-4 text-violet-300" />
              {growth.total}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">New hires</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">{growth.joinedInPeriod}</p>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-amber-300" />
            <h3 className="text-sm font-semibold text-white">Upcoming leave</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowLeaveCalendar((current) => !current)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors",
              showLeaveCalendar
                ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/75",
            )}
          >
            <LayoutGrid className="h-3 w-3" />
            Calendar view
          </button>
        </div>
        <p className="mt-1 text-xs text-white/45">Demo schedule · next 8 weeks</p>

        {showLeaveCalendar ? (
          <div className="mt-4">
            <p className="text-xs font-medium text-white/70">{leaveCalendar.monthLabel}</p>
            <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[9px] font-medium uppercase tracking-[0.08em] text-white/40">
              {weekdayLabels.map((label) => (
                <div key={label} className="py-1">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {leaveCalendar.grid.map((date) => {
                const key = toDateKey(date);
                const onLeave = leaveCalendar.leaveByDate.get(key) ?? [];
                const inMonth = date.getMonth() === leaveCalendar.month;
                const isToday = toDateKey(new Date()) === key;

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex min-h-[2.75rem] flex-col rounded-md border p-0.5 text-left",
                      inMonth ? "border-white/8 bg-white/[0.03]" : "border-transparent opacity-35",
                      onLeave.length > 0 && "border-amber-400/30 bg-amber-500/10",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-medium",
                        isToday ? "bg-amber-400 text-black" : "text-white/70",
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {onLeave.length > 0 && (
                      <span className="mt-0.5 truncate text-[8px] leading-tight text-amber-200/90">
                        {onLeave.length === 1 ? onLeave[0].split(" ")[0] : `${onLeave.length} away`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <ul className="mt-4 max-h-[220px] space-y-2 overflow-y-auto pr-1">
            {upcoming.map((vacation) => (
              <li
                key={`${vacation.employeeName}-${vacation.startDate}`}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{vacation.employeeName}</p>
                    <p className="mt-0.5 text-[11px] text-white/45">{vacation.location}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                    {vacation.days}d
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-sky-200/90">
                  {formatVacationRange(vacation.startDate, vacation.endDate)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
