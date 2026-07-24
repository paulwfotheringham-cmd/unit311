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

export type LoginReturnTarget =
  | { kind: "workspace"; origin: string }
  | { kind: "demo"; origin: string }
  | { kind: "internal"; origin: string };

/**
 * Accept customer workspace, Demo, or Internal origins as post-login return targets.
 * Used when middleware sends users from demo/internal hosts to apex `/login`.
 */
export function parseLoginReturnTo(value: string | null | undefined): LoginReturnTarget | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const host = url.host;
    const protocolOk =
      url.protocol === "https:" ||
      (url.protocol === "http:" && isLocalDevHost(host));
    if (!protocolOk) return null;

    if (isDemoDomainHost(host)) {
      return {
        kind: "demo",
        origin: isLocalDevHost(host) ? `${url.protocol}//${host}` : DEMO_SITE_URL,
      };
    }
    if (isInternalDomainHost(host)) {
      return {
        kind: "internal",
        origin: isLocalDevHost(host) ? `${url.protocol}//${host}` : INTERNAL_SITE_URL,
      };
    }

    const workspace = parseValidWorkspaceReturnTo(
      url.protocol === "https:" ? url.origin : null,
    );
    if (workspace) return { kind: "workspace", origin: workspace };
    return null;
  } catch {
    return null;
  }
}

/**
 * Safe post-login deep link (`/?view=clients`, legacy hard paths mapped to `?view=`).
 * Returns canonical path+query only (never a legacy /internaldashboard browser path).
 */
export function parseSafePostLoginNext(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();

  try {
    let pathname: string;
    let search: string;

    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw);
      if (!isInternalOpsShellHost(url.host) && !isLocalDevHost(url.host)) return null;
      pathname = url.pathname;
      search = url.search;
    } else {
      if (!raw.startsWith("/") || raw.startsWith("//")) return null;
      const url = new URL(raw, "https://placeholder.local");
      if (url.pathname.includes("..")) return null;
      pathname = url.pathname;
      search = url.search;
    }

    const mapped =
      isLegacyInternalPathname(pathname) || mapHardPathToViewQuery(pathname, search)
        ? mapLegacyInternalPathToInternalHostPath(pathname, search)
        : `${pathname === "" ? "/" : pathname}${search}`;

    const mappedUrl = new URL(mapped, "https://placeholder.local");
    if (!isInternalAppPath(mappedUrl.pathname) && mappedUrl.pathname !== "/") {
      return null;
    }
    // Never expose the App Router implementation path in the browser.
    if (isLegacyInternalPathname(mappedUrl.pathname) || mapHardPathToViewQuery(mappedUrl.pathname)) {
      return mapLegacyInternalPathToInternalHostPath(mappedUrl.pathname, mappedUrl.search);
    }
    return `${mappedUrl.pathname}${mappedUrl.search}`;
  } catch {
    return null;
  }
}

export function centralLoginUrl(returnTo?: string | null) {
  const base = `${CENTRAL_SITE_URL}${centralLoginPath()}`;
  const validated =
    parseValidWorkspaceReturnTo(returnTo) ??
    parseLoginReturnTo(returnTo)?.origin ??
    null;
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
/** Former hard-path modules → canonical `?view=` addresses. */
const HARD_PATH_TO_VIEW: Record<string, string> = {
  "/executive-assistant": "executive-assistant",
  "/client-onboarding": "client-onboarding",
  "/corporate-information/cap-table": "corporate-cap-table",
  "/dashboard/executive-assistant": "executive-assistant",
  "/dashboard/client-onboarding": "client-onboarding",
};

export function mapHardPathToViewQuery(pathname: string, search = ""): string | null {
  const view = HARD_PATH_TO_VIEW[pathname];
  if (!view) return null;
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search || undefined,
  );
  params.set("view", view);
  const base =
    pathname.startsWith("/dashboard")
      ? "/dashboard"
      : "/";
  const qs = params.toString();
  return qs ? `${base}?${qs}` : `${base}?view=${encodeURIComponent(view)}`;
}

export function mapLegacyInternalPathToInternalHostPath(pathname: string, search = ""): string {
  const query = search && !search.startsWith("?") ? `?${search}` : search;

  if (pathname === "/internaldashboard" || pathname === "/internaldashboard/") {
    return `/${query}`;
  }

  if (pathname.startsWith("/internaldashboard/")) {
    const rest = pathname.slice("/internaldashboard".length);
    const hardMapped = mapHardPathToViewQuery(rest, query);
    if (hardMapped) return hardMapped;
    return `${rest}${query}`;
  }

  const hardMapped = mapHardPathToViewQuery(pathname, query);
  if (hardMapped) return hardMapped;

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

function joinOriginAndPath(origin: string, pathAndQuery: string) {
  const base = origin.replace(/\/$/, "");
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return `${base}${path}`;
}

/**
 * Normalize stored redirect_path values (DB / session) to the canonical browser path.
 * Strips legacy `/internaldashboard` prefixes; defaults to `/`.
 * Absolute URLs keep their origin and only have the path canonicalized.
 */
export function canonicalizeStoredRedirectPath(redirectPath: string | null | undefined): string {
  const raw = (redirectPath ?? "").trim() || "/";
  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw);
      const path = isLegacyInternalPathname(url.pathname)
        ? mapLegacyInternalPathToInternalHostPath(url.pathname, url.search)
        : `${url.pathname}${url.search}`;
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      return `${url.origin}${normalizedPath}`;
    }
    const url = new URL(raw, "https://placeholder.local");
    if (isLegacyInternalPathname(url.pathname)) {
      return mapLegacyInternalPathToInternalHostPath(url.pathname, url.search) || "/";
    }
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return "/";
  }
}

export type ResolveBrowserRedirectOptions = {
  /** When set, bare `/` from internal operators is sent to the Internal host from apex. */
  userType?: "internal" | "external" | string | null;
  /** Preferred ops shell origin (demo vs internal) when upgrading relative paths. */
  opsOrigin?: string | null;
};

function resolveOpsShellOrigin(
  requestHost: string | null | undefined,
  absoluteHost: string | null,
  opsOriginOption?: string | null,
): string {
  if (opsOriginOption?.trim()) return opsOriginOption.replace(/\/$/, "");
  const host = absoluteHost || normalizeHost(requestHost);
  if (isDemoDomainHost(host)) {
    return isLocalDevHost(host) ? `http://${host}` : DEMO_SITE_URL;
  }
  if (isInternalDomainHost(host) && isLocalDevHost(host)) {
    return `http://${host}`;
  }
  return INTERNAL_SITE_URL;
}

function isCanonicalOpsBrowserPath(pathAndQuery: string): boolean {
  const url = new URL(pathAndQuery, "https://placeholder.local");
  if (url.pathname === "/" || pathAndQuery.startsWith("/?")) return true;
  return isInternalAppPath(url.pathname);
}

/**
 * Resolve a stored/login redirect_path into a browser navigation target for the
 * request host. Never returns a visible `/internaldashboard` URL outside local
 * path-based development.
 */
export function resolveBrowserRedirectPathForHost(
  redirectPath: string,
  requestHost: string | null | undefined,
  options?: ResolveBrowserRedirectOptions,
): string {
  const normalized = canonicalizeStoredRedirectPath(redirectPath);

  let absoluteHost: string | null = null;
  let canonicalPath: string;

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      absoluteHost = url.host;
      canonicalPath = `${url.pathname}${url.search}` || "/";
    } catch {
      canonicalPath = "/";
    }
  } else {
    canonicalPath = normalized;
  }

  const canonicalUrl = new URL(canonicalPath, "https://placeholder.local");

  // Local path-based development: App Router still lives under /internaldashboard.
  if (isLocalDevHost(requestHost) && !isInternalOpsShellHost(requestHost) && !absoluteHost) {
    if (options?.userType === "internal" || isCanonicalOpsBrowserPath(canonicalPath)) {
      if (canonicalUrl.pathname === "/") {
        return `/internaldashboard${canonicalUrl.search}`;
      }
      return `/internaldashboard${canonicalUrl.pathname}${canonicalUrl.search}`;
    }
    return canonicalPath;
  }

  // Already on Internal/Demo — relative canonical path only.
  if (isInternalOpsShellHost(requestHost)) {
    return canonicalPath;
  }

  const opsOrigin = resolveOpsShellOrigin(requestHost, absoluteHost, options?.opsOrigin);

  // Absolute URL to ops or customer host: keep origin, canonicalize path.
  if (absoluteHost) {
    if (isDemoDomainHost(absoluteHost) || isInternalDomainHost(absoluteHost)) {
      return joinOriginAndPath(opsOrigin, canonicalPath);
    }
    if (parseClientPlatformSubdomainSafe(absoluteHost)) {
      return joinOriginAndPath(`https://${normalizeHost(absoluteHost)}`, canonicalPath);
    }
    // Other absolute URLs (e.g. already-canonicalized external) — return as-is.
    return normalized;
  }

  // External users stay on apex for non-ops destinations (/payment, etc.).
  if (options?.userType === "external" && !isCanonicalOpsBrowserPath(canonicalPath)) {
    return canonicalPath;
  }

  // Internal operators and ops destinations: always land on the ops host from apex.
  if (options?.userType === "internal" || isCanonicalOpsBrowserPath(canonicalPath)) {
    return joinOriginAndPath(
      options?.userType === "internal" && !opsOrigin.includes("demo.")
        ? INTERNAL_SITE_URL
        : opsOrigin,
      canonicalPath,
    );
  }

  return canonicalPath;
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
    pathname === "/communications" ||
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
    "/communications": "/?view=communications",
    "/calendar": "/?view=calendar",
    "/info-email": "/?view=info-email",
    "/projects": "/?view=projects",
    "/files": "/?view=files",
    "/users": "/?view=users",
    "/telemetry": "/?view=telemetry",
    "/executive-assistant": "/?view=executive-assistant",
    "/client-onboarding": "/?view=client-onboarding",
    "/corporate-information/cap-table": "/?view=corporate-cap-table",
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
