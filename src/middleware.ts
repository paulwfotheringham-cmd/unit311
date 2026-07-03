import { NextRequest, NextResponse } from "next/server";

import { isCentralDomainHost } from "@/lib/app-domains";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  if (!isCentralDomainHost(host)) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-unit311-central", "1");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
