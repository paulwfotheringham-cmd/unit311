/**
 * MOD-001 Command Centre v2 — configurable dashboard layout.
 * Persists per user in localStorage (layout, size, collapsed, order).
 */

export type CommandCentreTileType =
  | "action-required"
  | "todays-schedule"
  | "calendar"
  | "recent-activity"
  | "notifications"
  | "messages"
  | "recent-files"
  | "pinned-files"
  | "clients"
  | "projects"
  | "revenue"
  | "cash-flow"
  | "burn-rate"
  | "employees"
  | "leave-today"
  | "recruitment"
  | "support-tickets"
  | "open-contracts"
  | "contract-renewals"
  | "recent-reports"
  | "recent-crm-activity"
  | "performance-reviews"
  | "approvals"
  | "tasks"
  | "engineering"
  | "quality"
  | "training"
  | "inventory"
  | "system-health"
  | "platform-status"
  | "api-integrations"
  | "recent-logins"
  | "workspace-activity"
  | "business-snapshot"
  | "my-work"
  | "quick-actions";

export type CommandCentreTileSize = "sm" | "md" | "lg" | "xl";

export type CommandCentreTileInstance = {
  /** Stable instance id (allows duplicates of same type later). */
  instanceId: string;
  type: CommandCentreTileType;
  size: CommandCentreTileSize;
  collapsed?: boolean;
};

export type CommandCentrePreferences = {
  version: 2;
  tiles: CommandCentreTileInstance[];
  /** Types hidden from the default catalog until re-added. */
  hiddenTypes: CommandCentreTileType[];
};

export type CommandCentreTileDefinition = {
  type: CommandCentreTileType;
  title: string;
  description: string;
  defaultSize: CommandCentreTileSize;
  accent: string;
};

export const COMMAND_CENTRE_TILE_CATALOG: CommandCentreTileDefinition[] = [
  {
    type: "action-required",
    title: "Action Required",
    description: "Highest-priority items needing attention.",
    defaultSize: "md",
    accent: "border-rose-400/25",
  },
  {
    type: "todays-schedule",
    title: "Today's Schedule",
    description: "Meetings, leave, training, tasks and deadlines.",
    defaultSize: "md",
    accent: "border-violet-400/25",
  },
  {
    type: "calendar",
    title: "Calendar",
    description: "Upcoming calendar events.",
    defaultSize: "md",
    accent: "border-violet-400/20",
  },
  {
    type: "business-snapshot",
    title: "Business Snapshot",
    description: "Compact executive KPIs.",
    defaultSize: "lg",
    accent: "border-emerald-400/25",
  },
  {
    type: "recent-activity",
    title: "Recent Activity",
    description: "Unified feed across domains.",
    defaultSize: "md",
    accent: "border-sky-400/25",
  },
  {
    type: "my-work",
    title: "My Work",
    description: "Approvals, tasks, messages and meetings.",
    defaultSize: "md",
    accent: "border-amber-400/25",
  },
  {
    type: "quick-actions",
    title: "Quick Actions",
    description: "Large shortcuts for common work.",
    defaultSize: "lg",
    accent: "border-cyan-400/25",
  },
  {
    type: "notifications",
    title: "Notifications",
    description: "Unread operational alerts.",
    defaultSize: "sm",
    accent: "border-sky-400/20",
  },
  {
    type: "messages",
    title: "Messages",
    description: "Unread messaging inbox.",
    defaultSize: "sm",
    accent: "border-sky-400/20",
  },
  {
    type: "recent-files",
    title: "Recent Files",
    description: "Latest workspace files.",
    defaultSize: "md",
    accent: "border-emerald-400/20",
  },
  {
    type: "pinned-files",
    title: "Pinned Files",
    description: "Pinned files and favourite reports.",
    defaultSize: "md",
    accent: "border-emerald-400/20",
  },
  {
    type: "clients",
    title: "Clients",
    description: "Client directory snapshot.",
    defaultSize: "sm",
    accent: "border-sky-400/20",
  },
  {
    type: "projects",
    title: "Projects",
    description: "Live delivery projects.",
    defaultSize: "sm",
    accent: "border-violet-400/20",
  },
  {
    type: "revenue",
    title: "Revenue",
    description: "Revenue YTD and monthly pace.",
    defaultSize: "sm",
    accent: "border-emerald-400/20",
  },
  {
    type: "cash-flow",
    title: "Cash Flow",
    description: "Cash position and outgoings.",
    defaultSize: "sm",
    accent: "border-emerald-400/20",
  },
  {
    type: "burn-rate",
    title: "Burn Rate",
    description: "Monthly operating burn and trend.",
    defaultSize: "sm",
    accent: "border-rose-400/20",
  },
  {
    type: "employees",
    title: "Employees",
    description: "Headcount snapshot.",
    defaultSize: "sm",
    accent: "border-cyan-400/20",
  },
  {
    type: "leave-today",
    title: "Leave Today",
    description: "Who is out today.",
    defaultSize: "sm",
    accent: "border-amber-400/20",
  },
  {
    type: "recruitment",
    title: "Recruitment",
    description: "Open roles and pipeline.",
    defaultSize: "sm",
    accent: "border-fuchsia-400/20",
  },
  {
    type: "support-tickets",
    title: "Support Tickets",
    description: "Open support volume.",
    defaultSize: "sm",
    accent: "border-rose-400/20",
  },
  {
    type: "open-contracts",
    title: "Open Contracts",
    description: "Active commercial contracts.",
    defaultSize: "sm",
    accent: "border-amber-400/20",
  },
  {
    type: "contract-renewals",
    title: "Contract Renewals",
    description: "Renewals due soon.",
    defaultSize: "sm",
    accent: "border-amber-400/20",
  },
  {
    type: "recent-reports",
    title: "Recent Reports",
    description: "Recently generated reports.",
    defaultSize: "sm",
    accent: "border-white/15",
  },
  {
    type: "recent-crm-activity",
    title: "Recent CRM Activity",
    description: "Latest pipeline activity.",
    defaultSize: "md",
    accent: "border-sky-400/20",
  },
  {
    type: "performance-reviews",
    title: "Performance Reviews",
    description: "Reviews awaiting attention.",
    defaultSize: "sm",
    accent: "border-violet-400/20",
  },
  {
    type: "approvals",
    title: "Approvals",
    description: "Items waiting for approval.",
    defaultSize: "sm",
    accent: "border-amber-400/20",
  },
  {
    type: "tasks",
    title: "Tasks",
    description: "Open operational tasks.",
    defaultSize: "sm",
    accent: "border-white/15",
  },
  {
    type: "engineering",
    title: "Engineering",
    description: "Engineering capacity snapshot.",
    defaultSize: "sm",
    accent: "border-cyan-400/20",
  },
  {
    type: "quality",
    title: "Quality",
    description: "QMS open items.",
    defaultSize: "sm",
    accent: "border-emerald-400/20",
  },
  {
    type: "training",
    title: "Training",
    description: "Training due and in progress.",
    defaultSize: "sm",
    accent: "border-amber-400/20",
  },
  {
    type: "inventory",
    title: "Inventory",
    description: "Operational asset status.",
    defaultSize: "sm",
    accent: "border-sky-400/20",
  },
  {
    type: "system-health",
    title: "System Health",
    description: "Platform health probes.",
    defaultSize: "sm",
    accent: "border-emerald-400/20",
  },
  {
    type: "platform-status",
    title: "Platform Status",
    description: "Go-live and module readiness.",
    defaultSize: "sm",
    accent: "border-sky-400/20",
  },
  {
    type: "api-integrations",
    title: "API Integrations",
    description: "Connected integrations.",
    defaultSize: "sm",
    accent: "border-white/15",
  },
  {
    type: "recent-logins",
    title: "Recent Logins",
    description: "Recent authentication events.",
    defaultSize: "sm",
    accent: "border-white/15",
  },
  {
    type: "workspace-activity",
    title: "Workspace Activity",
    description: "Recent workspace events.",
    defaultSize: "md",
    accent: "border-sky-400/20",
  },
];

export const DEFAULT_COMMAND_CENTRE_LAYOUT: CommandCentreTileInstance[] = [
  { instanceId: "cc-action-required", type: "action-required", size: "md" },
  { instanceId: "cc-todays-schedule", type: "todays-schedule", size: "md" },
  { instanceId: "cc-business-snapshot", type: "business-snapshot", size: "lg" },
  { instanceId: "cc-recent-activity", type: "recent-activity", size: "md" },
  { instanceId: "cc-my-work", type: "my-work", size: "md" },
  { instanceId: "cc-quick-actions", type: "quick-actions", size: "lg" },
  { instanceId: "cc-burn-rate", type: "burn-rate", size: "sm" },
  { instanceId: "cc-support-tickets", type: "support-tickets", size: "sm" },
  { instanceId: "cc-messages", type: "messages", size: "sm" },
  { instanceId: "cc-clients", type: "clients", size: "sm" },
];

const STORAGE_PREFIX = "unit311-command-centre-v2";

function storageKey(userKey: string) {
  const key = userKey.trim() || "anonymous";
  return `${STORAGE_PREFIX}:${key}`;
}

export function getCommandCentreTileDefinition(type: CommandCentreTileType) {
  return COMMAND_CENTRE_TILE_CATALOG.find((tile) => tile.type === type);
}

export function tileSizeClass(size: CommandCentreTileSize) {
  switch (size) {
    case "sm":
      return "col-span-1";
    case "md":
      return "col-span-1 md:col-span-2";
    case "lg":
      return "col-span-1 md:col-span-2 lg:col-span-3";
    case "xl":
      return "col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4";
  }
}

export function nextTileSize(size: CommandCentreTileSize): CommandCentreTileSize {
  if (size === "sm") return "md";
  if (size === "md") return "lg";
  if (size === "lg") return "xl";
  return "sm";
}

export function createTileInstance(
  type: CommandCentreTileType,
  size?: CommandCentreTileSize,
): CommandCentreTileInstance {
  const def = getCommandCentreTileDefinition(type);
  return {
    instanceId: `cc-${type}-${crypto.randomUUID().slice(0, 8)}`,
    type,
    size: size ?? def?.defaultSize ?? "md",
  };
}

export function defaultCommandCentrePreferences(): CommandCentrePreferences {
  return {
    version: 2,
    tiles: DEFAULT_COMMAND_CENTRE_LAYOUT.map((tile) => ({ ...tile })),
    hiddenTypes: [],
  };
}

export function loadCommandCentrePreferences(userKey: string): CommandCentrePreferences {
  if (typeof window === "undefined") return defaultCommandCentrePreferences();
  try {
    const raw = window.localStorage.getItem(storageKey(userKey));
    if (!raw) return defaultCommandCentrePreferences();
    const parsed = JSON.parse(raw) as Partial<CommandCentrePreferences>;
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.tiles)) {
      return defaultCommandCentrePreferences();
    }
    const catalogTypes = new Set(COMMAND_CENTRE_TILE_CATALOG.map((t) => t.type));
    const tiles = parsed.tiles.filter(
      (tile): tile is CommandCentreTileInstance =>
        Boolean(tile) &&
        typeof tile.instanceId === "string" &&
        catalogTypes.has(tile.type) &&
        (tile.size === "sm" || tile.size === "md" || tile.size === "lg" || tile.size === "xl"),
    );
    if (tiles.length === 0) return defaultCommandCentrePreferences();
    return {
      version: 2,
      tiles,
      hiddenTypes: Array.isArray(parsed.hiddenTypes)
        ? parsed.hiddenTypes.filter((type): type is CommandCentreTileType =>
            catalogTypes.has(type),
          )
        : [],
    };
  } catch {
    return defaultCommandCentrePreferences();
  }
}

export function saveCommandCentrePreferences(
  userKey: string,
  prefs: CommandCentrePreferences,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userKey), JSON.stringify(prefs));
}
