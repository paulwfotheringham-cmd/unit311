export type HomeDashboardTileId =
  | "action-required"
  | "revenue"
  | "support"
  | "this-week"
  | "projects"
  | "upcoming-missions";

export type HomeDashboardTileDefinition = {
  id: HomeDashboardTileId;
  title: string;
  description: string;
  width: "full" | "half";
};

export const HOME_DASHBOARD_TILE_CATALOG: HomeDashboardTileDefinition[] = [
  {
    id: "action-required",
    title: "Action required",
    description: "Priority tasks and assignments awaiting follow-up.",
    width: "full",
  },
  {
    id: "revenue",
    title: "Revenue overview",
    description: "Recognised revenue, forecast, and executive KPIs.",
    width: "half",
  },
  {
    id: "support",
    title: "Support tickets outstanding",
    description: "Open ticket volume and resolution trend.",
    width: "half",
  },
  {
    id: "this-week",
    title: "This week",
    description: "Calendar of meetings, missions, and deliverables.",
    width: "full",
  },
  {
    id: "projects",
    title: "Projects in progress",
    description: "Active client mobilisations with progress and links.",
    width: "full",
  },
  {
    id: "upcoming-missions",
    title: "Upcoming missions",
    description: "Scheduled field operations and pilot assignments.",
    width: "full",
  },
];

export const DEFAULT_HOME_DASHBOARD_LAYOUT: HomeDashboardTileId[] = [
  "action-required",
  "revenue",
  "support",
  "this-week",
  "projects",
];

const STORAGE_KEY_PREFIX = "unit311-home-dashboard-layout";
const catalogIds = new Set(HOME_DASHBOARD_TILE_CATALOG.map((tile) => tile.id));

function storageKeyForWorkspace(workspaceId: string) {
  const id = workspaceId.trim();
  return id ? `${STORAGE_KEY_PREFIX}:${id}` : STORAGE_KEY_PREFIX;
}

export function isHomeDashboardTileId(value: string): value is HomeDashboardTileId {
  return catalogIds.has(value as HomeDashboardTileId);
}

export function getHomeDashboardTileDefinition(id: HomeDashboardTileId) {
  return HOME_DASHBOARD_TILE_CATALOG.find((tile) => tile.id === id);
}

export function loadHomeDashboardLayout(workspaceId?: string | null): HomeDashboardTileId[] {
  if (typeof window === "undefined") {
    return [...DEFAULT_HOME_DASHBOARD_LAYOUT];
  }

  try {
    const key = storageKeyForWorkspace(workspaceId ?? "");
    const raw = window.localStorage.getItem(key);
    if (!raw) return [...DEFAULT_HOME_DASHBOARD_LAYOUT];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_HOME_DASHBOARD_LAYOUT];

    const valid = parsed.filter((value): value is HomeDashboardTileId =>
      isHomeDashboardTileId(value),
    );
    return valid.length > 0 ? valid : [...DEFAULT_HOME_DASHBOARD_LAYOUT];
  } catch {
    return [...DEFAULT_HOME_DASHBOARD_LAYOUT];
  }
}

export function saveHomeDashboardLayout(
  order: HomeDashboardTileId[],
  workspaceId?: string | null,
) {
  if (typeof window === "undefined") return;
  const key = storageKeyForWorkspace(workspaceId ?? "");
  window.localStorage.setItem(key, JSON.stringify(order));
}
