"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";

import {
  computeHrDashboardKpis,
  computePeopleOverview,
  computeUpcomingHrEvents,
  computeWorkforceStatus,
  formatVacationRange,
  listContractRenewals,
  listEmployeesCurrentlyOnLeave,
  listProbationReviewsDue,
  listUpcomingAnniversaries,
  listUpcomingBirthdays,
  type HrAttentionItem,
} from "@/lib/hr-dashboard-data";
import type { HrEmployee } from "@/lib/hr-data";
import { getInternalNavHref } from "@/lib/internal-operations-data";
import { listHrActivity } from "@/lib/hr-mock-store";
import { useInternalOperationsBasePath } from "./InternalOperationsBasePathContext";
import { useHrMockStore } from "./useHrMockStore";
import {
  HrBreakdownBars,
  HrKpiTile,
  hrPrimaryButtonClass,
  HrSection,
  hrSecondaryButtonClass,
} from "./hr-ui";

type HrDashboardWorkspaceProps = {
  employees: HrEmployee[];
};

function AttentionList({
  items,
  empty,
}: {
  items: HrAttentionItem[];
  empty: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-white/45">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{item.name}</p>
            <p className="text-xs text-white/45">{item.detail}</p>
            {item.meta ? <p className="mt-0.5 text-[11px] text-white/35">{item.meta}</p> : null}
          </div>
          {item.when ? (
            <p className="shrink-0 text-xs tabular-nums text-white/50">
              {formatVacationRange(item.when, item.when)}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function HrDashboardWorkspace({ employees }: HrDashboardWorkspaceProps) {
  const basePath = useInternalOperationsBasePath();
  const store = useHrMockStore();
  const kpis = useMemo(() => computeHrDashboardKpis(employees), [employees, store]);
  const overview = useMemo(() => computePeopleOverview(employees), [employees]);
  const workforce = useMemo(() => computeWorkforceStatus(employees), [employees, store]);
  const events = useMemo(() => computeUpcomingHrEvents(employees), [employees, store]);
  const activity = useMemo(() => listHrActivity().slice(0, 8), [store]);
  const birthdays = useMemo(() => listUpcomingBirthdays(employees), [employees]);
  const anniversaries = useMemo(() => listUpcomingAnniversaries(employees), [employees]);
  const onLeave = useMemo(() => listEmployeesCurrentlyOnLeave(employees), [employees, store]);
  const probation = useMemo(() => listProbationReviewsDue(employees), [employees]);
  const contracts = useMemo(() => listContractRenewals(employees), [employees]);

  const quickActions = [
    { label: "Add Employee", href: getInternalNavHref("hr", basePath), icon: UserPlus },
    { label: "Request Leave", href: getInternalNavHref("hr-leave", basePath), icon: CalendarDays },
    {
      label: "Create Vacancy",
      href: getInternalNavHref("hr-recruitment", basePath),
      icon: Plus,
    },
    {
      label: "Schedule Review",
      href: getInternalNavHref("hr-performance", basePath),
      icon: ClipboardList,
    },
    {
      label: "Generate HR Report",
      href: getInternalNavHref("hr-reports", basePath),
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HrKpiTile label="Total Employees" value={kpis.totalEmployees} />
        <HrKpiTile label="Active Employees" value={kpis.activeEmployees} />
        <HrKpiTile label="Employees On Leave" value={kpis.onLeave} />
        <HrKpiTile label="New Starters (30 days)" value={kpis.newStarters30} />
        <HrKpiTile label="Open Vacancies" value={kpis.openVacancies} />
        <HrKpiTile label="Performance Reviews Due" value={kpis.reviewsDue} />
        <HrKpiTile label="Probation Reviews Due" value={kpis.probationReviews} />
        <HrKpiTile label="Contract Renewals" value={kpis.expiringContracts} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <HrSection title="People Overview" subtitle="Distribution across the organisation.">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                By Department
              </p>
              <HrBreakdownBars rows={overview.byDepartment} />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                By Location
              </p>
              <HrBreakdownBars rows={overview.byLocation} />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                By Employment Type
              </p>
              <HrBreakdownBars rows={overview.byEmploymentType} />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                By Role
              </p>
              <HrBreakdownBars rows={overview.byRole} />
            </div>
          </div>
        </HrSection>

        <HrSection title="Workforce Status" subtitle="Who is working, away, or training today.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["Active", workforce.active],
                ["Annual Leave", workforce.annualLeave],
                ["Sick Leave", workforce.sickLeave],
                ["Maternity / Paternity", workforce.maternityPaternity],
                ["Remote", workforce.remote],
                ["Training", workforce.training],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-[#0b1524]/70 px-3 py-3"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">{label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">{value}</p>
              </div>
            ))}
          </div>
        </HrSection>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <HrSection title="Upcoming Birthdays" subtitle="Next 45 days.">
          <AttentionList
            items={birthdays}
            empty="Date of birth is not captured on employee records yet. Add DOB to enable birthday reminders."
          />
        </HrSection>
        <HrSection title="Work Anniversaries" subtitle="Next 45 days.">
          <AttentionList
            items={anniversaries}
            empty="No work anniversaries in the next 45 days."
          />
        </HrSection>
        <HrSection title="Currently On Leave" subtitle="Approved absences today.">
          <AttentionList items={onLeave} empty="Nobody is currently on leave." />
        </HrSection>
        <HrSection title="Probation Reviews Due" subtitle="Employees in probation or nearing review.">
          <AttentionList items={probation} empty="No probation reviews due." />
        </HrSection>
        <HrSection title="Contract Renewals" subtitle="Fixed-term contracts ending within 60 days.">
          <AttentionList items={contracts} empty="No contract renewals in the next 60 days." />
        </HrSection>
        <HrSection title="Upcoming Events" subtitle="Anniversaries, reviews, and returns.">
          <ul className="space-y-2">
            {events.length === 0 ? (
              <li className="text-sm text-white/45">No upcoming events in the next window.</li>
            ) : (
              events.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{event.label}</p>
                    <p className="text-xs text-white/45">{event.detail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-sky-300/80">
                      {event.kind}
                    </p>
                    <p className="text-xs tabular-nums text-white/50">
                      {formatVacationRange(event.when, event.when)}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </HrSection>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <HrSection title="Recent Activity" subtitle="People operations trail.">
          <ul className="space-y-2">
            {activity.length === 0 ? (
              <li className="text-sm text-white/45">No recent activity.</li>
            ) : (
              activity.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                >
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-white/45">{item.detail}</p>
                </li>
              ))
            )}
          </ul>
        </HrSection>

        <HrSection
          title="Quick Actions"
          subtitle="Jump into the common HR workflows."
          actions={
            <Link href={getInternalNavHref("hr", basePath)} className={hrSecondaryButtonClass()}>
              <Users className="h-3.5 w-3.5" />
              Employees
            </Link>
          }
        >
          <div className="flex flex-col gap-2">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href} className={hrPrimaryButtonClass()}>
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Link>
            ))}
          </div>
        </HrSection>
      </div>
    </div>
  );
}
