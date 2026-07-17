import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  CENTRAL_SITE_URL,
  WORKSPACE_HOST_ROUTE_PREFIX,
  normalizeHost,
  parseClientPlatformSubdomainSafe,
} from "@/lib/app-domains";

export type WorkspaceHostRecord = {
  id: string;
  name: string;
  slug: string;
  workspaceType: string;
  status: string;
};

export function workspaceHostPath(slug: string, restPath = "") {
  const normalizedSlug = slug.trim().toLowerCase();
  const rest = restPath && restPath !== "/" ? restPath : "";
  return `${WORKSPACE_HOST_ROUTE_PREFIX}/${encodeURIComponent(normalizedSlug)}${rest}`;
}

export function parseWorkspaceSlugFromPathname(pathname: string): string | null {
  const prefix = `${WORKSPACE_HOST_ROUTE_PREFIX}/`;
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length).split("/")[0]?.trim().toLowerCase();
  return slug || null;
}

/**
 * Existence lookup only — not full workspace resolution / tenancy context.
 * Returns null when the slug has no row in public.workspaces.
 */
export async function findWorkspaceBySlug(
  slug: string,
): Promise<WorkspaceHostRecord | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, workspace_type, status")
    .eq("slug", normalized)
    .maybeSingle();

  if (error || !data) return null;

  return mapWorkspaceRow(data);
}

export async function findWorkspaceById(
  id: string,
): Promise<WorkspaceHostRecord | null> {
  const normalized = id.trim();
  if (!normalized) return null;
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, workspace_type, status")
    .eq("id", normalized)
    .maybeSingle();

  if (error || !data) return null;

  return mapWorkspaceRow(data);
}

function mapWorkspaceRow(data: {
  id: unknown;
  name: unknown;
  slug: unknown;
  workspace_type: unknown;
  status: unknown;
}): WorkspaceHostRecord {
  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    slug: String(data.slug ?? ""),
    workspaceType: String(data.workspace_type ?? ""),
    status: String(data.status ?? ""),
  };
}

export function workspaceHostFromRequestHost(host: string | null | undefined) {
  return parseClientPlatformSubdomainSafe(host);
}

export function isWorkspaceHostRoute(pathname: string | null | undefined) {
  if (!pathname) return false;
  return (
    pathname === WORKSPACE_HOST_ROUTE_PREFIX ||
    pathname.startsWith(`${WORKSPACE_HOST_ROUTE_PREFIX}/`)
  );
}

export function marketingHomeUrl() {
  return CENTRAL_SITE_URL;
}

export function normalizeWorkspaceSlug(value: string) {
  return normalizeHost(value).replace(/\./g, "");
}

/** Canonical labels for the customer workspace host placeholder UI. */
export type WorkspaceDisplayStatus =
  | "Preparing"
  | "Onboarding"
  | "Pending Activation"
  | "Active";

/**
 * Map stored workspace.status values onto the placeholder display labels.
 * Unknown / empty values default to Preparing (pre-activation).
 */
export function formatWorkspaceDisplayStatus(
  status: string | null | undefined,
): WorkspaceDisplayStatus {
  const normalized = (status ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");

  if (normalized === "active") return "Active";
  if (normalized === "onboarding") return "Onboarding";
  if (
    normalized === "pending activation" ||
    normalized === "pending payment" ||
    normalized === "pending" ||
    normalized === "pendingactivation" ||
    normalized === "pendingpayment"
  ) {
    return "Pending Activation";
  }
  if (normalized === "preparing" || normalized === "created" || normalized === "provisioning") {
    return "Preparing";
  }

  return "Preparing";
}
