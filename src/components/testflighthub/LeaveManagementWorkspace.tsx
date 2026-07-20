"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, X } from "lucide-react";

import {
  HR_LEAVE_STATUSES,
  HR_LEAVE_STATUS_LABELS,
  HR_LEAVE_TYPE_COLORS,
  HR_LEAVE_TYPE_LABELS,
  HR_LEAVE_TYPES,
  leaveStatusClass,
  type HrLeaveRequest,
  type HrLeaveStatus,
  type HrLeaveType,
} from "@/lib/hr-leave-data";
import { formatVacationRange as formatRange } from "@/lib/hr-dashboard-data";
import {
  updateLeaveRequestStatus,
  upsertLeaveRequest,
} from "@/lib/hr-mock-store";
import { useHrMockStore } from "./useHrMockStore";
import {
  HrFieldLabel,
  hrInputClass,
  HrKpiTile,
  hrPrimaryButtonClass,
  HrSection,
  hrSecondaryButtonClass,
  HrStatusPill,
} from "./hr-ui";

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

function todayKey() {
  return toDateKey(new Date());
}

function getCurrentWeekRange(referenceDate = new Date()) {
  const day = referenceDate.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(referenceDate);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(referenceDate.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
  const label = `${fmt.format(monday)} – ${fmt.format(sunday)}`;

  return { start: toDateKey(monday), end: toDateKey(sunday), label };
}

function approvedLeaveOverlappingWeek(
  requests: HrLeaveRequest[],
  weekStart: string,
  weekEnd: string,
) {
  return requests
    .filter(
      (request) =>
        request.status === "approved" &&
        request.startDate <= weekEnd &&
        request.endDate >= weekStart,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function formatHolidayDate(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

export default function LeaveManagementWorkspace() {
  const store = useHrMockStore();
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [location, setLocation] = useState("all");
  const [department, setDepartment] = useState("all");
  const [manager, setManager] = useState("all");
  const [role, setRole] = useState("all");
  const [employee, setEmployee] = useState("all");
  const [status, setStatus] = useState<HrLeaveStatus | "all">("all");
  const [calendarDepartment, setCalendarDepartment] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<HrLeaveRequest | null>(null);

  const weekRange = useMemo(() => getCurrentWeekRange(), []);
  const today = todayKey();

  const filtered = useMemo(() => {
    return store.leaveRequests.filter((request) => {
      if (location !== "all" && request.location !== location) return false;
      if (department !== "all" && request.department !== department) return false;
      if (manager !== "all" && request.managerName !== manager) return false;
      if (role !== "all" && request.role !== role) return false;
      if (employee !== "all" && request.employeeName !== employee) return false;
      if (status !== "all" && request.status !== status) return false;
      return true;
    });
  }, [store.leaveRequests, location, department, manager, role, employee, status]);

  const calendarRequests = useMemo(() => {
    if (calendarDepartment === "all") return filtered;
    return filtered.filter((request) => request.department === calendarDepartment);
  }, [filtered, calendarDepartment]);

  const unique = useMemo(() => {
    const collect = (pick: (r: HrLeaveRequest) => string) =>
      [...new Set(store.leaveRequests.map(pick))].sort();
    return {
      locations: collect((r) => r.location),
      departments: collect((r) => r.department),
      managers: collect((r) => r.managerName),
      roles: collect((r) => r.role),
      employees: collect((r) => r.employeeName),
    };
  }, [store.leaveRequests]);

  const todaysAbsences = filtered.filter(
    (request) =>
      request.status === "approved" && request.startDate <= today && request.endDate >= today,
  );

  const offThisWeek = useMemo(
    () => approvedLeaveOverlappingWeek(filtered, weekRange.start, weekRange.end),
    [filtered, weekRange.end, weekRange.start],
  );

  const upcoming = filtered
    .filter((request) => request.status === "approved" && request.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 8);

  const pending = filtered.filter((request) => request.status === "pending");

  const filteredBalances = useMemo(() => {
    if (department === "all") return store.leaveBalances;
    return store.leaveBalances.filter((balance) => balance.department === department);
  }, [department, store.leaveBalances]);

  const publicHolidays = useMemo(() => {
    return [...store.publicHolidays].sort((a, b) => a.date.localeCompare(b.date));
  }, [store.publicHolidays]);

  const calendar = useMemo(() => {
    const grid = buildMonthGrid(monthCursor.year, monthCursor.month);
    const monthLabel = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(new Date(monthCursor.year, monthCursor.month, 1));
    const byDate = new Map<string, Array<{ name: string; type: HrLeaveType }>>();

    for (const holiday of store.publicHolidays) {
      const list = byDate.get(holiday.date) ?? [];
      list.push({ name: holiday.name, type: "public_holiday" });
      byDate.set(holiday.date, list);
    }
    for (const request of calendarRequests) {
      if (request.status !== "approved" && request.status !== "pending") continue;
      for (const date of grid) {
        const key = toDateKey(date);
        if (key >= request.startDate && key <= request.endDate) {
          const list = byDate.get(key) ?? [];
          list.push({ name: request.employeeName, type: request.type });
          byDate.set(key, list);
        }
      }
    }
    return { grid, monthLabel, byDate, month: monthCursor.month };
  }, [calendarRequests, store.publicHolidays, monthCursor]);

  const selected = filtered.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HrKpiTile label="Today's Absences" value={todaysAbsences.length} />
        <HrKpiTile label="Off This Week" value={offThisWeek.length} hint={weekRange.label} />
        <HrKpiTile label="Pending Approvals" value={pending.length} />
        <HrKpiTile label="Upcoming Leave" value={upcoming.length} />
      </section>

      <HrSection title="Filters">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              ["Location", location, setLocation, unique.locations],
              ["Department", department, setDepartment, unique.departments],
              ["Manager", manager, setManager, unique.managers],
              ["Role", role, setRole, unique.roles],
              ["Employee", employee, setEmployee, unique.employees],
            ] as const
          ).map(([label, value, setter, options]) => (
            <div key={label}>
              <HrFieldLabel>{label}</HrFieldLabel>
              <select
                className={hrInputClass()}
                value={value}
                onChange={(event) => setter(event.target.value)}
              >
                <option value="all">All</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div>
            <HrFieldLabel>Status</HrFieldLabel>
            <select
              className={hrInputClass()}
              value={status}
              onChange={(event) => setStatus(event.target.value as HrLeaveStatus | "all")}
            >
              <option value="all">All</option>
              {HR_LEAVE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {HR_LEAVE_STATUS_LABELS[item]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </HrSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <HrSection title="Today's Absences" subtitle="Approved leave covering today.">
          <ul className="space-y-2">
            {todaysAbsences.length === 0 ? (
              <li className="text-sm text-white/45">No absences today.</li>
            ) : (
              todaysAbsences.map((request) => (
                <li key={request.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{request.employeeName}</p>
                      <p className="text-xs text-white/45">
                        {request.department} · {request.role}
                      </p>
                    </div>
                    <HrStatusPill
                      className={`${HR_LEAVE_TYPE_COLORS[request.type].bg} ${HR_LEAVE_TYPE_COLORS[request.type].text} border-transparent`}
                    >
                      {HR_LEAVE_TYPE_LABELS[request.type]}
                    </HrStatusPill>
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    {formatRange(request.startDate, request.endDate)} · {request.days} days
                  </p>
                </li>
              ))
            )}
          </ul>
        </HrSection>

        <HrSection
          title="Who's Off This Week"
          subtitle={`Mon–Sun · ${weekRange.label}`}
        >
          <ul className="space-y-2">
            {offThisWeek.length === 0 ? (
              <li className="text-sm text-white/45">No approved leave this week.</li>
            ) : (
              offThisWeek.map((request) => (
                <li key={request.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
                  <p className="font-medium text-white">{request.employeeName}</p>
                  <p className="text-xs text-white/45">
                    {HR_LEAVE_TYPE_LABELS[request.type]} · {request.department}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {formatRange(request.startDate, request.endDate)} · {request.days} days
                  </p>
                </li>
              ))
            )}
          </ul>
        </HrSection>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <HrSection title="Pending Approvals" subtitle="Requests awaiting manager decision.">
          <ul className="space-y-2">
            {pending.length === 0 ? (
              <li className="text-sm text-white/45">No pending requests.</li>
            ) : (
              pending.map((request) => (
                <li key={request.id} className="rounded-xl border border-white/10 px-3 py-2">
                  <p className="text-sm font-medium text-white">{request.employeeName}</p>
                  <p className="text-xs text-white/45">
                    {HR_LEAVE_TYPE_LABELS[request.type]} · {formatRange(request.startDate, request.endDate)} ·{" "}
                    {request.days} days
                  </p>
                  <p className="text-xs text-white/40">Manager: {request.managerName}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className={hrPrimaryButtonClass()}
                      onClick={() => updateLeaveRequestStatus(request.id, "approved")}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      className={hrSecondaryButtonClass()}
                      onClick={() => updateLeaveRequestStatus(request.id, "rejected")}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </HrSection>

        <HrSection title="Upcoming Leave" subtitle="Approved leave starting after today.">
          <ul className="space-y-2">
            {upcoming.length === 0 ? (
              <li className="text-sm text-white/45">No upcoming approved leave.</li>
            ) : (
              upcoming.map((request) => (
                <li key={request.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
                  <p className="font-medium text-white">{request.employeeName}</p>
                  <p className="text-xs text-white/45">
                    {HR_LEAVE_TYPE_LABELS[request.type]} · {request.department}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {formatRange(request.startDate, request.endDate)} · {request.days} days
                  </p>
                </li>
              ))
            )}
          </ul>
        </HrSection>
      </div>

      <HrSection
        title="Department Calendar"
        subtitle={`${calendar.monthLabel} · approved and pending leave by day`}
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[10rem]">
              <HrFieldLabel>Department</HrFieldLabel>
              <select
                className={hrInputClass()}
                value={calendarDepartment}
                onChange={(event) => setCalendarDepartment(event.target.value)}
              >
                <option value="all">All departments</option>
                {unique.departments.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={hrSecondaryButtonClass()}
              onClick={() =>
                setMonthCursor((current) => {
                  const date = new Date(current.year, current.month - 1, 1);
                  return { year: date.getFullYear(), month: date.getMonth() };
                })
              }
            >
              Previous
            </button>
            <button
              type="button"
              className={hrSecondaryButtonClass()}
              onClick={() =>
                setMonthCursor((current) => {
                  const date = new Date(current.year, current.month + 1, 1);
                  return { year: date.getFullYear(), month: date.getMonth() };
                })
              }
            >
              Next
            </button>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {HR_LEAVE_TYPES.filter((type) => type !== "unpaid" && type !== "compassionate").map(
            (type) => (
              <span
                key={type}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] ${HR_LEAVE_TYPE_COLORS[type].bg} ${HR_LEAVE_TYPE_COLORS[type].text}`}
              >
                <span className={`h-2 w-2 rounded-full ${HR_LEAVE_TYPE_COLORS[type].dot}`} />
                {HR_LEAVE_TYPE_LABELS[type]}
              </span>
            ),
          )}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.12em] text-white/40">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {calendar.grid.map((date) => {
            const key = toDateKey(date);
            const inMonth = date.getMonth() === calendar.month;
            const entries = calendar.byDate.get(key) ?? [];
            const primary = entries[0];
            return (
              <div
                key={key}
                className={`min-h-[4.5rem] rounded-xl border px-1.5 py-1 ${
                  inMonth ? "border-white/10 bg-[#0b1524]/70" : "border-transparent bg-transparent opacity-40"
                } ${key === today ? "ring-1 ring-sky-400/40" : ""}`}
              >
                <p className="text-[11px] tabular-nums text-white/50">{date.getDate()}</p>
                {primary ? (
                  <p
                    className={`mt-1 truncate rounded px-1 py-0.5 text-[10px] ${HR_LEAVE_TYPE_COLORS[primary.type].bg} ${HR_LEAVE_TYPE_COLORS[primary.type].text}`}
                    title={entries.map((entry) => entry.name).join(", ")}
                  >
                    {primary.name}
                    {entries.length > 1 ? ` +${entries.length - 1}` : ""}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </HrSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <HrSection title="Public Holidays" subtitle="Company calendar dates.">
          <ul className="space-y-2">
            {publicHolidays.length === 0 ? (
              <li className="text-sm text-white/45">No public holidays configured.</li>
            ) : (
              publicHolidays.map((holiday) => (
                <li
                  key={holiday.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-white">{holiday.name}</p>
                    <p className="text-xs text-white/45">{holiday.calendar}</p>
                  </div>
                  <p className="shrink-0 text-xs tabular-nums text-white/55">
                    {formatHolidayDate(holiday.date)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </HrSection>

        <HrSection
          title="Leave Balances"
          subtitle={department === "all" ? "All employees" : `${department} department`}
        >
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {filteredBalances.length === 0 ? (
              <li className="text-sm text-white/45">No balance records for this filter.</li>
            ) : (
              filteredBalances.map((balance) => {
                const annualRemaining = balance.annualAllocated - balance.annualTaken;
                return (
                  <li
                    key={balance.employeeId}
                    className="rounded-xl border border-white/10 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-white">{balance.employeeName}</p>
                    <p className="text-xs text-white/45">
                      {balance.department} · {balance.location}
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                      <div className="rounded-lg border border-white/10 px-2 py-1.5">
                        <p className="text-white/40">Annual</p>
                        <p className="tabular-nums text-white/80">
                          {annualRemaining} left · {balance.annualTaken}/{balance.annualAllocated} used
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 px-2 py-1.5">
                        <p className="text-white/40">Sick</p>
                        <p className="tabular-nums text-white/80">{balance.sickTaken} days</p>
                      </div>
                      <div className="rounded-lg border border-white/10 px-2 py-1.5">
                        <p className="text-white/40">Training</p>
                        <p className="tabular-nums text-white/80">{balance.trainingTaken} days</p>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </HrSection>
      </div>

      <HrSection title="Leave Requests" subtitle="Approve, reject, view, or edit requests.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-white/40">
              <tr>
                <th className="px-2 py-2">Employee</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Start</th>
                <th className="px-2 py-2">End</th>
                <th className="px-2 py-2">Days</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Manager</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((request) => (
                <tr key={request.id} className="border-t border-white/10">
                  <td className="px-2 py-2.5 text-white">{request.employeeName}</td>
                  <td className="px-2 py-2.5 text-white/70">{HR_LEAVE_TYPE_LABELS[request.type]}</td>
                  <td className="px-2 py-2.5 tabular-nums text-white/60">{request.startDate}</td>
                  <td className="px-2 py-2.5 tabular-nums text-white/60">{request.endDate}</td>
                  <td className="px-2 py-2.5 tabular-nums text-white/60">{request.days}</td>
                  <td className="px-2 py-2.5">
                    <HrStatusPill className={leaveStatusClass(request.status)}>
                      {HR_LEAVE_STATUS_LABELS[request.status]}
                    </HrStatusPill>
                  </td>
                  <td className="px-2 py-2.5 text-white/60">{request.managerName}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className={hrSecondaryButtonClass()}
                        onClick={() => setSelectedId(request.id)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className={hrSecondaryButtonClass()}
                        onClick={() => setEditing({ ...request })}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      {request.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className={hrPrimaryButtonClass()}
                            onClick={() => updateLeaveRequestStatus(request.id, "approved")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className={hrSecondaryButtonClass()}
                            onClick={() => updateLeaveRequestStatus(request.id, "rejected")}
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected ? (
          <div className="mt-4 rounded-xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm text-white/80">
            <p className="font-semibold text-white">{selected.employeeName}</p>
            <p className="mt-1">
              {HR_LEAVE_TYPE_LABELS[selected.type]} · {formatRange(selected.startDate, selected.endDate)} ·{" "}
              {selected.days} days
            </p>
            <p className="mt-1 text-white/55">{selected.notes || "No notes provided."}</p>
          </div>
        ) : null}
        {editing ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-white/15 bg-[#0b1524] p-4 sm:grid-cols-2">
            <div>
              <HrFieldLabel>Type</HrFieldLabel>
              <select
                className={hrInputClass()}
                value={editing.type}
                onChange={(event) =>
                  setEditing({ ...editing, type: event.target.value as HrLeaveType })
                }
              >
                {HR_LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {HR_LEAVE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <HrFieldLabel>Notes</HrFieldLabel>
              <input
                className={hrInputClass()}
                value={editing.notes}
                onChange={(event) => setEditing({ ...editing, notes: event.target.value })}
              />
            </div>
            <div>
              <HrFieldLabel>Start</HrFieldLabel>
              <input
                type="date"
                className={hrInputClass()}
                value={editing.startDate}
                onChange={(event) => setEditing({ ...editing, startDate: event.target.value })}
              />
            </div>
            <div>
              <HrFieldLabel>End</HrFieldLabel>
              <input
                type="date"
                className={hrInputClass()}
                value={editing.endDate}
                onChange={(event) => setEditing({ ...editing, endDate: event.target.value })}
              />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button
                type="button"
                className={hrPrimaryButtonClass()}
                onClick={() => {
                  upsertLeaveRequest(editing);
                  setEditing(null);
                }}
              >
                Save changes
              </button>
              <button
                type="button"
                className={hrSecondaryButtonClass()}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </HrSection>
    </div>
  );
}
