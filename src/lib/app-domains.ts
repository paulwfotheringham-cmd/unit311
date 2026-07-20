export const CENTRAL_SITE_HOST = "unit311central.com";
export const UNIT311_SITE_HOST = CENTRAL_SITE_HOST;
export const INTERNAL_SITE_HOST = `internal.${UNIT311_SITE_HOST}`;
export const DEMO_SITE_HOST = `demo.${UNIT311_SITE_HOST}`;

export const CENTRAL_SITE_URL = `https://${CENTRAL_SITE_HOST}`;
export const INTERNAL_SITE_URL = `https://${INTERNAL_SITE_HOST}`;
export const DEMO_SITE_URL = `https://${DEMO_SITE_HOST}`;

/** Canonical Demo workspace slug (content tenancy; same build as Internal). */
export const DEMO_WORKSPACE_SLUG = "demo";

/** Apex / www public marketing site hosts. */
const PUBLIC_SITE_HOSTS = new Set([CENTRAL_SITE_HOST, `www.${CENTRAL_SITE_HOST}`]);

/**
 * Subdomains reserved for platform infrastructure (not customer workspaces).
 * Future customer hosts: `{workspace-slug}.unit311central.com`
 */
export const RESERVED_UNIT311_SUBDOMAINS = new Set([
  "www",
  "internal",
  "demo",
  "unit311", // Internal workspace slug — use internal.unit311central.com
  "api",
  "app",
  "admin",
  "mail",
  "status",
  "docs",
  "cdn",
  "assets",
  "static",
]);

/** App Router prefix used for customer workspace host rewrites (not a public marketing path). */
export const WORKSPACE_HOST_ROUTE_PREFIX = "/ws";

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0].trim().toLowerCase();
}

/**
 * Prefer x-forwarded-host on Vercel (custom domains), then Host.
 * Used by middleware and session cookie domain resolution.
 */
export function getRequestHost(request: { headers: Headers } | null | undefined): string | null {
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return request.headers.get("host");
}

function hostFromAbsoluteUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * Resolve a unit311-family host for cookie Domain=.unit311central.com.
 * Falls back across forwarded Host, Host, Origin, and Referer so apex login
 * cookies always share with internal.* even when Vercel reports *.vercel.app.
 */
export function resolveUnit311CookieHost(
  request: { headers: Headers } | null | undefined,
): string | null {
  if (!request) return null;

  const candidates = [
    getRequestHost(request),
    request.headers.get("host"),
    hostFromAbsoluteUrl(request.headers.get("origin")),
    hostFromAbsoluteUrl(request.headers.get("referer")),
  ];

  for (const candidate of candidates) {
    if (candidate && isUnit311FamilyHost(candidate)) {
      return normalizeHost(candidate);
    }
  }

  return getRequestHost(request);
}

export function isLocalDevHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".localhost")
  );
}

/** Public marketing hosts (apex + www). Does not include internal.* or workspace slugs. */
export function isCentralDomainHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  if (PUBLIC_SITE_HOSTS.has(normalized)) return true;
  return normalized.replace(/^www\./, "") === CENTRAL_SITE_HOST;
}

export function isPublicSiteHost(host: string | null | undefined): boolean {
  return isCentralDomainHost(host);
}

export function isInternalDomainHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  if (normalized === INTERNAL_SITE_HOST) return true;
  // Local convenience: internal.localhost
  if (normalized === "internal.localhost") return true;
  return false;
}

/**
 * Demo surface host — same Internal Operations application build as Internal.
 * Content tenancy is the Demo workspace (see DEMO_WORKSPACE_SLUG), not a fork.
 */
export function isDemoDomainHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  if (normalized === DEMO_SITE_HOST) return true;
  if (normalized === "demo.localhost") return true;
  return false;
}

/** Internal Ops shell hosts (live Internal or Demo). Same UI routes. */
export function isInternalOpsShellHost(host: string | null | undefined): boolean {
  return isInternalDomainHost(host) || isDemoDomainHost(host);
}

/** Any host under unit311central.com (public, internal, or future workspace). */
export function isUnit311FamilyHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;
  if (isLocalDevHost(normalized)) return true;
  if (normalized === UNIT311_SITE_HOST || normalized === `www.${UNIT311_SITE_HOST}`) return true;
  return normalized.endsWith(`.${UNIT311_SITE_HOST}`);
}

/**
 * Cookie parent domain so apex login can share session with internal.*
 * (and future workspace subdomains). Omit on localhost.
 */
export function platformSessionCookieDomain(
  host: string | null | undefined,
): string | undefined {
  const normalized = normalizeHost(host);
  if (!normalized || isLocalDevHost(normalized)) return undefined;
  if (!isUnit311FamilyHost(normalized)) return undefined;
  return `.${UNIT311_SITE_HOST}`;
}

export function centralLoginPath() {
  return "/login";
}

/**
 * Canonical origin for a customer workspace host (`https://{slug}.unit311central.com`).
 * Does not accept reserved / infrastructure subdomains.
 */
export function customerWorkspaceOrigin(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || normalized.includes(".") || RESERVED_UNIT311_SUBDOMAINS.has(normalized)) {
    return null;
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(normalized)) {
    return null;
  }
  return `https://${normalized}.${UNIT311_SITE_HOST}`;
}

/**
 * Validate `return_to` for workspace login. Only `https://{slug}.unit311central.com`
 * (optional path/query ignored; origin is returned). Rejects apex, www, internal, reserved.
 */
export function parseValidWorkspaceReturnTo(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    const slug = parseClientPlatformSubdomainSafe(url.host);
    if (!slug) return null;
    return customerWorkspaceOrigin(slug);
  } catch {
    return null;
  }
}

export function centralLoginUrl(returnTo?: string | null) {
  const base = `${CENTRAL_SITE_URL}${centralLoginPath()}`;
  const validated = parseValidWorkspaceReturnTo(returnTo);
  if (!validated) return base;
  const url = new URL(base);
  url.searchParams.set("return_to", validated);
  return url.toString();
}

/** Post-login destination on a validated workspace origin. */
export function workspacePostLoginUrl(
  returnToOrigin: string,
  destination: "onboarding" | "dashboard",
): string {
  const origin = parseValidWorkspaceReturnTo(returnToOrigin) ?? returnToOrigin.replace(/\/$/, "");
  return `${origin}/${destination}`;
}

/** Canonical internal app entry (public URL layout). */
export function internalAppPath(view?: string) {
  if (!view) return "/";
  return `/?view=${encodeURIComponent(view)}`;
}

export function internalAppUrl(pathAndQuery = "/") {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return `${INTERNAL_SITE_URL}${path}`;
}

/**
 * @deprecated Prefer internalAppPath / resolveInternalAppHref.
 * Kept for compatibility — returns the public internal app path on the
 * internal host (no /internaldashboard prefix).
 */
export function centralDashboardPath(view?: string) {
  return internalAppPath(view);
}

/**
 * Map legacy `/internaldashboard` paths onto the new internal-host URL layout.
 * Leaves unrelated paths unchanged.
 */
export function mapLegacyInternalPathToInternalHostPath(pathname: string, search = ""): string {
  const query = search && !search.startsWith("?") ? `?${search}` : search;

  if (pathname === "/internaldashboard" || pathname === "/internaldashboard/") {
    return `/${query}`;
  }

  if (pathname.startsWith("/internaldashboard/")) {
    const rest = pathname.slice("/internaldashboard".length);
    return `${rest}${query}`;
  }

  if (pathname === "/testflighthub" || pathname.startsWith("/testflighthub/")) {
    return `/${query}`;
  }

  if (pathname === "/internaldashboard_grants" || pathname.startsWith("/internaldashboard_grants/")) {
    return `${pathname}${query}`;
  }

  return `${pathname}${query}`;
}

export function buildInternalHostRedirectUrl(
  pathname: string,
  search = "",
  hostBase: string = INTERNAL_SITE_URL,
): string {
  const mapped = mapLegacyInternalPathToInternalHostPath(pathname, search);
  return `${hostBase.replace(/\/$/, "")}${mapped.startsWith("/") ? mapped : `/${mapped}`}`;
}

function isLegacyInternalPathname(pathname: string) {
  return (
    pathname === "/internaldashboard" ||
    pathname.startsWith("/internaldashboard/") ||
    pathname === "/testflighthub" ||
    pathname.startsWith("/testflighthub/") ||
    pathname === "/internaldashboard_grants" ||
    pathname.startsWith("/internaldashboard_grants/")
  );
}

/**
 * Resolve a stored/login redirect_path into a browser navigation target for the
 * request host. Legacy `/internaldashboard…` maps to the internal host URL layout.
 */
export function resolveBrowserRedirectPathForHost(
  redirectPath: string,
  requestHost: string | null | undefined,
): string {
  const raw = redirectPath.trim() || "/internaldashboard";
  if (/^https?:\/\//i.test(raw)) return raw;

  const url = new URL(raw, "https://placeholder.local");
  const pathname = url.pathname;
  const search = url.search;

  // Local path-based development (localhost): keep legacy paths.
  if (isLocalDevHost(requestHost) && !isInternalDomainHost(requestHost)) {
    return `${pathname}${search}`;
  }

  if (isLegacyInternalPathname(pathname)) {
    const mapped = mapLegacyInternalPathToInternalHostPath(pathname, search);
    if (isInternalDomainHost(requestHost)) {
      return mapped;
    }
    if (normalizeHost(requestHost) === "internal.localhost") {
      return `http://internal.localhost${mapped}`;
    }
    return `${INTERNAL_SITE_URL}${mapped}`;
  }

  return `${pathname}${search}`;
}

/** Paths that belong to the internal app (legacy + new layout). */
export function isInternalAppPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/internaldashboard" ||
    pathname.startsWith("/internaldashboard/") ||
    pathname === "/internaldashboard_grants" ||
    pathname.startsWith("/internaldashboard_grants/") ||
    pathname === "/testflighthub" ||
    pathname.startsWith("/testflighthub/") ||
    pathname === "/executive-assistant" ||
    pathname === "/client-onboarding" ||
    pathname === "/corporate-information/cap-table" ||
    pathname === "/crm" ||
    pathname === "/financials" ||
    pathname === "/messaging" ||
    pathname === "/calendar" ||
    pathname === "/info-email" ||
    pathname === "/projects" ||
    pathname === "/files" ||
    pathname === "/users" ||
    pathname === "/telemetry"
  );
}

const PUBLIC_ONLY_PATH_PREFIXES = [
  "/about",
  "/book",
  "/contact",
  "/faq",
  "/signup",
  "/payment",
  "/payment_card",
  "/payment_transfer",
  "/questions",
  "/onboarding",
  "/privacypolicy",
  "/termsandconditions",
  "/security",
  "/industries",
  "/surveying",
  "/inspection",
  "/commercial-imaging",
  "/app-download",
  "/whatsapp",
  "/executivecall",
  "/meet",
  "/report-chat",
  "/client",
  "/clientlogin",
  "/foundermeeting",
];

export function isPublicMarketingPath(pathname: string): boolean {
  if (pathname === "/") return false; // on internal host, / is the app
  if (pathname === "/login") return true;
  return PUBLIC_ONLY_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function legacyViewRedirects(): Record<string, string> {
  return {
    "/crm": "/?view=crm",
    "/financials": "/?view=financials",
    "/messaging": "/?view=messaging",
    "/calendar": "/?view=calendar",
    "/info-email": "/?view=info-email",
    "/projects": "/?view=projects",
    "/files": "/?view=files",
    "/users": "/?view=users",
    "/telemetry": "/?view=telemetry",
  };
}

/**
 * Future workspace host parser. Returns null for apex/www/internal/reserved.
 * Does not activate customer workspaces — middleware uses this only to isolate
 * future `{slug}.unit311central.com` hosts from public/internal routing.
 */
export function parseClientPlatformSubdomainSafe(
  host: string | null | undefined,
): string | null {
  const normalized = normalizeHost(host);
  if (!normalized.endsWith(`.${UNIT311_SITE_HOST}`)) {
    return null;
  }

  const subdomain = normalized.slice(0, -(UNIT311_SITE_HOST.length + 1));
  if (!subdomain || subdomain.includes(".")) {
    return null;
  }
  if (RESERVED_UNIT311_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  return subdomain;
}
