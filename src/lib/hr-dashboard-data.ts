import {
  HR_DEPARTMENTS,
  HR_EMPLOYMENT_TYPE_LABELS,
  isActiveHeadcountStatus,
  type HrEmployee,
} from "@/lib/hr-data";
import { getHrMockSnapshot } from "@/lib/hr-mock-store";

export type HrUpcomingVacation = {
  employeeName: string;
  location: string;
  startDate: string;
  endDate: string;
  days: number;
};

/** @deprecated Prefer leave requests from hr-mock-store; kept for calendar fallbacks. */
export const HR_UPCOMING_VACATIONS: HrUpcomingVacation[] = [];

export const HR_HEADCOUNT_PERIOD_DAYS = 90;

export type StaffByLocation = {
  location: string;
  count: number;
  share: number;
};

export type HeadcountGrowth = {
  periodDays: number;
  joinedInPeriod: number;
  total: number;
  previousTotal: number;
  percentChange: number;
};

export type HrBreakdownRow = {
  label: string;
  count: number;
  share: number;
};

export type HrDashboardKpis = {
  totalEmployees: number;
  activeEmployees: number;
  onLeave: number;
  newStarters30: number;
  openVacancies: number;
  reviewsDue: number;
  probationReviews: number;
  expiringContracts: number;
};

export type HrWorkforceStatus = {
  active: number;
  annualLeave: number;
  sickLeave: number;
  maternityPaternity: number;
  remote: number;
  training: number;
};

export type HrDashboardEvent = {
  id: string;
  kind: string;
  label: string;
  when: string;
  detail: string;
};

export type HrAttentionItem = {
  id: string;
  name: string;
  detail: string;
  when: string | null;
  meta?: string;
};

function daysFromToday(dateKey: string) {
  const target = new Date(`${dateKey}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isWithinDays(dateKey: string | null | undefined, days: number) {
  if (!dateKey) return false;
  const diff = daysFromToday(dateKey);
  return diff >= 0 && diff <= days;
}

function joinedWithinDays(employee: HrEmployee, days: number) {
  const joined = new Date(employee.dateJoined);
  if (Number.isNaN(joined.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return joined >= cutoff;
}

function countBy(values: string[]) {
  const map = new Map<string, number>();
  for (const value of values) {
    const key = value.trim() || "Unassigned";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const total = values.length || 1;
  return [...map.entries()]
    .map(([label, count]) => ({
      label,
      count,
      share: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function countStaffByLocation(employees: HrEmployee[]): StaffByLocation[] {
  return countBy(employees.map((employee) => employee.location || "Barcelona")).map((row) => ({
    location: row.label,
    count: row.count,
    share: row.share,
  }));
}

export function computeHeadcountGrowth(
  employees: HrEmployee[],
  periodDays = HR_HEADCOUNT_PERIOD_DAYS,
): HeadcountGrowth {
  const joinedInPeriod = employees.filter((employee) =>
    joinedWithinDays(employee, periodDays),
  ).length;
  const total = employees.length;
  const previousTotal = Math.max(total - joinedInPeriod, 0);
  const percentChange =
    previousTotal > 0
      ? Math.round((joinedInPeriod / previousTotal) * 100)
      : joinedInPeriod > 0
        ? 100
        : 0;
  return { periodDays, joinedInPeriod, total, previousTotal, percentChange };
}

export function formatVacationRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric" });
  const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short" });
  const fullFmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (startDate === endDate) return fullFmt.format(start);
  if (sameMonth) {
    return `${dayFmt.format(start)}–${dayFmt.format(end)} ${monthFmt.format(start)}`;
  }
  return `${fullFmt.format(start)} – ${fullFmt.format(end)}`;
}

export function daysUntilVacation(startDate: string) {
  return daysFromToday(startDate);
}

export function upcomingVacationsSorted(vacations: HrUpcomingVacation[] = []) {
  return [...vacations].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
}

function isoToday() {
  const date = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function computeHrDashboardKpis(employees: HrEmployee[]): HrDashboardKpis {
  const store = getHrMockSnapshot();
  const today = isoToday();
  const onLeaveFromRequests = store.leaveRequests.filter(
    (request) =>
      request.status === "approved" &&
      request.startDate <= today &&
      request.endDate >= today &&
      request.type !== "public_holiday",
  ).length;

  const onLeaveEmployees = employees.filter(
    (employee) => employee.employmentStatus === "leave_of_absence",
  ).length;

  return {
    totalEmployees: employees.length,
    activeEmployees: employees.filter((employee) => isActiveHeadcountStatus(employee.employmentStatus))
      .length,
    onLeave: Math.max(onLeaveFromRequests, onLeaveEmployees),
    newStarters30: employees.filter((employee) => joinedWithinDays(employee, 30)).length,
    openVacancies: store.vacancies.filter((vacancy) => vacancy.status === "open").length,
    reviewsDue: store.reviews.filter(
      (review) =>
        review.status === "draft" ||
        review.status === "submitted" ||
        (review.nextReviewDate && isWithinDays(review.nextReviewDate, 30)),
    ).length,
    probationReviews: employees.filter(
      (employee) =>
        employee.employmentStatus === "probation" ||
        isWithinDays(employee.probationEndDate, 30),
    ).length,
    expiringContracts: employees.filter((employee) => isWithinDays(employee.endDate, 60)).length,
  };
}

export function computePeopleOverview(employees: HrEmployee[]) {
  return {
    byDepartment: countBy(
      employees.map((employee) => employee.department || HR_DEPARTMENTS[0]!),
    ),
    byLocation: countBy(employees.map((employee) => employee.location || "Barcelona")),
    byEmploymentType: countBy(
      employees.map((employee) => {
        const key = employee.employmentType;
        return key in HR_EMPLOYMENT_TYPE_LABELS
          ? HR_EMPLOYMENT_TYPE_LABELS[key as keyof typeof HR_EMPLOYMENT_TYPE_LABELS]
          : key || "Unassigned";
      }),
    ),
    byRole: countBy(employees.map((employee) => employee.role || "Unassigned")).slice(0, 8),
  };
}

export function computeWorkforceStatus(employees: HrEmployee[]): HrWorkforceStatus {
  const store = getHrMockSnapshot();
  const today = isoToday();
  const activeApproved = store.leaveRequests.filter(
    (request) =>
      request.status === "approved" && request.startDate <= today && request.endDate >= today,
  );

  return {
    active: employees.filter((employee) => isActiveHeadcountStatus(employee.employmentStatus))
      .length,
    annualLeave: activeApproved.filter((request) => request.type === "annual").length,
    sickLeave: activeApproved.filter((request) => request.type === "sick").length,
    maternityPaternity: activeApproved.filter((request) => request.type === "maternity_paternity")
      .length,
    remote: activeApproved.filter((request) => request.type === "remote").length,
    training: activeApproved.filter((request) => request.type === "training").length,
  };
}

/** Birthdays require date of birth on the employee record — honest empty until that field exists. */
export function listUpcomingBirthdays(_employees: HrEmployee[]): HrAttentionItem[] {
  return [];
}

export function listUpcomingAnniversaries(employees: HrEmployee[], withinDays = 45): HrAttentionItem[] {
  return employees
    .flatMap((employee) => {
      if (!employee.dateJoined) return [];
      const next = nextAnniversaryThisYear(employee.dateJoined);
      if (!isWithinDays(next, withinDays)) return [];
      const years = yearsBetween(employee.dateJoined, next);
      if (years <= 0) return [];
      return [
        {
          id: `ann-${employee.id}`,
          name: employee.fullName || employee.preferredName,
          detail: `${years}-year work anniversary`,
          when: next,
          meta: employee.department,
        },
      ];
    })
    .sort((a, b) => (a.when ?? "").localeCompare(b.when ?? ""));
}

export function listEmployeesCurrentlyOnLeave(employees: HrEmployee[]): HrAttentionItem[] {
  const store = getHrMockSnapshot();
  const today = isoToday();
  const fromLeave = store.leaveRequests
    .filter(
      (request) =>
        request.status === "approved" &&
        request.startDate <= today &&
        request.endDate >= today &&
        request.type !== "public_holiday",
    )
    .map((request) => ({
      id: `leave-${request.id}`,
      name: request.employeeName,
      detail: `${request.type.replaceAll("_", " ")} · returns ${formatVacationRange(request.endDate, request.endDate)}`,
      when: request.endDate,
      meta: request.department,
    }));

  const statusLeave = employees
    .filter((employee) => employee.employmentStatus === "leave_of_absence")
    .map((employee) => ({
      id: `status-leave-${employee.id}`,
      name: employee.fullName || employee.preferredName,
      detail: "Leave of absence",
      when: employee.endDate,
      meta: employee.department,
    }));

  const seen = new Set(fromLeave.map((item) => item.name.toLowerCase()));
  return [...fromLeave, ...statusLeave.filter((item) => !seen.has(item.name.toLowerCase()))];
}

export function listProbationReviewsDue(employees: HrEmployee[], withinDays = 45): HrAttentionItem[] {
  return employees
    .filter(
      (employee) =>
        employee.employmentStatus === "probation" ||
        isWithinDays(employee.probationEndDate, withinDays),
    )
    .map((employee) => ({
      id: `prob-${employee.id}`,
      name: employee.fullName || employee.preferredName,
      detail: employee.probationEndDate
        ? `Probation ends ${formatVacationRange(employee.probationEndDate, employee.probationEndDate)}`
        : "Probation review required",
      when: employee.probationEndDate,
      meta: employee.manager || employee.department,
    }))
    .sort((a, b) => (a.when ?? "9999").localeCompare(b.when ?? "9999"));
}

export function listContractRenewals(employees: HrEmployee[], withinDays = 60): HrAttentionItem[] {
  return employees
    .filter((employee) => isWithinDays(employee.endDate, withinDays))
    .map((employee) => ({
      id: `contract-${employee.id}`,
      name: employee.fullName || employee.preferredName,
      detail: `Contract ends ${formatVacationRange(employee.endDate!, employee.endDate!)}`,
      when: employee.endDate,
      meta: employee.department,
    }))
    .sort((a, b) => (a.when ?? "").localeCompare(b.when ?? ""));
}

export function computeUpcomingHrEvents(employees: HrEmployee[]): HrDashboardEvent[] {
  const store = getHrMockSnapshot();
  const events: HrDashboardEvent[] = [];

  for (const item of listUpcomingAnniversaries(employees)) {
    events.push({
      id: item.id,
      kind: "Anniversary",
      label: item.name,
      when: item.when!,
      detail: item.detail,
    });
  }

  for (const item of listContractRenewals(employees)) {
    events.push({
      id: item.id,
      kind: "Contract",
      label: item.name,
      when: item.when!,
      detail: "Contract renewal due",
    });
  }

  for (const item of listProbationReviewsDue(employees)) {
    if (!item.when) continue;
    events.push({
      id: `${item.id}-evt`,
      kind: "Probation",
      label: item.name,
      when: item.when,
      detail: "Probation review due",
    });
  }

  for (const review of store.reviews) {
    if (review.nextReviewDate && isWithinDays(review.nextReviewDate, 45)) {
      events.push({
        id: `review-${review.id}`,
        kind: "Review",
        label: review.employeeName,
        when: review.nextReviewDate,
        detail: "Performance review",
      });
    }
  }

  for (const request of store.leaveRequests) {
    if (
      request.status === "approved" &&
      isWithinDays(request.endDate, 30) &&
      daysFromToday(request.endDate) >= 0
    ) {
      events.push({
        id: `return-${request.id}`,
        kind: "Return",
        label: request.employeeName,
        when: request.endDate,
        detail: "Return from leave",
      });
    }
  }

  return events.sort((a, b) => a.when.localeCompare(b.when)).slice(0, 12);
}

function nextAnniversaryThisYear(isoDate: string) {
  const source = new Date(`${isoDate}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const next = new Date(today.getFullYear(), source.getMonth(), source.getDate(), 12);
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

function yearsBetween(fromIso: string, toIso: string) {
  const from = new Date(`${fromIso}T12:00:00`);
  const to = new Date(`${toIso}T12:00:00`);
  return Math.max(0, to.getFullYear() - from.getFullYear());
}
