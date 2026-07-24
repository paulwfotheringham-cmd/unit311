"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  ClipboardList,
  FolderKanban,
  Loader2,
  Plus,
  RefreshCw,
  UserPlus,
} from "lucide-react";

import DashboardTopTilesBar from "@/components/testflighthub/DashboardTopTilesBar";
import { useInternalOperationsBasePath } from "@/components/testflighthub/InternalOperationsBasePathContext";
import {
  clientStatusClass,
  type ManagedClient,
} from "@/lib/client-management-data";
import {
  buildClientsDashboardActivity,
  buildClientsDashboardKpis,
  buildClientsExecutiveTileCatalog,
  buildClientsOperationalInsights,
  clientLastActivityAt,
  countLiveProjectsForClient,
  countOpenTicketsForClient,
  DEFAULT_CLIENTS_EXECUTIVE_TILE_LAYOUT,
  formatClientsDashboardWhen,
  type ClientsDashboardActivityKind,
} from "@/lib/clients-dashboard-insights";
import type { ExternalUser } from "@/lib/external-users-data";
import { getInternalNavHref } from "@/lib/internal-operations-data";
import type { InternalProject } from "@/lib/projects-data";
import type { SupportTicket } from "@/lib/support-data";
import { cn } from "@/lib/utils";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html") || /^\s*</.test(text)) {
      throw new Error(
        `API returned HTML instead of JSON (${response.status}${response.url ? ` ${response.url}` : ""}).`,
      );
    }
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

const ACTIVITY_LABEL: Record<ClientsDashboardActivityKind, string> = {
  client_created: "Client",
  lead_converted: "CRM",
  project_created: "Project",
  ticket_opened: "Support",
  external_user_invited: "Portal",
};

const ACTIVITY_PREVIEW_LIMIT = 5;

type ClientsDashboardWorkspaceProps = {
  onClientsChange?: (clients: ManagedClient[]) => void;
};

export default function ClientsDashboardWorkspace({
  onClientsChange,
}: ClientsDashboardWorkspaceProps) {
  const basePath = useInternalOperationsBasePath();
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [projects, setProjects] = useState<InternalProject[] | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [users, setUsers] = useState<ExternalUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondaryNotes, setSecondaryNotes] = useState<string[]>([]);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const directoryHref = getInternalNavHref("clients", basePath);
  const crmHref = getInternalNavHref("crm", basePath);
  const projectsHref = getInternalNavHref("projects", basePath);
  const externalUsersHref = getInternalNavHref("users-external", basePath);

  const loadDashboard = useCallback(async (opts?: { soft?: boolean }) => {
    if (opts?.soft) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const notes: string[] = [];

    try {
      const [clientsRes, projectsRes, ticketsRes, usersRes] = await Promise.all([
        fetch("/api/clients", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/support/tickets?includeArchived=false", { cache: "no-store" }),
        fetch("/api/external-users", { cache: "no-store" }),
      ]);

      const clientsData = await readApiJson<{ clients?: ManagedClient[]; error?: string }>(
        clientsRes,
      );
      if (!clientsRes.ok || !clientsData.clients) {
        throw new Error(clientsData.error ?? "Failed to load clients");
      }
      setClients(clientsData.clients);
      onClientsChange?.(clientsData.clients);

      if (projectsRes.ok) {
        const projectsData = await readApiJson<{ projects?: InternalProject[]; error?: string }>(
          projectsRes,
        );
        setProjects(projectsData.projects ?? []);
      } else {
        setProjects(null);
        notes.push("Projects could not be loaded — related metrics are hidden.");
      }

      if (ticketsRes.ok) {
        const ticketsData = await readApiJson<{ tickets?: SupportTicket[]; error?: string }>(
          ticketsRes,
        );
        setTickets(ticketsData.tickets ?? []);
      } else {
        setTickets(null);
        notes.push("Support tickets could not be loaded — open-ticket metrics are hidden.");
      }

      if (usersRes.ok) {
        const usersData = await readApiJson<{ users?: ExternalUser[]; error?: string }>(usersRes);
        setUsers(usersData.users ?? []);
      } else {
        setUsers(null);
        notes.push("External users could not be loaded — portal metrics are hidden.");
      }

      setSecondaryNotes(notes);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load clients dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onClientsChange]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const kpis = useMemo(
    () => buildClientsDashboardKpis(clients, projects, tickets, users),
    [clients, projects, tickets, users],
  );

  const tileCatalog = useMemo(() => buildClientsExecutiveTileCatalog(kpis), [kpis]);

  const activity = useMemo(
    () =>
      buildClientsDashboardActivity({
        clients,
        projects: projects ?? [],
        tickets: tickets ?? [],
        users: users ?? [],
        limit: showAllActivity ? 100 : ACTIVITY_PREVIEW_LIMIT,
      }),
    [clients, projects, tickets, users, showAllActivity],
  );

  const activityTotal = useMemo(
    () =>
      buildClientsDashboardActivity({
        clients,
        projects: projects ?? [],
        tickets: tickets ?? [],
        users: users ?? [],
        limit: 100,
      }).length,
    [clients, projects, tickets, users],
  );

  const insights = useMemo(
    () => buildClientsOperationalInsights(clients, projects ?? [], users ?? [], kpis),
    [clients, projects, users, kpis],
  );

  const tableRows = useMemo(() => {
    return [...clients]
      .filter((client) => client.accountStatus !== "Archived")
      .sort((a, b) => a.companyName.localeCompare(b.companyName))
      .map((client) => ({
        client,
        projects: countLiveProjectsForClient(client, projects ?? []),
        support: tickets == null ? null : countOpenTicketsForClient(client, tickets),
        lastActivity: clientLastActivityAt(client, projects ?? [], tickets ?? [], users ?? []),
      }));
  }, [clients, projects, tickets, users]);

  function clientDirectoryHref(clientId?: string | null) {
    if (!clientId) return directoryHref;
    const params = new URLSearchParams({ view: "clients", clientId });
    return `${basePath === "/" ? "/" : basePath}?${params.toString()}`;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading clients…
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-3 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-4">
        <div className="flex flex-wrap items-start justify-end gap-2">
          <button
            type="button"
            onClick={() => void loadDashboard({ soft: true })}
            disabled={refreshing}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.08] disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={clientDirectoryHref()}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-200 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Client
          </Link>
          <Link
            href={directoryHref}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/75 transition-colors hover:border-white/25 hover:bg-white/[0.08]"
          >
            <Building2 className="h-3.5 w-3.5" />
            Open Client Directory
          </Link>
          <Link
            href={crmHref}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/75 transition-colors hover:border-white/25 hover:bg-white/[0.08]"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Convert CRM Lead
          </Link>
          <Link
            href={projectsHref}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/75 transition-colors hover:border-white/25 hover:bg-white/[0.08]"
          >
            <FolderKanban className="h-3.5 w-3.5" />
            Create Project
          </Link>
          <Link
            href={externalUsersHref}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/75 transition-colors hover:border-white/25 hover:bg-white/[0.08]"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite External User
          </Link>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {secondaryNotes.length > 0 ? (
        <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100/90">
          {secondaryNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}

      <DashboardTopTilesBar
        storageKey="unit311-clients-executive-dashboard-tiles"
        catalog={tileCatalog}
        defaultLayout={DEFAULT_CLIENTS_EXECUTIVE_TILE_LAYOUT}
        title="Client portfolio"
        showCustomizeHint={false}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-4">
        <div className="space-y-3 sm:space-y-4">
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-3 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                  Directory
                </p>
                <h3 className="mt-0.5 text-base font-semibold text-white">Client list</h3>
              </div>
              <Link
                href={directoryHref}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:text-sky-200"
              >
                Full directory
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {tableRows.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
                No clients in this workspace yet. Use Add Client or Convert CRM Lead to get started.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-[#0b1524]/40">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
                    <tr>
                      <th className="px-3 py-2 font-medium">Client</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Projects</th>
                      <th className="px-3 py-2 font-medium">Support</th>
                      <th className="hidden px-3 py-2 font-medium md:table-cell">Last activity</th>
                      <th className="hidden px-3 py-2 font-medium lg:table-cell">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {tableRows.map((row) => (
                      <tr key={row.client.id} className="hover:bg-white/[0.03]">
                        <td className="px-3 py-2">
                          <Link
                            href={clientDirectoryHref(row.client.id)}
                            className="font-semibold text-white hover:text-sky-200"
                          >
                            {row.client.companyName}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                              clientStatusClass(row.client.accountStatus),
                            )}
                          >
                            {row.client.accountStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-white/70">
                          {projects == null ? "—" : row.projects}
                        </td>
                        <td className="px-3 py-2 text-white/70">
                          {row.support == null ? "—" : row.support}
                        </td>
                        <td className="hidden px-3 py-2 text-xs text-white/55 md:table-cell">
                          {formatClientsDashboardWhen(row.lastActivity)}
                        </td>
                        <td className="hidden px-3 py-2 lg:table-cell">
                          <span
                            className="text-xs text-white/35"
                            title="Owner is not stored on Client Directory records yet"
                          >
                            —
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-3 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                  Recent activity
                </p>
                <h3 className="mt-0.5 text-base font-semibold text-white">What changed</h3>
              </div>
              {!showAllActivity && activityTotal > ACTIVITY_PREVIEW_LIMIT ? (
                <button
                  type="button"
                  onClick={() => setShowAllActivity(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:text-sky-200"
                >
                  View all
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {showAllActivity ? (
                <button
                  type="button"
                  onClick={() => setShowAllActivity(false)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-white/55 hover:text-white/80"
                >
                  Show less
                </button>
              ) : null}
            </div>

            {activity.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/45">
                No recent activity events could be derived from live records yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-[#0b1524]/40">
                {activity.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 px-3 py-2.5">
                    <span className="mt-0.5 shrink-0 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50">
                      {ACTIVITY_LABEL[event.kind]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-white">{event.title}</p>
                        <p className="text-[11px] text-white/40">
                          {formatClientsDashboardWhen(event.at)}
                        </p>
                      </div>
                      {event.clientId ? (
                        <Link
                          href={clientDirectoryHref(event.clientId)}
                          className="mt-0.5 block truncate text-xs text-sky-300/90 hover:text-sky-200"
                        >
                          {event.detail}
                        </Link>
                      ) : (
                        <p className="mt-0.5 truncate text-xs text-white/50">{event.detail}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-3 xl:self-start">
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-3 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
              Operational insights
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-white">Right now</h3>
            <div className="mt-3 space-y-2.5">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-xl border border-white/10 bg-[#0b1524]/55 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-white/85">{insight.label}</p>
                    <p className="text-sm font-semibold text-white">{insight.value}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">{insight.hint}</p>
                  {insight.empty ? (
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] text-white/35">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
                      No items to action in this category.
                    </p>
                  ) : insight.clients && insight.clients.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {insight.clients.map((client) => (
                        <li key={`${insight.id}-${client.id}`}>
                          <Link
                            href={clientDirectoryHref(client.id)}
                            className="truncate text-[11px] text-sky-300/90 hover:text-sky-200"
                          >
                            {client.companyName}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
