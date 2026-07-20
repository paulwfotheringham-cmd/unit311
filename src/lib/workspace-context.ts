import { cache } from "react";
import { headers } from "next/headers";

import {
  getRequestHost,
  isDemoDomainHost,
  isInternalDomainHost,
  parseClientPlatformSubdomainSafe,
} from "@/lib/app-domains";
import { getPlatformSession, type PlatformSession } from "@/lib/platform-session";
import { demoWorkspaceSlug } from "@/lib/runtime-surface";
import { authorizeUserForWorkspace } from "@/lib/workspace-authorization";
import {
  INTERNAL_WORKSPACE_SLUG,
  findWorkspaceById,
  findWorkspaceBySlug,
  type WorkspaceHostRecord,
} from "@/lib/workspace-host";

export { INTERNAL_WORKSPACE_SLUG };

/**
 * Runtime workspace tenancy context (RC1-C07).
 *
 * Separation:
 * - Identity: signed session (who the user is)
 * - Membership: authorizeUserForWorkspace (shared authz service)
 * - Active workspace: derived from the request host after authorization
 *
 * On customer subdomains the host is the tenant boundary.
 * Session workspace fields are a claim cache, not tenancy authority.
 */
export type CurrentWorkspace = {
  id: string;
  slug: string;
  name: string;
};

export type WorkspaceContextSource =
  | "host_slug"
  | "internal_default"
  | "demo_default"
  | "session_claim"
  | "none";

export type WorkspaceContextDiagnostics = {
  host: string | null;
  sessionUser: {
    id: string;
    username: string;
    displayName: string;
    userType: string;
  } | null;
  /** Last workspace claim embedded in the session cookie (not tenancy authority). */
  sessionWorkspace: CurrentWorkspace | null;
  /** Host-derived active workspace after authorization. */
  resolvedWorkspace: CurrentWorkspace | null;
  source: WorkspaceContextSource;
  authenticated: boolean;
  authorized: boolean;
};

export class WorkspaceAccessError extends Error {
  readonly status: 401 | 403;

  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = "WorkspaceAccessError";
    this.status = status;
  }
}

function toCurrentWorkspace(record: WorkspaceHostRecord): CurrentWorkspace {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
  };
}

function sessionWorkspaceClaim(session: PlatformSession | null): CurrentWorkspace | null {
  if (!session?.workspaceId || !session.workspaceSlug || !session.workspaceName) {
    return null;
  }
  return {
    id: session.workspaceId,
    slug: session.workspaceSlug,
    name: session.workspaceName,
  };
}

/**
 * Resolve a workspace record for login / session creation.
 * Does not authorize — callers must use authorizeUserForWorkspace.
 */
export async function resolveWorkspaceBinding(options?: {
  workspaceSlug?: string | null;
  userWorkspaceId?: string | null;
  fallbackInternal?: boolean;
}): Promise<CurrentWorkspace | null> {
  const slug = options?.workspaceSlug?.trim().toLowerCase() || null;
  if (slug) {
    const bySlug = await findWorkspaceBySlug(slug);
    if (bySlug) return toCurrentWorkspace(bySlug);
  }

  const userWorkspaceId = options?.userWorkspaceId?.trim() || null;
  if (userWorkspaceId) {
    const byId = await findWorkspaceById(userWorkspaceId);
    if (byId) return toCurrentWorkspace(byId);
  }

  if (options?.fallbackInternal !== false) {
    const internal = await findWorkspaceBySlug(INTERNAL_WORKSPACE_SLUG);
    if (internal) return toCurrentWorkspace(internal);
  }

  return null;
}

/**
 * Attach workspace fields onto a platform session (login / re-bind).
 * These fields are an active-workspace claim cache, not membership proof.
 */
export function withSessionWorkspace(
  session: PlatformSession,
  workspace: CurrentWorkspace | null,
): PlatformSession {
  if (!workspace) {
    return {
      sub: session.sub,
      username: session.username,
      displayName: session.displayName,
      userType: session.userType,
      redirectPath: session.redirectPath,
      exp: session.exp,
    };
  }
  return {
    ...session,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    workspaceName: workspace.name,
  };
}

async function authorizeActiveWorkspace(
  session: PlatformSession,
  workspace: CurrentWorkspace,
): Promise<boolean> {
  const decision = await authorizeUserForWorkspace(session.sub, workspace.id, {
    workspace,
    userTypeHint: session.userType,
  });
  return decision.allowed;
}

/**
 * ONLY supported way for modules/APIs to read the active workspace.
 * Request-scoped (React cache) so lookups happen at most once per request.
 *
 * Customer host: host workspace after identity + membership authorization.
 * Internal host: unit311 after authorization.
 * Demo host: demo workspace after authorization (same Internal Ops UI).
 * Apex / other: session claim only if the user is authorised for that workspace.
 */
export const getCurrentWorkspace = cache(async (): Promise<CurrentWorkspace | null> => {
  const snapshot = await getWorkspaceContextDiagnostics();
  return snapshot.resolvedWorkspace;
});

export async function requireCurrentWorkspace(): Promise<CurrentWorkspace> {
  const snapshot = await getWorkspaceContextDiagnostics();
  if (!snapshot.authenticated) {
    throw new WorkspaceAccessError("Authentication required.", 401);
  }
  if (!snapshot.resolvedWorkspace) {
    throw new WorkspaceAccessError(
      snapshot.sessionUser ? "Workspace access denied." : "Workspace context is required.",
      snapshot.sessionUser ? 403 : 401,
    );
  }
  return snapshot.resolvedWorkspace;
}

/**
 * Full diagnostics snapshot for tenancy verification.
 * Does not mutate the session cookie (rebind happens in middleware / login).
 */
export const getWorkspaceContextDiagnostics = cache(
  async (): Promise<WorkspaceContextDiagnostics> => {
    const requestHeaders = await headers();
    const host = getRequestHost({ headers: requestHeaders });
    const session = await getPlatformSession();
    const fromSession = sessionWorkspaceClaim(session);

    const sessionUser = session
      ? {
          id: session.sub,
          username: session.username,
          displayName: session.displayName,
          userType: session.userType,
        }
      : null;

    if (!session) {
      return {
        host,
        sessionUser: null,
        sessionWorkspace: null,
        resolvedWorkspace: null,
        source: "none",
        authenticated: false,
        authorized: false,
      };
    }

    const customerSlug = parseClientPlatformSubdomainSafe(host);
    if (customerSlug) {
      const record = await findWorkspaceBySlug(customerSlug);
      if (!record) {
        return {
          host,
          sessionUser,
          sessionWorkspace: fromSession,
          resolvedWorkspace: null,
          source: "none",
          authenticated: true,
          authorized: false,
        };
      }

      const workspace = toCurrentWorkspace(record);
      const allowed = await authorizeActiveWorkspace(session, workspace);
      return {
        host,
        sessionUser,
        sessionWorkspace: fromSession,
        resolvedWorkspace: allowed ? workspace : null,
        source: allowed ? "host_slug" : "none",
        authenticated: true,
        authorized: allowed,
      };
    }

    if (isDemoDomainHost(host)) {
      const demo = await findWorkspaceBySlug(demoWorkspaceSlug());
      if (!demo) {
        return {
          host,
          sessionUser,
          sessionWorkspace: fromSession,
          resolvedWorkspace: null,
          source: "none",
          authenticated: true,
          authorized: false,
        };
      }

      const workspace = toCurrentWorkspace(demo);
      const allowed = await authorizeActiveWorkspace(session, workspace);
      return {
        host,
        sessionUser,
        sessionWorkspace: fromSession,
        resolvedWorkspace: allowed ? workspace : null,
        source: allowed ? "demo_default" : "none",
        authenticated: true,
        authorized: allowed,
      };
    }

    if (isInternalDomainHost(host)) {
      const internal = await findWorkspaceBySlug(INTERNAL_WORKSPACE_SLUG);
      if (!internal) {
        return {
          host,
          sessionUser,
          sessionWorkspace: fromSession,
          resolvedWorkspace: null,
          source: "none",
          authenticated: true,
          authorized: false,
        };
      }

      const workspace = toCurrentWorkspace(internal);
      const allowed = await authorizeActiveWorkspace(session, workspace);
      return {
        host,
        sessionUser,
        sessionWorkspace: fromSession,
        resolvedWorkspace: allowed ? workspace : null,
        source: allowed ? "internal_default" : "none",
        authenticated: true,
        authorized: allowed,
      };
    }

    // Apex / non-tenant hosts: no host tenant boundary.
    // Active workspace may follow the session claim when membership allows it.
    if (fromSession) {
      const allowed = await authorizeActiveWorkspace(session, fromSession);
      return {
        host,
        sessionUser,
        sessionWorkspace: fromSession,
        resolvedWorkspace: allowed ? fromSession : null,
        source: allowed ? "session_claim" : "none",
        authenticated: true,
        authorized: allowed,
      };
    }

    return {
      host,
      sessionUser,
      sessionWorkspace: null,
      resolvedWorkspace: null,
      source: "none",
      authenticated: true,
      authorized: false,
    };
  },
);
