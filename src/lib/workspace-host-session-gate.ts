import { NextResponse, type NextRequest } from "next/server";

import {
  CENTRAL_SITE_URL,
  getRequestHost,
  parseClientPlatformSubdomainSafe,
} from "@/lib/app-domains";
import {
  PLATFORM_SESSION_COOKIE,
  readPlatformSessionToken,
  type PlatformSession,
} from "@/lib/platform-auth";
import { authorizeUserForWorkspace } from "@/lib/workspace-authorization";
import { findWorkspaceBySlug } from "@/lib/workspace-host";
import {
  rebindSessionToWorkspace,
  sessionNeedsWorkspaceRebind,
} from "@/lib/workspace-session-rebind";

export type CustomerHostSessionGate =
  | { status: "anonymous" }
  | { status: "invalid" }
  | { status: "workspace_missing" }
  | { status: "forbidden"; session: PlatformSession }
  | {
      status: "ok";
      session: PlatformSession;
      workspace: { id: string; slug: string; name: string };
      needsRebind: boolean;
    };

/**
 * Identity + membership gate for customer workspace hosts.
 * Active workspace is always the host workspace after authorization.
 */
export async function evaluateCustomerHostSessionGate(
  request: NextRequest,
  workspaceSlug: string,
): Promise<CustomerHostSessionGate> {
  const token = request.cookies.get(PLATFORM_SESSION_COOKIE)?.value;
  if (!token) {
    return { status: "anonymous" };
  }

  const session = readPlatformSessionToken(token);
  if (!session) {
    return { status: "invalid" };
  }

  const record = await findWorkspaceBySlug(workspaceSlug);
  if (!record) {
    return { status: "workspace_missing" };
  }

  const workspace = {
    id: record.id,
    slug: record.slug,
    name: record.name,
  };

  const decision = await authorizeUserForWorkspace(session.sub, workspace.id, {
    workspace,
    userTypeHint: session.userType,
  });

  if (!decision.allowed) {
    return { status: "forbidden", session };
  }

  return {
    status: "ok",
    session,
    workspace,
    needsRebind: sessionNeedsWorkspaceRebind(session, workspace),
  };
}

export function customerHostLoginRedirect(
  workspaceOrigin: string,
): NextResponse {
  const loginUrl = new URL(`${CENTRAL_SITE_URL}/login`);
  loginUrl.searchParams.set("return_to", workspaceOrigin);
  return NextResponse.redirect(loginUrl, 307);
}

/**
 * Apply host-authoritative rebind on an outgoing middleware response when needed.
 */
export async function applyCustomerHostRebindIfNeeded(options: {
  request: NextRequest;
  response: NextResponse;
  gate: Extract<CustomerHostSessionGate, { status: "ok" }>;
}): Promise<NextResponse> {
  const { request, response, gate } = options;
  if (!gate.needsRebind) {
    return response;
  }

  const host = getRequestHost(request);
  await rebindSessionToWorkspace({
    session: gate.session,
    workspace: gate.workspace,
    host,
    response,
    request,
  });
  return response;
}

export function readCustomerHostSlugFromRequest(request: NextRequest): string | null {
  return parseClientPlatformSubdomainSafe(getRequestHost(request));
}
