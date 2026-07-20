/**
 * Runtime surfaces — same codebase / same deploy; host + config only.
 *
 * - public: marketing (apex)
 * - internal: live Internal Operations (workspace unit311)
 * - demo: same Internal Operations UI, Demo workspace content
 * - customer: customer workspace hosts
 */

import {
  DEMO_WORKSPACE_SLUG,
  isDemoDomainHost,
  isInternalDomainHost,
  isPublicSiteHost,
  parseClientPlatformSubdomainSafe,
} from "@/lib/app-domains";

export type RuntimeSurface = "public" | "internal" | "demo" | "customer" | "unknown";

export function resolveRuntimeSurface(host: string | null | undefined): RuntimeSurface {
  if (isPublicSiteHost(host)) return "public";
  if (isDemoDomainHost(host)) return "demo";
  if (isInternalDomainHost(host)) return "internal";
  if (parseClientPlatformSubdomainSafe(host)) return "customer";
  return "unknown";
}

/** Workspace slug bound to the Demo surface (config override via env). */
export function demoWorkspaceSlug(): string {
  const fromEnv = process.env.DEMO_WORKSPACE_SLUG?.trim().toLowerCase();
  return fromEnv || DEMO_WORKSPACE_SLUG;
}

/**
 * Optional feature visibility for Demo — comma-separated module keys in
 * DEMO_VISIBLE_MODULES. Empty / unset = show everything (same as Internal).
 * Never use this for a code fork; only hide unfinished surfaces during demos.
 */
export function isModuleVisibleOnSurface(
  surface: RuntimeSurface,
  moduleKey: string,
): boolean {
  if (surface !== "demo") return true;
  const raw = process.env.DEMO_VISIBLE_MODULES?.trim();
  if (!raw) return true;
  const allowed = new Set(
    raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
  if (allowed.size === 0) return true;
  return allowed.has(moduleKey.trim().toLowerCase());
}

export function isDemoSurface(host: string | null | undefined): boolean {
  return resolveRuntimeSurface(host) === "demo";
}
