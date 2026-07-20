import { NextResponse } from "next/server";

import { getInternalOperatorByUsername } from "@/lib/internal-operators-service";
import { getPlatformSession, type PlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { normalizeUserRole } from "@/lib/user-management-data";
import {
  WorkspaceAccessError,
  requireCurrentWorkspace,
  type CurrentWorkspace,
} from "@/lib/workspace-context";

const AUTH_REQUIRED = "Authentication required.";
const INSUFFICIENT_PRIVILEGES = "Insufficient privileges.";
const WORKSPACE_ACCESS_DENIED = "Workspace access denied.";

/**
 * Authenticated internal user with operator role Admin.
 * 401 = no session; 403 = wrong user type or non-Admin role.
 */
export async function requireInternalAdministratorSession(): Promise<
  { error: NextResponse } | { session: PlatformSession }
> {
  const session = await getPlatformSession();
  if (!session) {
    return { error: NextResponse.json({ error: AUTH_REQUIRED }, { status: 401 }) };
  }

  if (session.userType !== "internal") {
    return {
      error: NextResponse.json({ error: INSUFFICIENT_PRIVILEGES }, { status: 403 }),
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }),
    };
  }

  try {
    const operator = await getInternalOperatorByUsername(session.username);
    if (!operator || normalizeUserRole(operator.role) !== "Admin") {
      return {
        error: NextResponse.json({ error: INSUFFICIENT_PRIVILEGES }, { status: 403 }),
      };
    }
  } catch {
    return {
      error: NextResponse.json({ error: INSUFFICIENT_PRIVILEGES }, { status: 403 }),
    };
  }

  return { session };
}

/**
 * Authenticated internal user with an active workspace context.
 * Used by internal module APIs (e.g. Unit311 Details) that are not Admin-only.
 * 401 = no session / no workspace; 403 = external user.
 */
export async function requireInternalWorkspaceSession(): Promise<
  { error: NextResponse } | { session: PlatformSession; workspace: CurrentWorkspace }
> {
  const session = await getPlatformSession();
  if (!session) {
    return { error: NextResponse.json({ error: AUTH_REQUIRED }, { status: 401 }) };
  }

  if (session.userType !== "internal") {
    return {
      error: NextResponse.json({ error: INSUFFICIENT_PRIVILEGES }, { status: 403 }),
    };
  }

  try {
    const workspace = await requireCurrentWorkspace();
    return { session, workspace };
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return {
        error: NextResponse.json(
          { error: error.message || WORKSPACE_ACCESS_DENIED },
          { status: error.status },
        ),
      };
    }
    const message = error instanceof Error ? error.message : AUTH_REQUIRED;
    return { error: NextResponse.json({ error: message }, { status: 401 }) };
  }
}

/**
 * Admin operator on an authorised internal workspace host.
 * Does not change the global operators catalogue — only gates API access.
 */
export async function requireInternalAdministratorWorkspaceSession(): Promise<
  { error: NextResponse } | { session: PlatformSession; workspace: CurrentWorkspace }
> {
  const workspaceAuth = await requireInternalWorkspaceSession();
  if ("error" in workspaceAuth) return workspaceAuth;

  const adminAuth = await requireInternalAdministratorSession();
  if ("error" in adminAuth) return adminAuth;

  return { session: adminAuth.session, workspace: workspaceAuth.workspace };
}
