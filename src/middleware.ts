import { NextRequest, NextResponse } from "next/server";

import {
  CENTRAL_SITE_URL,
  INTERNAL_SITE_URL,
  UNIT311_SITE_HOST,
  WORKSPACE_HOST_ROUTE_PREFIX,
  buildInternalHostRedirectUrl,
  getRequestHost,
  isInternalDomainHost,
  isLocalDevHost,
  isPublicMarketingPath,
  isPublicSiteHost,
  legacyViewRedirects,
  normalizeHost,
  parseClientPlatformSubdomainSafe,
  parseValidWorkspaceReturnTo,
} from "@/lib/app-domains";

function withHostHeaders(
  request: NextRequest,
  flags: { public?: boolean; internal?: boolean; workspaceSlug?: string },
) {
  const requestHeaders = new Headers(request.headers);
  if (flags.public) requestHeaders.set("x-unit311-central", "1");
  if (flags.internal) requestHeaders.set("x-unit311-internal", "1");
  if (flags.workspaceSlug) {
    requestHeaders.set("x-unit311-workspace-slug", flags.workspaceSlug);
  }
  return requestHeaders;
}

function redirectExternal(url: string) {
  return NextResponse.redirect(url, 307);
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
 * Apex (public site): marketing + redirects old internal paths.
 * Internal host: rewrite onto /internaldashboard.
 * Customer hosts `{slug}.unit311central.com`: rewrite onto /ws/[slug] gateway.
 */
export function middleware(request: NextRequest) {
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
      return NextResponse.next({ request: { headers } });
    }

    // Phase 1 tenancy diagnostics — do not rewrite onto the splash gateway.
    if (pathname === "/diagnostics/workspace" || pathname.startsWith("/diagnostics/workspace/")) {
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

    const hasSession = Boolean(request.cookies.get("dc_platform_session")?.value);

    // Signed-in users hitting the splash go straight into the workspace app.
    if ((pathname === "/" || pathname === "") && hasSession) {
      return redirectExternal(`${workspaceOrigin}/dashboard${search}`);
    }

    // Real operations app (same shell as internal), public URL stays /dashboard.
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      if (!hasSession) {
        const loginUrl = new URL(`${CENTRAL_SITE_URL}/login`);
        loginUrl.searchParams.set("return_to", workspaceOrigin);
        return redirectExternal(loginUrl.toString());
      }

      if (pathname === "/dashboard/executive-assistant") {
        return rewriteTo(
          request,
          "/internaldashboard/executive-assistant",
          headers,
          workspaceResponseHeaders,
        );
      }
      if (pathname === "/dashboard/client-onboarding") {
        return rewriteTo(
          request,
          "/internaldashboard/client-onboarding",
          headers,
          workspaceResponseHeaders,
        );
      }

      return rewriteTo(request, "/internaldashboard", headers, workspaceResponseHeaders);
    }

    // Default: workspace gateway (sign-in landing). Avoid marketing homepage on customer hosts.
    const gatewayPath = `${WORKSPACE_HOST_ROUTE_PREFIX}/${encodeURIComponent(workspaceSlug)}`;
    return rewriteTo(request, gatewayPath, headers, workspaceResponseHeaders);
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
      return redirectExternal(`${INTERNAL_SITE_URL}${viewMap[pathname]}`);
    }

    if (
      pathname === "/internaldashboard" ||
      pathname.startsWith("/internaldashboard/") ||
      pathname === "/testflighthub" ||
      pathname.startsWith("/testflighthub/") ||
      pathname === "/internaldashboard_grants" ||
      pathname.startsWith("/internaldashboard_grants/")
    ) {
      return redirectExternal(buildInternalHostRedirectUrl(pathname, search));
    }

    return NextResponse.next({ request: { headers } });
  }

  if (isLocalDevHost(host)) {
    return NextResponse.next();
  }

  if (normalizedHost.startsWith("internal.")) {
    const headers = withHostHeaders(request, { internal: true });
    if (pathname === "/" || pathname === "") {
      return rewriteTo(request, "/internaldashboard", headers, { "x-unit311-internal": "1" });
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
