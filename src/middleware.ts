import { NextRequest, NextResponse } from "next/server";

import { isCentralDomainHost } from "@/lib/app-domains";

const CENTRAL_PUBLIC_PREFIXES = [
  "/login",
  "/internaldashboard",
  "/internaldashboard_grants",
  "/client/",
  "/whatsapp/",
  "/api/",
  "/_next/",
];

const CENTRAL_MARKETING_PATHS = new Set([
  "/",
  "/about",
  "/contact",
  "/industries",
  "/surveying",
  "/inspection",
  "/commercial-imaging",
  "/app-download",
  "/clientlogin",
]);

function isCentralPublicPath(pathname: string) {
  return CENTRAL_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (!isCentralDomainHost(host)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-unit311-central", "1");

  if (isCentralPublicPath(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (CENTRAL_MARKETING_PATHS.has(pathname) || pathname.startsWith("/#")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.hash = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
