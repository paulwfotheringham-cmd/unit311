import type {
  DashboardAudience,
  DashboardRole,
  DashboardSectionConfig,
  DashboardWidgetConfig,
  DashboardWidgetVisibility,
  ResolveDashboardOptions,
  WorkspaceDashboardConfig,
} from "./types";

function matchesList(value: string | undefined, allowed?: readonly string[]): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!value) return true;
  return allowed.includes(value);
}

function matchesRole(role: DashboardRole | undefined, allowed?: readonly DashboardRole[]): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!role) return true;
  return allowed.includes(role);
}

export function isVisibilityAllowed(
  visibility: DashboardWidgetVisibility | undefined,
  audience: DashboardAudience | undefined,
  defaultVisible = true,
): boolean {
  if (!visibility) return defaultVisible;
  if (!matchesRole(audience?.role, visibility.roles)) return false;
  if (!matchesList(audience?.companyId, visibility.companyIds)) return false;
  if (!matchesList(audience?.workspaceId, visibility.workspaceIds)) return false;
  return true;
}

function sortByPriority<T extends { visibility?: DashboardWidgetVisibility }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const pa = a.visibility?.priority ?? 100;
    const pb = b.visibility?.priority ?? 100;
    return pa - pb;
  });
}

export function filterWidgets(
  widgets: readonly DashboardWidgetConfig[],
  audience: DashboardAudience | undefined,
  defaultVisible = true,
): DashboardWidgetConfig[] {
  return sortByPriority(
    widgets.filter((widget) => isVisibilityAllowed(widget.visibility, audience, defaultVisible)),
  );
}

export function filterSections(
  sections: readonly DashboardSectionConfig[],
  audience: DashboardAudience | undefined,
  defaultVisible = true,
): DashboardSectionConfig[] {
  return sections
    .filter((section) => isVisibilityAllowed(section.visibility, audience, defaultVisible))
    .map((section) => ({
      ...section,
      widgets: filterWidgets(section.widgets, audience, defaultVisible),
    }))
    .filter((section) => section.widgets.length > 0);
}

/**
 * Resolve a dashboard config for the current audience.
 * Role / company / user filters apply without changing page markup.
 */
export function resolveWorkspaceDashboard(
  config: WorkspaceDashboardConfig,
  options: ResolveDashboardOptions = {},
): WorkspaceDashboardConfig {
  const audience: DashboardAudience = {
    ...config.audience,
    ...options.audience,
    workspaceId: options.audience?.workspaceId ?? config.workspaceId,
  };
  const defaultVisible = options.defaultVisible ?? true;

  return {
    ...config,
    audience,
    sections: filterSections(config.sections, audience, defaultVisible),
  };
}

/** Convenience: ensure KPI row has exactly four items (pad / trim for safety). */
export function normalizeKpiRow(
  kpis: readonly { id: string; label: string; value: string; delta?: string; tone?: "neutral" | "positive" | "warning" | "critical"; hint?: string }[],
): [
  { id: string; label: string; value: string; delta?: string; tone?: "neutral" | "positive" | "warning" | "critical"; hint?: string },
  { id: string; label: string; value: string; delta?: string; tone?: "neutral" | "positive" | "warning" | "critical"; hint?: string },
  { id: string; label: string; value: string; delta?: string; tone?: "neutral" | "positive" | "warning" | "critical"; hint?: string },
  { id: string; label: string; value: string; delta?: string; tone?: "neutral" | "positive" | "warning" | "critical"; hint?: string },
] {
  const fallback = { id: "kpi-placeholder", label: "—", value: "—" };
  const list = [...kpis];
  while (list.length < 4) list.push({ ...fallback, id: `${fallback.id}-${list.length}` });
  return [list[0], list[1], list[2], list[3]];
}
