/**
 * Executive Home Dashboard — derive attention, schedule, snapshot, and activity
 * from live workspace payloads. Mock only where APIs do not exist (contracts, leave).
 */

import type { CalendarEvent } from "@/lib/calendar-data";
import type { ManagedClient } from "@/lib/client-management-data";
import type { CorporateContract } from "@/lib/corporate-data";
import type { ExternalUser } from "@/lib/external-users-data";
import type { HrLeaveRequest } from "@/lib/hr-leave-data";
import { HR_LEAVE_TYPE_LABELS } from "@/lib/hr-leave-data";
import type { ActionPriority } from "@/lib/internal-operations-command-data";
import type { InternalProject } from "@/lib/projects-data";
import type { SupportTicket } from "@/lib/support-data";

export type ExecutiveActionItem = {
  id: string;
  priority: ActionPriority;
  title: string;
  description: string;
  owner: string;
  due: string;
  module: string;
  primaryLabel: "Approve" | "Review" | "Open";
  href: string;
};

export type ScheduleEntry = {
  id: string;
  kind:
    | "Meeting"
    | "Deadline"
    | "Milestone"
    | "Leave"
    | "Birthday"
    | "Anniversary"
    | "Training"
    | "Task";
  title: string;
  when: string;
  href: string;
};

export type ActivityEntry = {
  id: string;
  kind:
    | "Client"
    | "Project"
    | "Contract"
    | "Support"
    | "Document"
    | "Employee"
    | "CRM"
    | "Finance"
    | "Engineering"
    | "Training"
    | "Inventory"
    | "HR";
  title: string;
  detail: string;
  when: string;
  href: string;
};

export type MyWorkEntry = {
  id: string;
  label: string;
  detail: string;
  href: string;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function daysUntil(isoDate: string) {
  const target = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  const today = startOfToday();
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDay(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
    }).format(new Date(iso.includes("T") ? iso : `${iso}T12:00:00`));
  } catch {
    return iso;
  }
}

function priorityRank(priority: ActionPriority) {
  switch (priority) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
  }
}

export function priorityBarClass(priority: ActionPriority) {
  switch (priority) {
    case "critical":
      return "bg-rose-400";
    case "high":
      return "bg-orange-400";
    case "medium":
      return "bg-amber-400";
    case "low":
      return "bg-emerald-400";
  }
}

export function priorityPillClass(priority: ActionPriority) {
  switch (priority) {
    case "critical":
      return "border-rose-400/35 bg-rose-500/15 text-rose-100";
    case "high":
      return "border-orange-400/35 bg-orange-500/15 text-orange-100";
    case "medium":
      return "border-amber-400/35 bg-amber-500/15 text-amber-100";
    case "low":
      return "border-emerald-400/35 bg-emerald-500/15 text-emerald-100";
  }
}

type BuildActionsInput = {
  apiItems: Array<{
    id: string;
    priority: ActionPriority;
    task: string;
    assignedTo: string;
    due: string;
    href: string | null;
  }>;
  projects: InternalProject[];
  tickets: SupportTicket[];
  contracts: CorporateContract[];
  clients: ManagedClient[];
  hrefs: {
    support: string;
    projects: string;
    clients: string;
    corporateContracts: string;
    hr: string;
  };
};

/** Merge live action-items with derived operational priorities; cap at five. */
export function buildExecutiveActionItems(input: BuildActionsInput): ExecutiveActionItem[] {
  const derived: ExecutiveActionItem[] = [];

  for (const ticket of input.tickets.filter((t) => !t.closed && !t.archived)) {
    if (ticket.priority !== "urgent" && ticket.priority !== "high") continue;
    derived.push({
      id: `ticket-${ticket.id}`,
      priority: ticket.priority === "urgent" ? "critical" : "high",
      title: "Critical support ticket",
      description: `${ticket.name} · ${ticket.organisation}`,
      owner: ticket.userAssigned || "Unassigned",
      due: formatDay(ticket.updatedAt),
      module: "Support",
      primaryLabel: "Review",
      href: input.hrefs.support,
    });
  }

  for (const project of input.projects.filter((p) => p.phase === "live")) {
    const atRisk =
      (project.endDate && daysUntil(project.endDate) <= 14 && project.progressPct < 70) ||
      (project.notes?.toLowerCase().includes("risk") ?? false);
    if (!atRisk) continue;
    derived.push({
      id: `project-${project.id}`,
      priority: "high",
      title: "Project at risk",
      description: `${project.name} · ${project.clientName}`,
      owner: project.operator || "Delivery",
      due: project.endDate ? formatDay(project.endDate) : "Review",
      module: "Projects",
      primaryLabel: "Review",
      href: input.hrefs.projects,
    });
  }

  for (const contract of input.contracts) {
    if (contract.status !== "expiring" && contract.status !== "active") continue;
    const until = daysUntil(contract.expiryDate);
    if (until > 45 || until < -7) continue;
    derived.push({
      id: `contract-${contract.id}`,
      priority: until <= 14 ? "critical" : "high",
      title: "Contract renewal due",
      description: `${contract.name} · ${contract.supplier}`,
      owner: contract.owner,
      due: formatDay(contract.expiryDate),
      module: "Contracts",
      primaryLabel: "Review",
      href: input.hrefs.corporateContracts,
    });
  }

  for (const client of input.clients) {
    if (client.accountStatus !== "Onboarding" && client.accountStatus !== "Client Created") continue;
    derived.push({
      id: `client-${client.id}`,
      priority: "medium",
      title: "Client onboarding awaiting approval",
      description: client.companyName,
      owner: "Operations",
      due: "Today",
      module: "Clients",
      primaryLabel: "Approve",
      href: input.hrefs.clients,
    });
  }

  const fromApi: ExecutiveActionItem[] = input.apiItems.map((item) => ({
    id: item.id,
    priority: item.priority,
    title: item.task,
    description: "Workspace action item",
    owner: item.assignedTo || "Unassigned",
    due: item.due,
    module: "Workspace",
    primaryLabel: item.task.toLowerCase().includes("approv") ? "Approve" : "Open",
    href: item.href || input.hrefs.clients,
  }));

  const seen = new Set<string>();
  const merged = [...fromApi, ...derived]
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 5);

  return merged;
}

type BuildScheduleInput = {
  events: CalendarEvent[];
  projects: InternalProject[];
  leave: HrLeaveRequest[];
  employees?: Array<{ id: string; fullName?: string; name?: string; dateJoined?: string }>;
  hrefs: {
    calendar: string;
    projects: string;
    hrLeave: string;
    training: string;
    hr?: string;
  };
};

export function buildTodaySchedule(input: BuildScheduleInput): ScheduleEntry[] {
  const start = startOfToday();
  const end = endOfToday();
  const entries: ScheduleEntry[] = [];
  const todayMd = `${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;

  for (const event of input.events) {
    const at = new Date(event.startsAt);
    if (at < start || at > end) continue;
    entries.push({
      id: `evt-${event.id}`,
      kind: "Meeting",
      title: event.title,
      when: formatWhen(event.startsAt),
      href: input.hrefs.calendar,
    });
  }

  for (const project of input.projects) {
    if (!project.endDate) continue;
    const until = daysUntil(project.endDate);
    if (until < 0 || until > 0) continue;
    entries.push({
      id: `deadline-${project.id}`,
      kind: "Deadline",
      title: `${project.name} deadline`,
      when: "Today",
      href: input.hrefs.projects,
    });
    if (project.progressPct >= 80) {
      entries.push({
        id: `mile-${project.id}`,
        kind: "Milestone",
        title: `${project.name} nearing completion`,
        when: `${project.progressPct}%`,
        href: input.hrefs.projects,
      });
    }
  }

  const todayIso = start.toISOString().slice(0, 10);
  for (const leave of input.leave) {
    if (leave.status !== "approved" && leave.status !== "pending") continue;
    if (leave.startDate > todayIso || leave.endDate < todayIso) continue;
    const kind =
      leave.type === "training"
        ? ("Training" as const)
        : ("Leave" as const);
    entries.push({
      id: `leave-${leave.id}`,
      kind,
      title: `${leave.employeeName} · ${HR_LEAVE_TYPE_LABELS[leave.type]}`,
      when: leave.status === "pending" ? "Pending" : "Today",
      href: leave.type === "training" ? input.hrefs.training : input.hrefs.hrLeave,
    });
  }

  for (const employee of input.employees ?? []) {
    const joined = employee.dateJoined?.slice(5, 10);
    if (!joined || joined !== todayMd) continue;
    entries.push({
      id: `anniv-${employee.id}`,
      kind: "Anniversary",
      title: `${employee.fullName || employee.name || "Team member"} work anniversary`,
      when: "Today",
      href: input.hrefs.hr ?? input.hrefs.hrLeave,
    });
  }

  return entries
    .sort((a, b) => a.when.localeCompare(b.when))
    .slice(0, 12);
}

type BuildActivityInput = {
  clients: ManagedClient[];
  projects: InternalProject[];
  tickets: SupportTicket[];
  contracts: CorporateContract[];
  employees: Array<{ id: string; fullName?: string; name?: string; updatedAt?: string; createdAt?: string }>;
  hrefs: {
    clients: string;
    projects: string;
    support: string;
    corporateContracts: string;
    files: string;
    hr: string;
  };
};

export function buildRecentActivity(input: BuildActivityInput): ActivityEntry[] {
  const rows: Array<ActivityEntry & { sortAt: number }> = [];

  for (const client of input.clients.slice(0, 40)) {
    const at =
      (client as { updatedAt?: string }).updatedAt ||
      (client as { createdAt?: string }).createdAt ||
      "";
    rows.push({
      id: `c-${client.id}`,
      kind: "Client",
      title: client.companyName,
      detail: client.accountStatus,
      when: at ? formatWhen(at) : "Recent",
      href: input.hrefs.clients,
      sortAt: at ? Date.parse(at) : 0,
    });
  }

  for (const project of input.projects.slice(0, 40)) {
    rows.push({
      id: `p-${project.id}`,
      kind: "Project",
      title: project.name,
      detail: project.clientName,
      when: formatWhen(project.updatedAt),
      href: input.hrefs.projects,
      sortAt: Date.parse(project.updatedAt),
    });
  }

  for (const ticket of input.tickets.slice(0, 40)) {
    rows.push({
      id: `t-${ticket.id}`,
      kind: "Support",
      title: ticket.name,
      detail: ticket.organisation,
      when: formatWhen(ticket.updatedAt),
      href: input.hrefs.support,
      sortAt: Date.parse(ticket.updatedAt),
    });
  }

  for (const contract of input.contracts.slice(0, 20)) {
    rows.push({
      id: `k-${contract.id}`,
      kind: "Contract",
      title: contract.name,
      detail: contract.supplier,
      when: formatDay(contract.expiryDate),
      href: input.hrefs.corporateContracts,
      sortAt: Date.parse(contract.expiryDate),
    });
  }

  for (const employee of input.employees.slice(0, 20)) {
    const at = employee.updatedAt || employee.createdAt || "";
    rows.push({
      id: `e-${employee.id}`,
      kind: "Employee",
      title: employee.fullName || employee.name || "Employee update",
      detail: "HR record",
      when: at ? formatWhen(at) : "Recent",
      href: input.hrefs.hr,
      sortAt: at ? Date.parse(at) : 0,
    });
  }

  // Document uploads — API list may not expose recent files; keep honest empty unless we add later.
  return rows
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, 8)
    .map(({ sortAt: _sortAt, ...rest }) => rest);
}

export function buildMyWork(input: {
  username: string | null;
  displayName: string | null;
  actionItems: ExecutiveActionItem[];
  events: CalendarEvent[];
  unreadCount: number;
  hrefs: {
    calendar: string;
    messaging: string;
    home: string;
  };
}): MyWorkEntry[] {
  const me = [input.username, input.displayName]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());

  const rows: MyWorkEntry[] = [];

  for (const item of input.actionItems) {
    const owner = item.owner.toLowerCase();
    const mine = me.some((token) => token && (owner.includes(token) || token.includes(owner)));
    if (!mine && me.length > 0) continue;
    rows.push({
      id: `mw-${item.id}`,
      label: item.primaryLabel === "Approve" ? "Approval waiting" : "Task assigned",
      detail: item.title,
      href: item.href,
    });
  }

  if (input.unreadCount > 0) {
    rows.push({
      id: "mw-unread",
      label: "Unread notifications",
      detail: `${input.unreadCount} unread message${input.unreadCount === 1 ? "" : "s"}`,
      href: input.hrefs.messaging,
    });
  }

  const start = startOfToday();
  const upcoming = input.events
    .filter((event) => new Date(event.startsAt) >= start)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, 3);

  for (const event of upcoming) {
    rows.push({
      id: `mw-meet-${event.id}`,
      label: "Upcoming meeting",
      detail: `${event.title} · ${formatWhen(event.startsAt)}`,
      href: input.hrefs.calendar,
    });
  }

  return rows.slice(0, 8);
}

export function countOpenTickets(tickets: SupportTicket[]) {
  return tickets.filter((ticket) => !ticket.closed && !ticket.archived).length;
}

export function countLiveProjects(projects: InternalProject[]) {
  return projects.filter((project) => project.phase === "live").length;
}
