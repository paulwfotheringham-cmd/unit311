export type ActionPriority = "critical" | "high" | "medium" | "low";

export type ActionItem = {
  id: string;
  priority: ActionPriority;
  task: string;
  assignedTo: string;
  due: string;
  href?: string;
};

export type WeekEntry = {
  time?: string;
  label: string;
};

export type WeekDay = {
  day: string;
  entries: WeekEntry[];
};

export type UpcomingMission = {
  id: string;
  name: string;
  client: string;
  date: string;
  pilot: string;
  status: "Scheduled" | "Mobilising" | "Confirmed" | "Standby";
};

export type ProjectInProgress = {
  id: string;
  project: string;
  client: string;
  progress: number;
  status: string;
  lastUpdate: string;
  projectHref?: string;
};

export type RevenuePeriodPoint = {
  label: string;
  actual?: number;
  forecast?: number;
};

export type SupportOutstandingPoint = {
  week: string;
  outstanding: number;
  resolved: number;
};

export const executiveRevenueSummary = {
  pastMonth: { label: "Past month", value: 186_000, change: "+12.4%" },
  pastQuarter: { label: "Past quarter", value: 486_000, change: "+9.8%" },
  expectedMonth: { label: "Expected next month", value: 198_000, change: "+6.5%" },
  expectedQuarter: { label: "Expected next quarter", value: 620_000, change: "+11.2%" },
} as const;

export const revenueTrendData: RevenuePeriodPoint[] = [
  { label: "Apr", actual: 138 },
  { label: "May", actual: 162 },
  { label: "Jun", actual: 186 },
  { label: "Jul", forecast: 198 },
  { label: "Aug", forecast: 205 },
  { label: "Sep", forecast: 217 },
];

export const supportOutstandingTrend: SupportOutstandingPoint[] = [
  { week: "19 May", outstanding: 8, resolved: 5 },
  { week: "26 May", outstanding: 11, resolved: 6 },
  { week: "2 Jun", outstanding: 9, resolved: 8 },
  { week: "9 Jun", outstanding: 7, resolved: 7 },
  { week: "16 Jun", outstanding: 6, resolved: 9 },
  { week: "23 Jun", outstanding: 5, resolved: 4 },
];

export const actionRequiredItems: ActionItem[] = [
  {
    id: "action-1",
    priority: "critical",
    task: "Proposal for ABC Ltd awaiting approval",
    assignedTo: "Tom",
    due: "Today",
  },
  {
    id: "action-2",
    priority: "high",
    task: "Mission 214 requires pilot assignment",
    assignedTo: "John",
    due: "Tomorrow",
  },
  {
    id: "action-3",
    priority: "medium",
    task: "Client awaiting deliverables",
    assignedTo: "Tom",
    due: "Wednesday",
  },
  {
    id: "action-4",
    priority: "low",
    task: "Review completed orthophoto",
    assignedTo: "Sarah",
    due: "Friday",
  },
];

export const thisWeekSchedule: WeekDay[] = [
  {
    day: "Monday",
    entries: [
      { time: "09:00", label: "Client call — Iberdrola" },
      { time: "13:00", label: "Internal planning" },
    ],
  },
  {
    day: "Tuesday",
    entries: [{ label: "Mission — Barcelona Solar Farm" }],
  },
  {
    day: "Wednesday",
    entries: [{ label: "Deliverables due" }],
  },
  {
    day: "Thursday",
    entries: [
      { time: "10:30", label: "Site visit — Oxford logistics hub" },
      { time: "15:00", label: "WebODM processing review" },
    ],
  },
  {
    day: "Friday",
    entries: [
      { label: "Mission debrief — Mission 214" },
      { time: "16:00", label: "Weekly ops sync" },
    ],
  },
];

export const upcomingMissions: UpcomingMission[] = [
  {
    id: "mission-1",
    name: "Barcelona Solar Farm",
    client: "Iberdrola Renovables",
    date: "Tue 18 Jun",
    pilot: "Tom",
    status: "Confirmed",
  },
  {
    id: "mission-2",
    name: "Porto Berth Survey",
    client: "APDL",
    date: "Wed 19 Jun",
    pilot: "John",
    status: "Mobilising",
  },
  {
    id: "mission-3",
    name: "Oxford Campus Ortho",
    client: "TerraBuild Infrastructure",
    date: "Thu 20 Jun",
    pilot: "Sarah",
    status: "Scheduled",
  },
  {
    id: "mission-4",
    name: "Mission 214 — Grid corridor",
    client: "Red Eléctrica",
    date: "Fri 21 Jun",
    pilot: "Unassigned",
    status: "Standby",
  },
];

export const projectsInProgress: ProjectInProgress[] = [
  {
    id: "project-1",
    project: "Barcelona Solar",
    client: "Iberdrola Renovables",
    progress: 82,
    status: "Processing",
    lastUpdate: "2 hours ago",
    projectHref: "?view=projects&projectId=project-1",
  },
  {
    id: "project-2",
    project: "Porto Berth Phase 2",
    client: "APDL",
    progress: 54,
    status: "Field capture",
    lastUpdate: "Yesterday",
    projectHref: "?view=projects&projectId=project-2",
  },
  {
    id: "project-3",
    project: "Oxford Logistics Hub",
    client: "TerraBuild Infrastructure",
    progress: 91,
    status: "QA review",
    lastUpdate: "Today",
    projectHref: "?view=projects&projectId=project-3",
  },
];

export function priorityDotClass(priority: ActionPriority) {
  switch (priority) {
    case "critical":
      return "bg-red-400/90 shadow-[0_0_6px_rgba(248,113,113,0.45)]";
    case "high":
      return "bg-orange-400/90 shadow-[0_0_6px_rgba(251,146,60,0.35)]";
    case "medium":
      return "bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.3)]";
    case "low":
      return "bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.3)]";
  }
}

export function missionStatusClass(status: UpcomingMission["status"]) {
  switch (status) {
    case "Confirmed":
      return "border-white/15 bg-white/[0.05] text-white/70";
    case "Mobilising":
      return "border-white/15 bg-white/[0.05] text-white/65";
    case "Scheduled":
      return "border-white/10 bg-white/[0.03] text-white/55";
    case "Standby":
      return "border-white/10 bg-white/[0.03] text-white/45";
  }
}

export function progressBar(filled: number, total = 10) {
  const clamped = Math.max(0, Math.min(100, filled));
  const filledCount = Math.round((clamped / 100) * total);
  return "█".repeat(filledCount) + "░".repeat(total - filledCount);
}
