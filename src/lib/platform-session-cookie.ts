import type { NextRequest, NextResponse } from "next/server";

import { platformSessionCookieDomain, resolveUnit311CookieHost } from "@/lib/app-domains";
import {
  PLATFORM_SESSION_COOKIE,
  PLATFORM_SESSION_MAX_AGE_SECONDS,
} from "@/lib/platform-session-token";

export { PLATFORM_SESSION_COOKIE, PLATFORM_SESSION_MAX_AGE_SECONDS };

/** Shared session cookie options for apex ↔ internal.* (and future workspace hosts). */
export function getPlatformSessionCookieOptions(request?: NextRequest | Request) {
  const host = resolveUnit311CookieHost(request ?? null);
  const domain = platformSessionCookieDomain(host);

  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: PLATFORM_SESSION_MAX_AGE_SECONDS,
    ...(domain ? { domain } : {}),
  };
}

/**
 * Set exactly one session Set-Cookie (shared Domain on unit311 hosts).
 * Do not emit a second clear/overwrite for the same cookie name — Next.js and
 * some proxies collapse same-name Set-Cookie headers and can drop the session.
 */
export function applyPlatformSessionCookie(
  response: NextResponse,
  token: string,
  request?: NextRequest | Request,
) {
  response.cookies.set(
    PLATFORM_SESSION_COOKIE,
    token,
    getPlatformSessionCookieOptions(request),
  );
}
