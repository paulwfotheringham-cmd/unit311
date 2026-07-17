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
  redirectPath: "/internaldashboard",
  userId: "00000000-0000-4000-8000-000000000001",
} as const;

/**
 * When the user started from a customer workspace (`return_to`), always send them
 * back to that host after login — never strand them on apex /payment, /questions, etc.
 * Onboarding vs dashboard is decided from workspace state on the customer host.
 */
async function resolveRedirectWithWorkspaceReturn(
  redirectPath: string,
  requestHost: string | null,
  returnTo: string | null,
): Promise<string> {
  if (returnTo) {
    const slug = parseClientPlatformSubdomainSafe(new URL(returnTo).host);
    let needsOnboarding = false;
    if (slug) {
      try {
        needsOnboarding = await workspaceNeedsCustomerOnboarding(slug);
      } catch {
        // Prefer dashboard over failing the whole login when onboarding lookup errors.
        needsOnboarding = false;
      }
    }
    return workspacePostLoginUrl(returnTo, needsOnboarding ? "onboarding" : "dashboard");
  }

  return resolveBrowserRedirectPathForHost(redirectPath, requestHost);
}

function returnToFromReferer(request: NextRequest): string | null {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    return parseValidWorkspaceReturnTo(new URL(referer).searchParams.get("return_to"));
  } catch {
    return null;
  }
}

async function createDemoLoginResponse(request: NextRequest, returnTo: string | null) {
  const workspaceSlug = returnTo
    ? parseClientPlatformSubdomainSafe(new URL(returnTo).host)
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
      redirectPath: DEMO_LOGIN.redirectPath,
      exp: Date.now() + PLATFORM_SESSION_MAX_AGE_SECONDS * 1000,
    },
    workspace,
  );

  // Demo login stays on the internal app unless a workspace return_to is present.
  const redirectPath = returnTo
    ? workspacePostLoginUrl(returnTo, "dashboard")
    : resolveBrowserRedirectPathForHost(DEMO_LOGIN.redirectPath, getRequestHost(request));

  const response = NextResponse.json({
    redirectPath,
    userType: session.userType,
    displayName: session.displayName,
    workspace: workspace
      ? { id: workspace.id, slug: workspace.slug, name: workspace.name }
      : null,
  });

  applyPlatformSessionCookie(response, createPlatformSessionToken(session), request);

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      returnTo?: string;
    };

    if (!body.username?.trim() || !body.password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    const returnTo =
      parseValidWorkspaceReturnTo(body.returnTo) ?? returnToFromReferer(request);
    const workspaceSlug = returnTo
      ? parseClientPlatformSubdomainSafe(new URL(returnTo).host)
      : null;

    if (
      normalizePlatformUsername(body.username) === DEMO_LOGIN.username &&
      body.password === DEMO_LOGIN.password
    ) {
      return createDemoLoginResponse(request, returnTo);
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

    try {
      await recordPlatformUserLogin(result.session.sub);
    } catch {
      // Non-blocking if last_login_at column is not yet migrated.
    }

    const redirectPath = await resolveRedirectWithWorkspaceReturn(
      result.redirectPath,
      getRequestHost(request),
      returnTo,
    );

    const response = NextResponse.json({
      redirectPath,
      appliedReturnTo: returnTo,
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
