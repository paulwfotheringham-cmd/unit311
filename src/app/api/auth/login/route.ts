import { NextRequest, NextResponse } from "next/server";

import {
  PLATFORM_SESSION_MAX_AGE_SECONDS,
  createPlatformSessionToken,
  normalizePlatformUsername,
  type PlatformSession,
} from "@/lib/platform-auth";
import { applyPlatformSessionCookie } from "@/lib/platform-session-cookie";
import {
  getRequestHost,
  parseClientPlatformSubdomainSafe,
  parseLoginReturnTo,
  parseSafePostLoginNext,
  parseValidWorkspaceReturnTo,
  resolveBrowserRedirectPathForHost,
  workspacePostLoginUrl,
} from "@/lib/app-domains";
import { loginPlatformUser } from "@/lib/platform-users-service";
import { recordPlatformUserLogin } from "@/lib/external-platform-users-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { workspaceNeedsCustomerOnboarding } from "@/lib/workspace-customer-onboarding-service";
import {
  resolveWorkspaceBinding,
  withSessionWorkspace,
} from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

const DEMO_LOGIN = {
  username: "client",
  password: "client",
  redirectPath: "/",
  userId: "00000000-0000-4000-8000-000000000001",
} as const;

/**
 * Demo login (client/client) is a local/dev convenience only.
 * Disabled by default. Never available when NODE_ENV or VERCEL_ENV is production,
 * even if ENABLE_DEMO_LOGIN is set.
 */
function isDemoLoginEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  if (process.env.VERCEL_ENV === "production") {
    return false;
  }
  return process.env.ENABLE_DEMO_LOGIN === "true";
}

function returnToFromReferer(request: NextRequest): string | null {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).searchParams.get("return_to");
  } catch {
    return null;
  }
}

function nextFromReferer(request: NextRequest): string | null {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).searchParams.get("next");
  } catch {
    return null;
  }
}

/**
 * Resolve post-login navigation.
 * Priority: workspace return_to → demo/internal return_to (+ optional next) →
 * deep-link next → stored redirect_path (canonicalized).
 */
async function resolvePostLoginRedirect(options: {
  redirectPath: string;
  requestHost: string | null;
  returnToRaw: string | null;
  nextRaw: string | null;
  userType: string;
}): Promise<string> {
  const { redirectPath, requestHost, returnToRaw, nextRaw, userType } = options;
  const loginReturn = parseLoginReturnTo(returnToRaw);
  const nextPath = parseSafePostLoginNext(nextRaw);

  if (loginReturn?.kind === "workspace") {
    const slug = parseClientPlatformSubdomainSafe(new URL(loginReturn.origin).host);
    let needsOnboarding = false;
    if (slug) {
      try {
        needsOnboarding = await workspaceNeedsCustomerOnboarding(slug);
      } catch {
        needsOnboarding = false;
      }
    }
    return workspacePostLoginUrl(loginReturn.origin, needsOnboarding ? "onboarding" : "dashboard");
  }

  if (loginReturn?.kind === "demo" || loginReturn?.kind === "internal") {
    const path = nextPath || "/";
    return resolveBrowserRedirectPathForHost(path, requestHost, {
      userType: "internal",
      opsOrigin: loginReturn.origin,
    });
  }

  // Workspace-only helper still used by older clients that only send validated workspace URLs.
  const workspaceOnly = parseValidWorkspaceReturnTo(returnToRaw);
  if (workspaceOnly) {
    const slug = parseClientPlatformSubdomainSafe(new URL(workspaceOnly).host);
    let needsOnboarding = false;
    if (slug) {
      try {
        needsOnboarding = await workspaceNeedsCustomerOnboarding(slug);
      } catch {
        needsOnboarding = false;
      }
    }
    return workspacePostLoginUrl(workspaceOnly, needsOnboarding ? "onboarding" : "dashboard");
  }

  if (nextPath) {
    return resolveBrowserRedirectPathForHost(nextPath, requestHost, {
      userType: userType === "external" ? "external" : "internal",
    });
  }

  return resolveBrowserRedirectPathForHost(redirectPath, requestHost, {
    userType,
  });
}

async function createDemoLoginResponse(
  request: NextRequest,
  returnToRaw: string | null,
  nextRaw: string | null,
) {
  const loginReturn = parseLoginReturnTo(returnToRaw);
  const workspaceSlug =
    loginReturn?.kind === "workspace"
      ? parseClientPlatformSubdomainSafe(new URL(loginReturn.origin).host)
      : null;
  const workspace = await resolveWorkspaceBinding({
    workspaceSlug,
    fallbackInternal: !workspaceSlug,
  });

  const session: PlatformSession = withSessionWorkspace(
    {
      sub: DEMO_LOGIN.userId,
      username: DEMO_LOGIN.username,
      displayName: "Client",
      userType: "internal",
      redirectPath: "/",
      exp: Date.now() + PLATFORM_SESSION_MAX_AGE_SECONDS * 1000,
    },
    workspace,
  );

  const redirectPath = await resolvePostLoginRedirect({
    redirectPath: DEMO_LOGIN.redirectPath,
    requestHost: getRequestHost(request),
    returnToRaw,
    nextRaw,
    userType: "internal",
  });

  const response = NextResponse.json({
    redirectPath,
    userType: session.userType,
    displayName: session.displayName,
    workspace: workspace
      ? { id: workspace.id, slug: workspace.slug, name: workspace.name }
      : null,
  });

  applyPlatformSessionCookie(response, await createPlatformSessionToken(session), request);

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      returnTo?: string;
      next?: string;
    };

    if (!body.username?.trim() || !body.password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    const returnToRaw =
      body.returnTo?.trim() ||
      returnToFromReferer(request);
    const nextRaw = body.next?.trim() || nextFromReferer(request) || null;

    const loginReturn = parseLoginReturnTo(returnToRaw);
    const workspaceSlug =
      loginReturn?.kind === "workspace"
        ? parseClientPlatformSubdomainSafe(new URL(loginReturn.origin).host)
        : parseClientPlatformSubdomainSafe(
            parseValidWorkspaceReturnTo(returnToRaw)
              ? new URL(parseValidWorkspaceReturnTo(returnToRaw)!).host
              : null,
          );

    if (
      isDemoLoginEnabled() &&
      normalizePlatformUsername(body.username) === DEMO_LOGIN.username &&
      body.password === DEMO_LOGIN.password
    ) {
      return createDemoLoginResponse(request, returnToRaw, nextRaw);
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    const result = await loginPlatformUser(body.username, body.password, {
      workspaceSlug,
    });
    if (!result) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }
    if ("forbidden" in result) {
      return NextResponse.json(
        { error: "You do not have access to this workspace." },
        { status: 403 },
      );
    }

    try {
      await recordPlatformUserLogin(result.session.sub);
    } catch {
      // Non-blocking if last_login_at column is not yet migrated.
    }

    const redirectPath = await resolvePostLoginRedirect({
      redirectPath: result.redirectPath,
      requestHost: getRequestHost(request),
      returnToRaw,
      nextRaw,
      userType: result.session.userType,
    });

    const response = NextResponse.json({
      redirectPath,
      appliedReturnTo: loginReturn?.origin ?? parseValidWorkspaceReturnTo(returnToRaw),
      userType: result.session.userType,
      displayName: result.session.displayName,
      workspace: result.session.workspaceId
        ? {
            id: result.session.workspaceId,
            slug: result.session.workspaceSlug,
            name: result.session.workspaceName,
          }
        : null,
    });

    applyPlatformSessionCookie(response, result.token, request);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
