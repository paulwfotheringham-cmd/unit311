import { NextRequest, NextResponse } from "next/server";

import {
  CENTRAL_SITE_URL,
  DEMO_SITE_URL,
  DEMO_WORKSPACE_SLUG,
  INTERNAL_SITE_URL,
  UNIT311_SITE_HOST,
  WORKSPACE_HOST_ROUTE_PREFIX,
  buildInternalHostRedirectUrl,
  getRequestHost,
  isDemoDomainHost,
  isInternalDomainHost,
  isLocalDevHost,
  isPublicMarketingPath,
  isPublicSiteHost,
  legacyViewRedirects,
  mapLegacyInternalPathToInternalHostPath,
  normalizeHost,
  parseClientPlatformSubdomainSafe,
  parseValidWorkspaceReturnTo,
} from "@/lib/app-domains";
import {
  applyCustomerHostRebindIfNeeded,
  customerHostLoginRedirect,
  evaluateCustomerHostSessionGate,
} from "@/lib/workspace-host-session-gate";

function withHostHeaders(
  request: NextRequest,
  flags: { public?: boolean; internal?: boolean; demo?: boolean; workspaceSlug?: string },
) {
  const requestHeaders = new Headers(request.headers);
  if (flags.public) requestHeaders.set("x-unit311-central", "1");
  if (flags.internal) requestHeaders.set("x-unit311-internal", "1");
  if (flags.demo) {
    requestHeaders.set("x-unit311-demo", "1");
    requestHeaders.set("x-unit311-internal", "1");
    requestHeaders.set("x-unit311-workspace-slug", DEMO_WORKSPACE_SLUG);
  }
  if (flags.workspaceSlug) {
    requestHeaders.set("x-unit311-workspace-slug", flags.workspaceSlug);
  }
  return requestHeaders;
}

function redirectExternal(url: string, status: 307 | 308 = 307) {
  return NextResponse.redirect(url, status);
}

/** Permanent redirect for deprecated browser URLs (bookmarks / old links). */
function redirectPermanent(request: NextRequest, pathnameWithSearch: string) {
  const destination = request.nextUrl.clone();
  const parsed = new URL(pathnameWithSearch, request.nextUrl.origin);
  destination.pathname = parsed.pathname;
  destination.search = parsed.search;
  destination.hash = parsed.hash;
  return NextResponse.redirect(destination, 308);
}

function isLegacyInternalBrowserPath(pathname: string) {
  return (
    pathname === "/internaldashboard" ||
    pathname.startsWith("/internaldashboard/") ||
    pathname === "/testflighthub" ||
    pathname.startsWith("/testflighthub/")
  );
}

/**
 * If the browser still requests the legacy App Router path, send them to the
 * canonical internal-host URL. Middleware continues to *rewrite* `/` onto
 * `/internaldashboard` as the implementation path — that is not a public URL.
 */
function redirectLegacyInternalBrowserPath(request: NextRequest, pathname: string, search: string) {
  if (!isLegacyInternalBrowserPath(pathname)) return null;
  const mapped = mapLegacyInternalPathToInternalHostPath(pathname, search);
  return redirectPermanent(request, mapped);
}

function rewriteTo(
  request: NextRequest,
  pathname: string,
  headers: Headers,
  responseHeaders?: Record<string, string>,
) {
  const destination = request.nextUrl.clone();
  destination.pathname = pathname;
  const response = NextResponse.rewrite(destination, { request: { headers } });
  response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
  if (responseHeaders) {
    for (const [key, value] of Object.entries(responseHeaders)) {
      response.headers.set(key, value);
    }
  }
  return response;
}

/**
 * Apex (public site): marketing + permanent redirects of legacy internal paths.
 * Internal/demo hosts: rewrite `/` onto /internaldashboard (App Router); never
 * expose /internaldashboard as a public browser URL.
 * Customer hosts `{slug}.unit311central.com`: rewrite onto /ws/[slug] gateway.
 *
 * RC1-C07: on customer hosts, host is the tenant boundary. Valid sessions that
 * are authorised for the host workspace are rebound automatically; invalid or
 * unauthorised sessions are sent to login.
 */
export async function middleware(request: NextRequest) {
  const host = getRequestHost(request);
  const { pathname, search } = request.nextUrl;
  const normalizedHost = normalizeHost(host);

  // Internal workspace slug must never be a customer subdomain host.
  if (normalizedHost === `unit311.${UNIT311_SITE_HOST}`) {
    return redirectExternal(`${INTERNAL_SITE_URL}${pathname === "/" ? "" : pathname}${search}`);
  }

  // --- Customer workspace hosts: route into the app (existence checked in /ws/[slug]) ---
  const workspaceSlug = parseClientPlatformSubdomainSafe(host);
  if (workspaceSlug) {
    const headers = withHostHeaders(request, { workspaceSlug });
    const workspaceOrigin = `https://${workspaceSlug}.${UNIT311_SITE_HOST}`;
    const workspaceResponseHeaders = {
      "x-unit311-workspace": "1",
      "x-unit311-workspace-slug": workspaceSlug,
    };

    if (pathname === "/login" || pathname.startsWith("/login/")) {
      const loginUrl = new URL(`${CENTRAL_SITE_URL}/login`);
      loginUrl.search = search;
      const validatedReturnTo =
        parseValidWorkspaceReturnTo(loginUrl.searchParams.get("return_to")) ?? workspaceOrigin;
      loginUrl.searchParams.set("return_to", validatedReturnTo);
      return redirectExternal(loginUrl.toString());
    }

    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
      // APIs enforce host-authoritative tenancy in workspace-context.
      // Rebind on HTML navigations; APIs resolve active workspace from host + authz.
      return NextResponse.next({ request: { headers } });
    }

    // Workspace onboarding lives at /onboarding on the customer host.
    if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
      return rewriteTo(
        request,
        `/onboarding/${encodeURIComponent(workspaceSlug)}`,
        headers,
        workspaceResponseHeaders,
      );
    }

    const requiresAuthenticatedApp =
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/") ||
      ((pathname === "/" || pathname === "") &&
        Boolean(request.cookies.get("dc_platform_session")?.value));

    if (requiresAuthenticatedApp) {
      const gate = await evaluateCustomerHostSessionGate(request, workspaceSlug);

      if (gate.status === "anonymous" || gate.status === "invalid") {
        return customerHostLoginRedirect(workspaceOrigin);
      }

      if (gate.status === "workspace_missing") {
        const gatewayPath = `${WORKSPACE_HOST_ROUTE_PREFIX}/${encodeURIComponent(workspaceSlug)}`;
        return rewriteTo(request, gatewayPath, headers, workspaceResponseHeaders);
      }

      if (gate.status === "forbidden") {
        return customerHostLoginRedirect(workspaceOrigin);
      }

      // Signed-in users hitting the splash go straight into the workspace app.
      if (pathname === "/" || pathname === "") {
        const redirect = redirectExternal(`${workspaceOrigin}/dashboard${search}`);
        return applyCustomerHostRebindIfNeeded({ request, response: redirect, gate });
      }

      let response: NextResponse;
      if (pathname === "/dashboard/executive-assistant") {
        response = rewriteTo(
          request,
          "/internaldashboard/executive-assistant",
          headers,
          workspaceResponseHeaders,
        );
      } else if (pathname === "/dashboard/client-onboarding") {
        response = rewriteTo(
          request,
          "/internaldashboard/client-onboarding",
          headers,
          workspaceResponseHeaders,
        );
      } else {
        response = rewriteTo(request, "/internaldashboard", headers, workspaceResponseHeaders);
      }

      return applyCustomerHostRebindIfNeeded({ request, response, gate });
    }

    // Default: workspace gateway (sign-in landing). Avoid marketing homepage on customer hosts.
    const gatewayPath = `${WORKSPACE_HOST_ROUTE_PREFIX}/${encodeURIComponent(workspaceSlug)}`;
    return rewriteTo(request, gatewayPath, headers, workspaceResponseHeaders);
  }

  // --- Demo application host (same Internal Ops build; Demo workspace content) ---
  if (isDemoDomainHost(host)) {
    const headers = withHostHeaders(request, { demo: true });
    const shellHeaders = {
      "x-unit311-internal": "1",
      "x-unit311-demo": "1",
      "x-unit311-workspace-slug": DEMO_WORKSPACE_SLUG,
    };

    if (pathname === "/login" || pathname.startsWith("/login/")) {
      if (isLocalDevHost(host)) {
        const port = request.nextUrl.port || "3000";
        return redirectExternal(`http://localhost:${port}/login${search}`);
      }
      const loginUrl = new URL(`${CENTRAL_SITE_URL}/login`);
      loginUrl.search = search;
      loginUrl.searchParams.set("return_to", DEMO_SITE_URL);
      return redirectExternal(loginUrl.toString());
    }

    if (isPublicMarketingPath(pathname)) {
      if (isLocalDevHost(host)) {
        const port = request.nextUrl.port || "3000";
        return redirectExternal(`http://localhost:${port}${pathname}${search}`);
      }
      return redirectExternal(`${CENTRAL_SITE_URL}${pathname}${search}`);
    }

    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
      return NextResponse.next({ request: { headers } });
    }

    const legacyBrowserRedirect = redirectLegacyInternalBrowserPath(request, pathname, search);
    if (legacyBrowserRedirect) return legacyBrowserRedirect;

    if (pathname === "/" || pathname === "") {
      return rewriteTo(request, "/internaldashboard", headers, shellHeaders);
    }

    if (pathname === "/executive-assistant") {
      return rewriteTo(request, "/internaldashboard/executive-assistant", headers, shellHeaders);
    }

    if (pathname === "/client-onboarding") {
      return rewriteTo(request, "/internaldashboard/client-onboarding", headers, shellHeaders);
    }

    if (pathname === "/corporate-information/cap-table") {
      return rewriteTo(
        request,
        "/internaldashboard/corporate-information/cap-table",
        headers,
        shellHeaders,
      );
    }

    const viewMap = legacyViewRedirects();
    if (viewMap[pathname]) {
      const dest = viewMap[pathname];
      const destination = request.nextUrl.clone();
      destination.pathname = "/internaldashboard";
      destination.search = dest.includes("?") ? dest.slice(dest.indexOf("?")) : search;
      const response = NextResponse.rewrite(destination, { request: { headers } });
      for (const [key, value] of Object.entries(shellHeaders)) {
        response.headers.set(key, value);
      }
      response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
      return response;
    }

    const response = NextResponse.next({ request: { headers } });
    for (const [key, value] of Object.entries(shellHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // --- Internal application host ---
  if (isInternalDomainHost(host)) {
    const headers = withHostHeaders(request, { internal: true });

    if (pathname === "/login" || pathname.startsWith("/login/")) {
      if (isLocalDevHost(host)) {
        const port = request.nextUrl.port || "3000";
        return redirectExternal(`http://localhost:${port}/login${search}`);
      }
      return redirectExternal(`${CENTRAL_SITE_URL}/login${search}`);
    }

    if (isPublicMarketingPath(pathname)) {
      if (isLocalDevHost(host)) {
        const port = request.nextUrl.port || "3000";
        return redirectExternal(`http://localhost:${port}${pathname}${search}`);
      }
      return redirectExternal(`${CENTRAL_SITE_URL}${pathname}${search}`);
    }

    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
      return NextResponse.next({ request: { headers } });
    }

    const legacyBrowserRedirect = redirectLegacyInternalBrowserPath(request, pathname, search);
    if (legacyBrowserRedirect) return legacyBrowserRedirect;

    if (pathname === "/" || pathname === "") {
      return rewriteTo(request, "/internaldashboard", headers, { "x-unit311-internal": "1" });
    }

    if (pathname === "/executive-assistant") {
      return rewriteTo(request, "/internaldashboard/executive-assistant", headers, {
        "x-unit311-internal": "1",
      });
    }

    if (pathname === "/client-onboarding") {
      return rewriteTo(request, "/internaldashboard/client-onboarding", headers, {
        "x-unit311-internal": "1",
      });
    }

    if (pathname === "/corporate-information/cap-table") {
      return rewriteTo(request, "/internaldashboard/corporate-information/cap-table", headers, {
        "x-unit311-internal": "1",
      });
    }

    const viewMap = legacyViewRedirects();
    if (viewMap[pathname]) {
      const dest = viewMap[pathname];
      const destination = request.nextUrl.clone();
      destination.pathname = "/internaldashboard";
      destination.search = dest.includes("?") ? dest.slice(dest.indexOf("?")) : search;
      const response = NextResponse.rewrite(destination, { request: { headers } });
      response.headers.set("x-unit311-internal", "1");
      response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
      return response;
    }

    const response = NextResponse.next({ request: { headers } });
    response.headers.set("x-unit311-internal", "1");
    return response;
  }

  // --- Public apex / www ---
  if (isPublicSiteHost(host)) {
    const headers = withHostHeaders(request, { public: true });

    const viewMap = legacyViewRedirects();
    if (viewMap[pathname]) {
      return redirectExternal(`${INTERNAL_SITE_URL}${viewMap[pathname]}`, 308);
    }

    if (
      pathname === "/internaldashboard" ||
      pathname.startsWith("/internaldashboard/") ||
      pathname === "/testflighthub" ||
      pathname.startsWith("/testflighthub/") ||
      pathname === "/internaldashboard_grants" ||
      pathname.startsWith("/internaldashboard_grants/")
    ) {
      return redirectExternal(buildInternalHostRedirectUrl(pathname, search), 308);
    }

    return NextResponse.next({ request: { headers } });
  }

  if (isLocalDevHost(host)) {
    return NextResponse.next();
  }

  if (normalizedHost.startsWith("internal.")) {
    const headers = withHostHeaders(request, { internal: true });
    const legacyBrowserRedirect = redirectLegacyInternalBrowserPath(request, pathname, search);
    if (legacyBrowserRedirect) return legacyBrowserRedirect;
    if (pathname === "/" || pathname === "") {
      return rewriteTo(request, "/internaldashboard", headers, { "x-unit311-internal": "1" });
    }
    return NextResponse.next({ request: { headers } });
  }

  if (normalizedHost.startsWith("demo.")) {
    const headers = withHostHeaders(request, { demo: true });
    const legacyBrowserRedirect = redirectLegacyInternalBrowserPath(request, pathname, search);
    if (legacyBrowserRedirect) return legacyBrowserRedirect;
    if (pathname === "/" || pathname === "") {
      return rewriteTo(request, "/internaldashboard", headers, {
        "x-unit311-internal": "1",
        "x-unit311-demo": "1",
      });
    }
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Explicitly include `/` — catch-all patterns do not match the site root.
    "/",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
