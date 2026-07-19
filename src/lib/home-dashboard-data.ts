/**
 * Workspace-isolated Home Dashboard empty payloads.
 * No global Unit311 mock content — tiles render empty until module data is workspace-scoped.
 */

import type {
  ActionItem,
  ProjectInProgress,
  RevenuePeriodPoint,
  SupportOutstandingPoint,
  UpcomingMission,
  WeekDay,
} from "@/lib/internal-operations-command-data";

export type {
  ActionItem,
  ProjectInProgress,
  RevenuePeriodPoint,
  SupportOutstandingPoint,
  UpcomingMission,
  WeekDay,
};

export { missionStatusClass, priorityDotClass } from "@/lib/internal-operations-command-data";

/** Empty revenue KPIs for the current workspace (no mock figures). */
export const emptyExecutiveRevenueSummary = {
  pastMonth: { label: "Past month", value: 0, change: "—" },
  pastQuarter: { label: "Past quarter", value: 0, change: "—" },
  expectedMonth: { label: "Expected next month", value: 0, change: "—" },
  expectedQuarter: { label: "Expected next quarter", value: 0, change: "—" },
} as const;

export const emptyRevenueTrendData: RevenuePeriodPoint[] = [
  { label: "Apr", actual: 0 },
  { label: "May", actual: 0 },
  { label: "Jun", actual: 0 },
  { label: "Jul", forecast: 0 },
  { label: "Aug", forecast: 0 },
  { label: "Sep", forecast: 0 },
];

export const emptySupportOutstandingTrend: SupportOutstandingPoint[] = [
  { week: "W1", outstanding: 0, resolved: 0 },
  { week: "W2", outstanding: 0, resolved: 0 },
  { week: "W3", outstanding: 0, resolved: 0 },
  { week: "W4", outstanding: 0, resolved: 0 },
  { week: "W5", outstanding: 0, resolved: 0 },
  { week: "W6", outstanding: 0, resolved: 0 },
];

export const emptyThisWeekSchedule: WeekDay[] = [
  { day: "Mon", entries: [] },
  { day: "Tue", entries: [] },
  { day: "Wed", entries: [] },
  { day: "Thu", entries: [] },
  { day: "Fri", entries: [] },
];

export const emptyProjectsInProgress: ProjectInProgress[] = [];
export const emptyUpcomingMissions: UpcomingMission[] = [];
export const emptyActionItems: ActionItem[] = [];
