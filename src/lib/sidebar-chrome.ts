/**
 * Platform appearance themes for Unit311 Central.
 * Themes change colour only — never layout, spacing, typography or navigation.
 */

export type PlatformThemeId =
  | "unit311-dark"
  | "midnight"
  | "slate"
  | "graphite"
  | "navy-executive";

/** @deprecated Use PlatformThemeId */
export type SidebarThemeId = PlatformThemeId;

export type PlatformThemeTokens = {
  id: PlatformThemeId;
  label: string;
  /** App / page background */
  background: string;
  /** Secondary page surface / header */
  surface: string;
  /** Elevated panels */
  surfaceElevated: string;
  /** Sidebar background */
  sidebar: string;
  /** Cards / workspace cards / dashboard cards */
  card: string;
  /** Primary chrome border */
  border: string;
  /** Card border */
  cardBorder: string;
  /** Primary accent / buttons / links */
  accent: string;
  /** Accent hover */
  accentHover: string;
  /** Primary button fill */
  button: string;
};

/** @deprecated Use PlatformThemeTokens */
export type SidebarThemeTokens = PlatformThemeTokens;

export const PLATFORM_THEMES: readonly PlatformThemeTokens[] = [
  {
    id: "unit311-dark",
    label: "Unit311 Dark",
    background: "#050B16",
    surface: "#08111F",
    surfaceElevated: "#0B1524",
    sidebar: "#08111F",
    card: "#121C2D",
    border: "#17283E",
    cardBorder: "#243347",
    accent: "#2F80ED",
    accentHover: "#2563EB",
    button: "#1F4FBF",
  },
  {
    id: "midnight",
    label: "Midnight",
    background: "#070B16",
    surface: "#0B1020",
    surfaceElevated: "#121A2E",
    sidebar: "#0B1020",
    card: "#1A2336",
    border: "#1C2A45",
    cardBorder: "#2A3A55",
    accent: "#4F8CFF",
    accentHover: "#3B7AF0",
    button: "#2F62D6",
  },
  {
    id: "slate",
    label: "Slate",
    background: "#16191F",
    surface: "#20242C",
    surfaceElevated: "#262C36",
    sidebar: "#20242C",
    card: "#2A313D",
    border: "#323844",
    cardBorder: "#3A4352",
    accent: "#00C2A8",
    accentHover: "#00A890",
    button: "#0D9488",
  },
  {
    id: "graphite",
    label: "Graphite",
    background: "#121212",
    surface: "#1B1B1B",
    surfaceElevated: "#222222",
    sidebar: "#1B1B1B",
    card: "#292929",
    border: "#2E2E2E",
    cardBorder: "#3A3A3A",
    accent: "#4DA3FF",
    accentHover: "#3B8FEA",
    button: "#2F6FBF",
  },
  {
    id: "navy-executive",
    label: "Navy Executive",
    background: "#060E1C",
    surface: "#091628",
    surfaceElevated: "#0E1D33",
    sidebar: "#091628",
    card: "#13233C",
    border: "#15304A",
    cardBorder: "#1E3A58",
    accent: "#5C8DFF",
    accentHover: "#4A7AE8",
    button: "#3B6AD4",
  },
] as const;

/** @deprecated Use PLATFORM_THEMES */
export const SIDEBAR_THEMES = PLATFORM_THEMES;

export const DEFAULT_PLATFORM_THEME_ID: PlatformThemeId = "unit311-dark";
/** @deprecated Use DEFAULT_PLATFORM_THEME_ID */
export const DEFAULT_SIDEBAR_THEME_ID = DEFAULT_PLATFORM_THEME_ID;

export const PLATFORM_THEME_STORAGE_KEY = "unit311-platform-theme";
/** Legacy key — still read for migration. */
export const SIDEBAR_THEME_STORAGE_KEY = "unit311-sidebar-theme";
export const SIDEBAR_EXPANDED_STORAGE_KEY = "unit311-sidebar-expanded-v5";

export const PLATFORM_THEME_EVENT = "unit311-platform-theme";
/** @deprecated Use PLATFORM_THEME_EVENT — still dispatched for compatibility. */
export const SIDEBAR_THEME_EVENT = "unit311-sidebar-theme";

export function getPlatformTheme(id: PlatformThemeId | string | null | undefined): PlatformThemeTokens {
  return PLATFORM_THEMES.find((theme) => theme.id === id) ?? PLATFORM_THEMES[0];
}

/** @deprecated Use getPlatformTheme */
export function getSidebarTheme(id: PlatformThemeId | string | null | undefined): PlatformThemeTokens {
  return getPlatformTheme(id);
}

export function readPlatformThemeId(): PlatformThemeId {
  if (typeof window === "undefined") return DEFAULT_PLATFORM_THEME_ID;
  try {
    const primary = window.localStorage.getItem(PLATFORM_THEME_STORAGE_KEY);
    if (primary && PLATFORM_THEMES.some((theme) => theme.id === primary)) {
      return primary as PlatformThemeId;
    }
    const legacy = window.localStorage.getItem(SIDEBAR_THEME_STORAGE_KEY);
    if (legacy && PLATFORM_THEMES.some((theme) => theme.id === legacy)) {
      return legacy as PlatformThemeId;
    }
  } catch {
    // ignore
  }
  return DEFAULT_PLATFORM_THEME_ID;
}

/** @deprecated Use readPlatformThemeId */
export function readSidebarThemeId(): PlatformThemeId {
  return readPlatformThemeId();
}

export function writePlatformThemeId(id: PlatformThemeId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLATFORM_THEME_STORAGE_KEY, id);
    window.localStorage.setItem(SIDEBAR_THEME_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

/** @deprecated Use writePlatformThemeId */
export function writeSidebarThemeId(id: PlatformThemeId) {
  writePlatformThemeId(id);
}

/** Apply theme CSS variables to the document — updates the entire platform chrome. */
export function applyPlatformTheme(id: PlatformThemeId | string | null | undefined) {
  if (typeof document === "undefined") return;
  const theme = getPlatformTheme(id);
  const root = document.documentElement;
  root.dataset.platformTheme = theme.id;

  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--surface", theme.surface);
  root.style.setProperty("--surface-elevated", theme.surfaceElevated);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-hover", theme.accentHover);
  root.style.setProperty("--border", `${theme.border}99`);
  root.style.setProperty("--border-strong", theme.cardBorder);
  root.style.setProperty("--glow", `${theme.accent}26`);

  root.style.setProperty("--platform-background", theme.background);
  root.style.setProperty("--platform-surface", theme.surface);
  root.style.setProperty("--platform-surface-elevated", theme.surfaceElevated);
  root.style.setProperty("--platform-sidebar", theme.sidebar);
  root.style.setProperty("--platform-card", theme.card);
  root.style.setProperty("--platform-border", theme.border);
  root.style.setProperty("--platform-card-border", theme.cardBorder);
  root.style.setProperty("--platform-accent", theme.accent);
  root.style.setProperty("--platform-accent-hover", theme.accentHover);
  root.style.setProperty("--platform-button", theme.button);

  root.style.setProperty("--u311-accent", theme.accent);
  root.style.setProperty("--u311-surface", `${theme.surfaceElevated}cc`);
  root.style.setProperty("--u311-surface-inset", `${theme.surface}e6`);
  root.style.setProperty("--u311-border", `${theme.cardBorder}99`);
}

export function dispatchPlatformThemeChange(id: PlatformThemeId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PLATFORM_THEME_EVENT, { detail: id }));
  window.dispatchEvent(new CustomEvent(SIDEBAR_THEME_EVENT, { detail: id }));
}

export function readSidebarExpandedState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function writeSidebarExpandedState(state: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}
