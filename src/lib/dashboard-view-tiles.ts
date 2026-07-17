export type DashboardTileDefinition = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
};

export function loadViewTileLayout(storageKey: string, defaults: string[]): string[] {
  if (typeof window === "undefined") return [...defaults];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [...defaults];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...defaults];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [...defaults];
  }
}

export function saveViewTileLayout(storageKey: string, order: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(order));
}

export function resolveViewTiles(
  catalog: DashboardTileDefinition[],
  layout: string[],
): DashboardTileDefinition[] {
  const byId = new Map(catalog.map((tile) => [tile.id, tile]));
  return layout.map((id) => byId.get(id)).filter((tile): tile is DashboardTileDefinition => !!tile);
}

