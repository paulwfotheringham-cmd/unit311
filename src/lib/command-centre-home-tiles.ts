export type CommandCentreHomeTileId =
  | "executive-brief"
  | "financial"
  | "commercial"
  | "projects"
  | "operations"
  | "risks";

export type CommandCentreHomeTileDefinition = {
  id: CommandCentreHomeTileId;
  title: string;
  description: string;
};

export const COMMAND_CENTRE_HOME_TILE_CATALOG: CommandCentreHomeTileDefinition[] = [
  {
    id: "executive-brief",
    title: "Executive Brief",
    description: "Today’s meetings and executive actions.",
  },
  {
    id: "financial",
    title: "Financial",
    description: "Revenue, cash, and forecast.",
  },
  {
    id: "commercial",
    title: "Commercial",
    description: "Pipeline, customers, and sales.",
  },
  {
    id: "projects",
    title: "Projects & Delivery",
    description: "Live delivery and project health.",
  },
  {
    id: "operations",
    title: "Operations",
    description: "Support, workload, and SLA.",
  },
  {
    id: "risks",
    title: "Risks",
    description: "Top risk and risk categories.",
  },
];

export const DEFAULT_COMMAND_CENTRE_HOME_LAYOUT: CommandCentreHomeTileId[] = [
  "executive-brief",
  "financial",
  "commercial",
  "projects",
  "operations",
  "risks",
];

const STORAGE_KEY = "unit311-command-centre-home-tiles";
const catalogIds = new Set(COMMAND_CENTRE_HOME_TILE_CATALOG.map((tile) => tile.id));

export function isCommandCentreHomeTileId(value: string): value is CommandCentreHomeTileId {
  return catalogIds.has(value as CommandCentreHomeTileId);
}

export function loadCommandCentreHomeLayout(): CommandCentreHomeTileId[] {
  if (typeof window === "undefined") {
    return [...DEFAULT_COMMAND_CENTRE_HOME_LAYOUT];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_COMMAND_CENTRE_HOME_LAYOUT];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_COMMAND_CENTRE_HOME_LAYOUT];
    const valid = parsed.filter((value): value is CommandCentreHomeTileId =>
      isCommandCentreHomeTileId(String(value)),
    );
    return valid.length > 0 ? valid : [...DEFAULT_COMMAND_CENTRE_HOME_LAYOUT];
  } catch {
    return [...DEFAULT_COMMAND_CENTRE_HOME_LAYOUT];
  }
}

export function saveCommandCentreHomeLayout(order: CommandCentreHomeTileId[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}
