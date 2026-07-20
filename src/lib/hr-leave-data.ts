/** Leave Management — types and presentation helpers. Future: /api/hr/leave */

export const HR_LEAVE_TYPES = [
  "annual",
  "sick",
  "maternity_paternity",
  "training",
  "remote",
  "public_holiday",
  "unpaid",
  "compassionate",
] as const;

export type HrLeaveType = (typeof HR_LEAVE_TYPES)[number];

export const HR_LEAVE_TYPE_LABELS: Record<HrLeaveType, string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  maternity_paternity: "Maternity / Paternity",
  training: "Training",
  remote: "Remote",
  public_holiday: "Public Holiday",
  unpaid: "Unpaid Leave",
  compassionate: "Compassionate",
};

/** Calendar / legend colours (Tailwind class fragments). */
export const HR_LEAVE_TYPE_COLORS: Record<HrLeaveType, { bg: string; text: string; dot: string }> = {
  annual: { bg: "bg-sky-500/20", text: "text-sky-200", dot: "bg-sky-400" },
  sick: { bg: "bg-rose-500/20", text: "text-rose-200", dot: "bg-rose-400" },
  maternity_paternity: { bg: "bg-fuchsia-500/20", text: "text-fuchsia-200", dot: "bg-fuchsia-400" },
  training: { bg: "bg-amber-500/20", text: "text-amber-200", dot: "bg-amber-400" },
  remote: { bg: "bg-emerald-500/20", text: "text-emerald-200", dot: "bg-emerald-400" },
  public_holiday: { bg: "bg-violet-500/20", text: "text-violet-200", dot: "bg-violet-400" },
  unpaid: { bg: "bg-slate-500/20", text: "text-slate-200", dot: "bg-slate-400" },
  compassionate: { bg: "bg-orange-500/20", text: "text-orange-200", dot: "bg-orange-400" },
};

export const HR_LEAVE_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type HrLeaveStatus = (typeof HR_LEAVE_STATUSES)[number];

export const HR_LEAVE_STATUS_LABELS: Record<HrLeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export type HrLeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  location: string;
  role: string;
  managerName: string;
  type: HrLeaveType;
  startDate: string;
  endDate: string;
  days: number;
  status: HrLeaveStatus;
  notes: string;
  requestedAt: string;
  decidedAt: string | null;
};

export type HrLeaveBalance = {
  employeeId: string;
  employeeName: string;
  department: string;
  location: string;
  annualAllocated: number;
  annualTaken: number;
  sickTaken: number;
  trainingTaken: number;
};

export type HrPublicHoliday = {
  id: string;
  name: string;
  date: string;
  calendar: string;
};

export function leaveStatusClass(status: HrLeaveStatus) {
  switch (status) {
    case "approved":
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
    case "pending":
      return "border-amber-400/30 bg-amber-500/15 text-amber-200";
    case "rejected":
      return "border-rose-400/30 bg-rose-500/15 text-rose-200";
    default:
      return "border-white/15 bg-white/5 text-white/55";
  }
}

export function businessDaysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let days = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
