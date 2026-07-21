"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { FinancialOverviewSnapshot } from "@/lib/accounting/types";
import type { CalendarEvent } from "@/lib/calendar-data";
import type { ManagedClient } from "@/lib/client-management-data";
import type { CrmLead } from "@/lib/crm-data";
import type { ExternalUser } from "@/lib/external-users-data";
import type { BrowseEntry } from "@/lib/internal-files-data";
import type { ActionPriority } from "@/lib/internal-operations-command-data";
import type { HrEmployee } from "@/lib/hr-data";
import type { InternalProject } from "@/lib/projects-data";
import type { SupportTicket } from "@/lib/support-data";

export type CommandCentreApiActionItem = {
  id: string;
  priority: ActionPriority;
  task: string;
  assignedTo: string;
  due: string;
  href: string | null;
};

export type Wave0FoundationHealth = {
  ok?: boolean;
  ready?: boolean;
  feature?: string;
  reason?: string;
  error?: string;
  method?: string;
  checks?: unknown;
};

export type CommandCentreLoadingFlags = {
  whoami: boolean;
  actionItems: boolean;
  clients: boolean;
  projects: boolean;
  tickets: boolean;
  employees: boolean;
  externalUsers: boolean;
  events: boolean;
  unread: boolean;
  financials: boolean;
  crmLeads: boolean;
  files: boolean;
  health: boolean;
};

type CommandCentreDataContextValue = {
  username: string | null;
  displayName: string | null;
  whoamiReady: boolean;
  apiActionItems: CommandCentreApiActionItem[];
  clients: ManagedClient[];
  projects: InternalProject[];
  tickets: SupportTicket[];
  employees: HrEmployee[];
  externalUsers: ExternalUser[];
  events: CalendarEvent[];
  unreadCount: number;
  financialOverview: FinancialOverviewSnapshot | null;
  crmLeads: CrmLead[];
  files: BrowseEntry[];
  health: Wave0FoundationHealth | null;
  loading: CommandCentreLoadingFlags;
  anyRefreshing: boolean;
  refreshAll: () => void;
  completedActionIds: string[];
  completeAction: (id: string) => void;
};

const CommandCentreDataContext = createContext<CommandCentreDataContextValue | null>(null);

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function calendarWindow() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 14);
  const to = new Date(today);
  to.setDate(to.getDate() + 14);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

const IDLE_LOADING: CommandCentreLoadingFlags = {
  whoami: false,
  actionItems: false,
  clients: false,
  projects: false,
  tickets: false,
  employees: false,
  externalUsers: false,
  events: false,
  unread: false,
  financials: false,
  crmLeads: false,
  files: false,
  health: false,
};

export function CommandCentreDataProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [whoamiReady, setWhoamiReady] = useState(false);
  const [apiActionItems, setApiActionItems] = useState<CommandCentreApiActionItem[]>([]);
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [projects, setProjects] = useState<InternalProject[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [externalUsers, setExternalUsers] = useState<ExternalUser[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [financialOverview, setFinancialOverview] = useState<FinancialOverviewSnapshot | null>(
    null,
  );
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);
  const [files, setFiles] = useState<BrowseEntry[]>([]);
  const [health, setHealth] = useState<Wave0FoundationHealth | null>(null);
  const [loading, setLoading] = useState<CommandCentreLoadingFlags>({
    ...IDLE_LOADING,
    whoami: true,
    actionItems: true,
    clients: true,
    projects: true,
    tickets: true,
    employees: true,
    externalUsers: true,
    events: true,
    unread: true,
    financials: true,
    crmLeads: true,
    files: true,
    health: true,
  });
  const [completedActionIds, setCompletedActionIds] = useState<string[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  const setSliceLoading = useCallback((key: keyof CommandCentreLoadingFlags, value: boolean) => {
    setLoading((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const completeAction = useCallback((id: string) => {
    setCompletedActionIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const refreshAll = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    function mark(key: keyof CommandCentreLoadingFlags, value: boolean) {
      if (!cancelled) setSliceLoading(key, value);
    }

    async function loadWhoamiAndUnread() {
      mark("whoami", true);
      mark("unread", true);
      let viewerKey: string | null = null;
      try {
        const whoamiRes = await fetch("/api/auth/whoami", { cache: "no-store" });
        if (whoamiRes.ok) {
          const whoami = await readApiJson<{
            username?: string;
            displayName?: string | null;
          }>(whoamiRes);
          if (!cancelled) {
            setUsername(whoami.username ?? null);
            setDisplayName(whoami.displayName ?? null);
          }
          if (whoami.username) viewerKey = `user-${whoami.username}`;
        } else if (!cancelled) {
          setUsername(null);
          setDisplayName(null);
        }
      } catch {
        if (!cancelled) {
          setUsername(null);
          setDisplayName(null);
        }
      } finally {
        if (!cancelled) setWhoamiReady(true);
        mark("whoami", false);
      }

      try {
        if (viewerKey) {
          const unreadRes = await fetch(
            `/api/messaging/unread?viewerKey=${encodeURIComponent(viewerKey)}`,
            { cache: "no-store" },
          );
          if (unreadRes.ok) {
            const data = await readApiJson<{ unreadTotal?: number }>(unreadRes);
            if (!cancelled) setUnreadCount(data.unreadTotal ?? 0);
          } else if (!cancelled) {
            setUnreadCount(0);
          }
        } else if (!cancelled) {
          setUnreadCount(0);
        }
      } catch {
        if (!cancelled) setUnreadCount(0);
      } finally {
        mark("unread", false);
      }
    }

    async function loadSlice<T>(
      key: keyof CommandCentreLoadingFlags,
      url: string,
      apply: (data: T) => void,
      onFail?: () => void,
    ) {
      mark(key, true);
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          onFail?.();
          return;
        }
        const data = await readApiJson<T>(res);
        if (!cancelled) apply(data);
      } catch {
        onFail?.();
      } finally {
        mark(key, false);
      }
    }

    const { fromIso, toIso } = calendarWindow();

    // Wave 1 — visible command-centre widgets first (action, snapshot, schedule).
    void loadWhoamiAndUnread();

    void loadSlice<{ items?: CommandCentreApiActionItem[] }>(
      "actionItems",
      "/api/internal/action-items",
      (data) => setApiActionItems(data.items ?? []),
      () => {
        if (!cancelled) setApiActionItems([]);
      },
    );

    void loadSlice<{ clients?: ManagedClient[] }>(
      "clients",
      "/api/clients",
      (data) => setClients(data.clients ?? []),
      () => {
        if (!cancelled) setClients([]);
      },
    );

    void loadSlice<{ projects?: InternalProject[] }>(
      "projects",
      "/api/projects",
      (data) => setProjects(data.projects ?? []),
      () => {
        if (!cancelled) setProjects([]);
      },
    );

    void loadSlice<{ tickets?: SupportTicket[] }>(
      "tickets",
      "/api/support/tickets?includeArchived=false",
      (data) => setTickets(data.tickets ?? []),
      () => {
        if (!cancelled) setTickets([]);
      },
    );

    void loadSlice<{ events?: CalendarEvent[] }>(
      "events",
      `/api/calendar/events?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
      (data) => setEvents(data.events ?? []),
      () => {
        if (!cancelled) setEvents([]);
      },
    );

    // Wave 2 — secondary widgets after first paint (idle or short delay).
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const runSecondary = () => {
      if (cancelled) return;

      void loadSlice<{ employees?: HrEmployee[] }>(
        "employees",
        "/api/hr/employees",
        (data) => setEmployees(data.employees ?? []),
        () => {
          if (!cancelled) setEmployees([]);
        },
      );

      void loadSlice<{ users?: ExternalUser[] }>(
        "externalUsers",
        "/api/external-users",
        (data) => setExternalUsers(data.users ?? []),
        () => {
          if (!cancelled) setExternalUsers([]);
        },
      );

      void loadSlice<{ overview?: FinancialOverviewSnapshot }>(
        "financials",
        "/api/financials/ledger/overview",
        (data) => setFinancialOverview(data.overview ?? null),
        () => {
          if (!cancelled) setFinancialOverview(null);
        },
      );

      void loadSlice<{ leads?: CrmLead[] }>(
        "crmLeads",
        "/api/crm/leads",
        (data) => setCrmLeads(data.leads ?? []),
        () => {
          if (!cancelled) setCrmLeads([]);
        },
      );

      void loadSlice<{ entries?: BrowseEntry[] }>(
        "files",
        "/api/files/browse",
        (data) => setFiles(data.entries ?? []),
        () => {
          if (!cancelled) setFiles([]);
        },
      );

      void (async () => {
        mark("health", true);
        try {
          const res = await fetch("/api/internal/wave0-foundation-health", {
            cache: "no-store",
          });
          if (res.status === 404) {
            if (!cancelled) setHealth(null);
            return;
          }
          const data = await readApiJson<Wave0FoundationHealth>(res);
          if (!cancelled) setHealth(data);
        } catch {
          if (!cancelled) setHealth(null);
        } finally {
          mark("health", false);
        }
      })();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(runSecondary, { timeout: 1200 });
    } else {
      timeoutId = globalThis.setTimeout(runSecondary, 180);
    }

    return () => {
      cancelled = true;
      if (idleId != null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [refreshToken, setSliceLoading]);

  useEffect(() => {
    function handleRefresh() {
      refreshAll();
    }
    window.addEventListener("internal-dashboard:refresh-alerts", handleRefresh);
    return () => window.removeEventListener("internal-dashboard:refresh-alerts", handleRefresh);
  }, [refreshAll]);

  const anyRefreshing = useMemo(
    () => Object.values(loading).some(Boolean),
    [loading],
  );

  const value = useMemo<CommandCentreDataContextValue>(
    () => ({
      username,
      displayName,
      whoamiReady,
      apiActionItems,
      clients,
      projects,
      tickets,
      employees,
      externalUsers,
      events,
      unreadCount,
      financialOverview,
      crmLeads,
      files,
      health,
      loading,
      anyRefreshing,
      refreshAll,
      completedActionIds,
      completeAction,
    }),
    [
      username,
      displayName,
      whoamiReady,
      apiActionItems,
      clients,
      projects,
      tickets,
      employees,
      externalUsers,
      events,
      unreadCount,
      financialOverview,
      crmLeads,
      files,
      health,
      loading,
      anyRefreshing,
      refreshAll,
      completedActionIds,
      completeAction,
    ],
  );

  return (
    <CommandCentreDataContext.Provider value={value}>{children}</CommandCentreDataContext.Provider>
  );
}

export function useCommandCentreData() {
  const ctx = useContext(CommandCentreDataContext);
  if (!ctx) {
    throw new Error("useCommandCentreData must be used within CommandCentreDataProvider");
  }
  return ctx;
}
