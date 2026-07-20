import {
  isClientPreActiveStatus,
  type ManagedClient,
} from "@/lib/client-management-data";
import type { ExternalUser } from "@/lib/external-users-data";
import type { InternalProject } from "@/lib/projects-data";
import type { SupportTicket } from "@/lib/support-data";
import type { DashboardTileDefinition } from "@/lib/dashboard-view-tiles";

export type ClientsDashboardActivityKind =
  | "client_created"
  | "lead_converted"
  | "project_created"
  | "ticket_opened"
  | "external_user_invited";

export type ClientsDashboardActivity = {
  id: string;
  kind: ClientsDashboardActivityKind;
  title: string;
  detail: string;
  at: string;
  clientId?: string | null;
};

export type ClientsDashboardKpis = {
  totalClients: number;
  activeClients: number;
  onboardingClients: number;
  dormantClients: number;
  openSupportTickets: number | null;
  activeProjects: number | null;
  externalPortalUsers: number | null;
  contractsExpiring30: number | null;
  contractsExpiring60: number | null;
  contractsExpiring90: number | null;
  hasAnyRenewalDate: boolean;
};

function parseTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function daysUntil(isoDate: string): number | null {
  const target = new Date(`${isoDate.slice(0, 10)}T12:00:00.000Z`).getTime();
  if (!Number.isFinite(target)) return null;
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function hasPrimaryContact(client: ManagedClient): boolean {
  return Boolean(
    client.primaryContact?.trim() ||
      client.primaryContactFirstName?.trim() ||
      client.primaryContactSurname?.trim() ||
      client.email?.trim(),
  );
}

function normalizeOrg(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Best-effort ticket ↔ client match (tickets have organisation string, not clientId). */
export function matchTicketToClient(
  ticket: SupportTicket,
  clients: ManagedClient[],
): ManagedClient | null {
  const org = normalizeOrg(ticket.organisation);
  if (!org) return null;
  return (
    clients.find((client) => normalizeOrg(client.companyName) === org) ??
    clients.find((client) => {
      const name = normalizeOrg(client.companyName);
      return name.length >= 4 && (org.includes(name) || name.includes(org));
    }) ??
    null
  );
}

export function countLiveProjectsForClient(
  client: ManagedClient,
  projects: InternalProject[],
): number {
  return projects.filter(
    (project) =>
      project.phase === "live" &&
      (project.clientId === client.id ||
        (!project.clientId &&
          normalizeOrg(project.clientName) === normalizeOrg(client.companyName))),
  ).length;
}

export function countOpenTicketsForClient(
  client: ManagedClient,
  tickets: SupportTicket[],
): number {
  return tickets.filter((ticket) => {
    if (ticket.closed || ticket.archived) return false;
    return matchTicketToClient(ticket, [client])?.id === client.id;
  }).length;
}

export function countPortalUsersForClient(
  client: ManagedClient,
  users: ExternalUser[],
): number {
  return users.filter((user) => user.clientId === client.id).length;
}

export function clientLastActivityAt(
  client: ManagedClient,
  projects: InternalProject[],
  tickets: SupportTicket[],
  users: ExternalUser[],
): string | null {
  const times = [
    parseTime(client.updatedAt),
    parseTime(client.createdAt),
    ...projects
      .filter(
        (project) =>
          project.clientId === client.id ||
          normalizeOrg(project.clientName) === normalizeOrg(client.companyName),
      )
      .flatMap((project) => [parseTime(project.updatedAt), parseTime(project.createdAt)]),
    ...tickets
      .filter((ticket) => matchTicketToClient(ticket, [client])?.id === client.id)
      .flatMap((ticket) => [parseTime(ticket.updatedAt), parseTime(ticket.createdAt)]),
    ...users
      .filter((user) => user.clientId === client.id)
      .flatMap((user) => [parseTime(user.lastLoggedIn), parseTime(user.createdAt)]),
  ].filter((value) => value > 0);

  if (times.length === 0) return null;
  return new Date(Math.max(...times)).toISOString();
}

export function buildClientsDashboardKpis(
  clients: ManagedClient[],
  projects: InternalProject[] | null,
  tickets: SupportTicket[] | null,
  users: ExternalUser[] | null,
): ClientsDashboardKpis {
  const directory = clients.filter((client) => client.accountStatus !== "Archived");
  const renewalWindows = { d30: 0, d60: 0, d90: 0 };
  let hasAnyRenewalDate = false;

  for (const client of directory) {
    if (!client.renewalDate) continue;
    hasAnyRenewalDate = true;
    const days = daysUntil(client.renewalDate);
    if (days == null || days < 0) continue;
    if (days <= 30) renewalWindows.d30 += 1;
    if (days <= 60) renewalWindows.d60 += 1;
    if (days <= 90) renewalWindows.d90 += 1;
  }

  return {
    totalClients: directory.length,
    activeClients: directory.filter((client) => client.accountStatus === "Active").length,
    onboardingClients: directory.filter((client) => isClientPreActiveStatus(client.accountStatus))
      .length,
    dormantClients: directory.filter((client) => client.accountStatus === "Dormant").length,
    openSupportTickets:
      tickets == null
        ? null
        : tickets.filter((ticket) => !ticket.closed && !ticket.archived).length,
    activeProjects:
      projects == null ? null : projects.filter((project) => project.phase === "live").length,
    externalPortalUsers: users == null ? null : users.length,
    contractsExpiring30: hasAnyRenewalDate ? renewalWindows.d30 : null,
    contractsExpiring60: hasAnyRenewalDate ? renewalWindows.d60 : null,
    contractsExpiring90: hasAnyRenewalDate ? renewalWindows.d90 : null,
    hasAnyRenewalDate,
  };
}

export function buildClientsDashboardActivity(input: {
  clients: ManagedClient[];
  projects: InternalProject[];
  tickets: SupportTicket[];
  users: ExternalUser[];
  limit?: number;
}): ClientsDashboardActivity[] {
  const events: ClientsDashboardActivity[] = [];

  for (const client of input.clients) {
    if (!client.createdAt) continue;
    if (client.crmLeadId) {
      events.push({
        id: `lead-converted-${client.id}`,
        kind: "lead_converted",
        title: "Lead converted",
        detail: `${client.companyName} · linked CRM lead`,
        at: client.createdAt,
        clientId: client.id,
      });
    } else {
      events.push({
        id: `client-created-${client.id}`,
        kind: "client_created",
        title: "Client created",
        detail: client.companyName,
        at: client.createdAt,
        clientId: client.id,
      });
    }
  }

  for (const project of input.projects) {
    if (!project.createdAt) continue;
    events.push({
      id: `project-${project.id}`,
      kind: "project_created",
      title: "New project",
      detail: `${project.name}${project.clientName ? ` · ${project.clientName}` : ""}`,
      at: project.createdAt,
      clientId: project.clientId,
    });
  }

  for (const ticket of input.tickets) {
    if (!ticket.createdAt) continue;
    const matched = matchTicketToClient(ticket, input.clients);
    events.push({
      id: `ticket-${ticket.id}`,
      kind: "ticket_opened",
      title: "Support ticket opened",
      detail: `${ticket.name}${ticket.organisation ? ` · ${ticket.organisation}` : ""}`,
      at: ticket.createdAt,
      clientId: matched?.id ?? null,
    });
  }

  for (const user of input.users) {
    if (!user.createdAt) continue;
    events.push({
      id: `external-user-${user.id}`,
      kind: "external_user_invited",
      title: "External user invited",
      detail: `${user.name}${user.organisation ? ` · ${user.organisation}` : ""}`,
      at: user.createdAt,
      clientId: user.clientId,
    });
  }

  events.sort((a, b) => parseTime(b.at) - parseTime(a.at));
  return events.slice(0, input.limit ?? 20);
}

export type ClientsHealthBucket = {
  id: string;
  label: string;
  description: string;
  clients: ManagedClient[];
};

export function buildClientsHealthBuckets(
  clients: ManagedClient[],
  projects: InternalProject[],
  tickets: SupportTicket[],
): ClientsHealthBucket[] {
  const directory = clients.filter((client) => client.accountStatus !== "Archived");
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

  const requiringAttention = directory.filter((client) => {
    if (client.accountStatus === "Dormant") return true;
    if (client.renewalDate) {
      const days = daysUntil(client.renewalDate);
      if (days != null && days >= 0 && days <= 30) return true;
    }
    if (!hasPrimaryContact(client)) return true;
    return countOpenTicketsForClient(client, tickets) > 0;
  });

  const onboarding = directory.filter((client) => isClientPreActiveStatus(client.accountStatus));

  const overdueActions = directory.filter((client) => {
    if (client.renewalDate) {
      const days = daysUntil(client.renewalDate);
      if (days != null && days < 0) return true;
    }
    return false;
  });

  const recentlyCreated = [...directory]
    .filter((client) => parseTime(client.createdAt) >= sevenDaysAgo)
    .sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt));

  const recentlyUpdated = [...directory]
    .filter((client) => {
      const updated = parseTime(client.updatedAt);
      const created = parseTime(client.createdAt);
      return updated >= fourteenDaysAgo && updated > created;
    })
    .sort((a, b) => parseTime(b.updatedAt) - parseTime(a.updatedAt));

  void projects;

  return [
    {
      id: "attention",
      label: "Requiring attention",
      description: "Dormant, renewing soon, missing contact, or open support",
      clients: requiringAttention.slice(0, 8),
    },
    {
      id: "onboarding",
      label: "Currently onboarding",
      description: "Pre-active lifecycle stages",
      clients: onboarding.slice(0, 8),
    },
    {
      id: "overdue",
      label: "Overdue actions",
      description: "Past contract renewal dates on file",
      clients: overdueActions.slice(0, 8),
    },
    {
      id: "created",
      label: "Recently created",
      description: "Added in the last 7 days",
      clients: recentlyCreated.slice(0, 8),
    },
    {
      id: "updated",
      label: "Recently updated",
      description: "Directory changes in the last 14 days",
      clients: recentlyUpdated.slice(0, 8),
    },
  ];
}

export type ClientsOperationalInsight = {
  id: string;
  label: string;
  value: string;
  hint: string;
  empty?: boolean;
  clients?: ManagedClient[];
};

export function buildClientsOperationalInsights(
  clients: ManagedClient[],
  projects: InternalProject[],
  users: ExternalUser[],
  kpis: ClientsDashboardKpis,
): ClientsOperationalInsight[] {
  const directory = clients.filter((client) => client.accountStatus !== "Archived");
  const monthPrefix = new Date().toISOString().slice(0, 7);

  const onboardedThisMonth = directory.filter((client) => {
    if (client.accountStatus !== "Active" && client.accountStatus !== "Onboarding") return false;
    const stamp = client.activationDate || client.createdAt;
    return Boolean(stamp && stamp.slice(0, 7) === monthPrefix);
  });

  const withoutContacts = directory.filter((client) => !hasPrimaryContact(client));
  const withoutProjects = directory.filter(
    (client) => countLiveProjectsForClient(client, projects) === 0,
  );
  const withoutPortalUsers = directory.filter(
    (client) => countPortalUsersForClient(client, users) === 0,
  );

  const renewing = directory.filter((client) => {
    if (!client.renewalDate) return false;
    const days = daysUntil(client.renewalDate);
    return days != null && days >= 0 && days <= 90;
  });

  return [
    {
      id: "onboarded-month",
      label: "Clients onboarded this month",
      value: String(onboardedThisMonth.length),
      hint:
        onboardedThisMonth.length === 0
          ? "No activations or new clients dated this month"
          : "Active / onboarding with activation or create date this month",
      empty: onboardedThisMonth.length === 0,
      clients: onboardedThisMonth.slice(0, 6),
    },
    {
      id: "renewals",
      label: "Contracts approaching renewal",
      value: kpis.hasAnyRenewalDate ? String(renewing.length) : "—",
      hint: kpis.hasAnyRenewalDate
        ? "Renewal date within 90 days"
        : "No contract renewal dates recorded yet",
      empty: !kpis.hasAnyRenewalDate || renewing.length === 0,
      clients: renewing.slice(0, 6),
    },
    {
      id: "no-contacts",
      label: "Clients without contacts",
      value: String(withoutContacts.length),
      hint:
        withoutContacts.length === 0
          ? "Every client has a primary contact or email"
          : "Missing primary contact and email",
      empty: withoutContacts.length === 0,
      clients: withoutContacts.slice(0, 6),
    },
    {
      id: "no-projects",
      label: "Clients without projects",
      value: String(withoutProjects.length),
      hint:
        withoutProjects.length === 0
          ? "Every client has at least one live project"
          : "No live projects linked in Projects",
      empty: withoutProjects.length === 0,
      clients: withoutProjects.slice(0, 6),
    },
    {
      id: "no-portal",
      label: "Clients without portal users",
      value: String(withoutPortalUsers.length),
      hint:
        withoutPortalUsers.length === 0
          ? "Every client has at least one external user"
          : "No External Users linked via clientId",
      empty: withoutPortalUsers.length === 0,
      clients: withoutPortalUsers.slice(0, 6),
    },
  ];
}

function metricValue(value: number | null, unavailableLabel = "—"): string {
  return value == null ? unavailableLabel : String(value);
}

export function buildClientsExecutiveTileCatalog(
  kpis: ClientsDashboardKpis,
): DashboardTileDefinition[] {
  return [
    {
      id: "total-clients",
      label: "Total clients",
      value: String(kpis.totalClients),
      hint: "Excludes archived",
    },
    {
      id: "active-clients",
      label: "Active clients",
      value: String(kpis.activeClients),
      hint: "Lifecycle = Active",
    },
    {
      id: "onboarding",
      label: "Client onboarding",
      value: String(kpis.onboardingClients),
      hint: "Created · provisioned · onboarding",
    },
    {
      id: "dormant",
      label: "Dormant clients",
      value: String(kpis.dormantClients),
      hint: "Lifecycle = Dormant",
    },
    {
      id: "open-tickets",
      label: "Open support tickets",
      value: metricValue(kpis.openSupportTickets),
      hint:
        kpis.openSupportTickets == null
          ? "Support data unavailable"
          : "Open and not archived",
    },
    {
      id: "active-projects",
      label: "Active projects",
      value: metricValue(kpis.activeProjects),
      hint:
        kpis.activeProjects == null ? "Projects data unavailable" : "Live phase in Projects",
    },
    {
      id: "portal-users",
      label: "External portal users",
      value: metricValue(kpis.externalPortalUsers),
      hint:
        kpis.externalPortalUsers == null
          ? "External users unavailable"
          : "All portal accounts in workspace",
    },
    {
      id: "renewals-30",
      label: "Contracts expiring (30d)",
      value: metricValue(kpis.contractsExpiring30),
      hint: kpis.hasAnyRenewalDate
        ? "Renewal date within 30 days"
        : "No renewal dates on file",
    },
    {
      id: "renewals-60",
      label: "Contracts expiring (60d)",
      value: metricValue(kpis.contractsExpiring60),
      hint: kpis.hasAnyRenewalDate
        ? "Renewal date within 60 days"
        : "No renewal dates on file",
    },
    {
      id: "renewals-90",
      label: "Contracts expiring (90d)",
      value: metricValue(kpis.contractsExpiring90),
      hint: kpis.hasAnyRenewalDate
        ? "Renewal date within 90 days"
        : "No renewal dates on file",
    },
  ];
}

export const DEFAULT_CLIENTS_EXECUTIVE_TILE_LAYOUT = [
  "total-clients",
  "active-clients",
  "onboarding",
  "dormant",
  "open-tickets",
  "active-projects",
  "portal-users",
  "renewals-30",
];

export function formatClientsDashboardWhen(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
