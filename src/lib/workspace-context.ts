import { cache } from "react";
import { headers } from "next/headers";

import {
  getRequestHost,
  isInternalDomainHost,
  parseClientPlatformSubdomainSafe,
} from "@/lib/app-domains";
import { getPlatformSession, type PlatformSession } from "@/lib/platform-session";
import {
  findWorkspaceById,
  findWorkspaceBySlug,
  type WorkspaceHostRecord,
} from "@/lib/workspace-host";

/** Canonical Internal Unit311 Central workspace slug. */
export const INTERNAL_WORKSPACE_SLUG = "unit311";

/**
 * Runtime workspace tenancy context (Phase 1).
 * Modules must obtain workspace identity only through getCurrentWorkspace().
 */
export type CurrentWorkspace = {
  id: string;
  slug: string;
  name: string;
};

export type WorkspaceContextSource =
  | "session"
  | "host_slug"
  | "internal_default"
  | "none";

export type WorkspaceContextDiagnostics = {
  host: string | null;
  sessionUser: {
    id: string;
    username: string;
    displayName: string;
    userType: string;
  } | null;
  sessionWorkspace: CurrentWorkspace | null;
  resolvedWorkspace: CurrentWorkspace | null;
  source: WorkspaceContextSource;
  authenticated: boolean;
};

function toCurrentWorkspace(record: WorkspaceHostRecord): CurrentWorkspace {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
  };
}

function sessionWorkspace(session: PlatformSession | null): CurrentWorkspace | null {
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
 * Resolve a workspace binding for login / session creation.
 * Prefer explicit customer slug (return_to host), then the user's stored workspace_id,
 * then the Internal unit311 workspace when appropriate.
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

/**
 * ONLY supported way for modules/APIs to read the active workspace.
 * Request-scoped (React cache) so slug/DB lookup happens at most once per request.
 *
 * Resolution order for authenticated requests:
 * 1. Workspace embedded in the signed session (set at login)
 * 2. Host customer slug → workspaces row (legacy sessions / diagnostics)
 * 3. Internal host → unit311 workspace
 */
export const getCurrentWorkspace = cache(async (): Promise<CurrentWorkspace | null> => {
  const snapshot = await getWorkspaceContextDiagnostics();
  return snapshot.resolvedWorkspace;
});

export async function requireCurrentWorkspace(): Promise<CurrentWorkspace> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    throw new Error("Workspace context is required.");
  }
  return workspace;
}

/**
 * Full diagnostics snapshot for Phase 1 verification.
 * Does not mutate session or filter any module data.
 */
export const getWorkspaceContextDiagnostics = cache(
  async (): Promise<WorkspaceContextDiagnostics> => {
    const requestHeaders = await headers();
    const host = getRequestHost({ headers: requestHeaders });
    const session = await getPlatformSession();
    const fromSession = sessionWorkspace(session);

    const sessionUser = session
      ? {
          id: session.sub,
          username: session.username,
          displayName: session.displayName,
          userType: session.userType,
        }
      : null;

    if (fromSession) {
      return {
        host,
        sessionUser,
        sessionWorkspace: fromSession,
        resolvedWorkspace: fromSession,
        source: "session",
        authenticated: true,
      };
    }

    if (!session) {
      return {
        host,
        sessionUser: null,
        sessionWorkspace: null,
        resolvedWorkspace: null,
        source: "none",
        authenticated: false,
      };
    }

    // Authenticated but pre-Phase-1 session cookie: recover from host once.
    const customerSlug = parseClientPlatformSubdomainSafe(host);
    if (customerSlug) {
      const record = await findWorkspaceBySlug(customerSlug);
      if (record) {
        const workspace = toCurrentWorkspace(record);
        return {
          host,
          sessionUser,
          sessionWorkspace: null,
          resolvedWorkspace: workspace,
          source: "host_slug",
          authenticated: true,
        };
      }
    }

    if (isInternalDomainHost(host)) {
      const internal = await findWorkspaceBySlug(INTERNAL_WORKSPACE_SLUG);
      if (internal) {
        return {
          host,
          sessionUser,
          sessionWorkspace: null,
          resolvedWorkspace: toCurrentWorkspace(internal),
          source: "internal_default",
          authenticated: true,
        };
      }
    }

    return {
      host,
      sessionUser,
      sessionWorkspace: null,
      resolvedWorkspace: null,
      source: "none",
      authenticated: true,
    };
  },
);
