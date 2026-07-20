import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { DEMO_WORKSPACE_SLUG } from "@/lib/app-domains";
import {
  INTERNAL_WORKSPACE_SLUG,
  findWorkspaceById,
  type WorkspaceHostRecord,
} from "@/lib/workspace-host";
import { demoWorkspaceSlug } from "@/lib/runtime-surface";

/**
 * Shared workspace authorization (RC1-C07).
 *
 * Separation of concerns:
 * - Identity: proved by the signed session (who the user is)
 * - Membership: this module (which workspaces they may access)
 * - Active workspace: derived from the request host after authorization
 *
 * Middleware, login, workspace-context, and APIs must all call this helper.
 * Do not duplicate membership checks elsewhere.
 */

export type WorkspaceAuthorizationDecision = {
  allowed: boolean;
  reason:
    | "primary_workspace"
    | "workspace_membership"
    | "internal_unit311"
    | "internal_demo"
    | "user_not_found"
    | "user_inactive"
    | "workspace_missing"
    | "not_a_member"
    | "supabase_unavailable"
    | "error";
  userType?: "internal" | "external";
};

export type AuthorizeWorkspaceAccessInput = {
  userId: string;
  workspaceId: string;
  /** Optional preloaded workspace row to avoid a duplicate lookup. */
  workspace?: Pick<WorkspaceHostRecord, "id" | "slug"> | null;
  /** Optional session userType hint; DB remains authoritative when available. */
  userTypeHint?: "internal" | "external" | null;
};

/**
 * Single shared authorization entry point.
 * Prefer authorizeUserForWorkspace(userId, workspaceId) for call sites.
 */
export async function authorizeWorkspaceAccess(
  input: AuthorizeWorkspaceAccessInput,
): Promise<WorkspaceAuthorizationDecision> {
  const userId = input.userId?.trim();
  const workspaceId = input.workspaceId?.trim();

  if (!userId || !workspaceId) {
    return { allowed: false, reason: "workspace_missing" };
  }

  if (!isSupabaseConfigured()) {
    return { allowed: false, reason: "supabase_unavailable" };
  }

  try {
    const supabase = createSupabaseServerClient();

    const workspace =
      input.workspace && input.workspace.id === workspaceId
        ? input.workspace
        : await findWorkspaceById(workspaceId);

    if (!workspace) {
      return { allowed: false, reason: "workspace_missing" };
    }

    const { data: user, error: userError } = await supabase
      .from("platform_users")
      .select("id, user_type, workspace_id, is_active")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      return { allowed: false, reason: "error" };
    }

    if (!user) {
      return { allowed: false, reason: "user_not_found" };
    }

    if (user.is_active === false) {
      return { allowed: false, reason: "user_inactive" };
    }

    const userType =
      user.user_type === "internal" || user.user_type === "external"
        ? user.user_type
        : input.userTypeHint === "internal" || input.userTypeHint === "external"
          ? input.userTypeHint
          : undefined;

    const primaryWorkspaceId =
      typeof user.workspace_id === "string" ? user.workspace_id.trim() : "";
    if (primaryWorkspaceId && primaryWorkspaceId === workspaceId) {
      return { allowed: true, reason: "primary_workspace", userType };
    }

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_users")
      .select("id")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (membershipError) {
      return { allowed: false, reason: "error", userType };
    }

    if (membership) {
      return { allowed: true, reason: "workspace_membership", userType };
    }

    // Internal operators may access the canonical Internal workspace and the Demo workspace.
    // Customer hosts still require explicit membership (no universal cross-tenant access).
    if (userType === "internal") {
      const slug = workspace.slug.trim().toLowerCase();
      if (slug === INTERNAL_WORKSPACE_SLUG) {
        return { allowed: true, reason: "internal_unit311", userType };
      }
      if (slug === demoWorkspaceSlug() || slug === DEMO_WORKSPACE_SLUG) {
        return { allowed: true, reason: "internal_demo", userType };
      }
    }

    return { allowed: false, reason: "not_a_member", userType };
  } catch {
    return { allowed: false, reason: "error" };
  }
}

/** Convenience wrapper — all call sites should use this or authorizeWorkspaceAccess. */
export async function authorizeUserForWorkspace(
  userId: string,
  workspaceId: string,
  options?: Omit<AuthorizeWorkspaceAccessInput, "userId" | "workspaceId">,
): Promise<WorkspaceAuthorizationDecision> {
  return authorizeWorkspaceAccess({
    userId,
    workspaceId,
    ...options,
  });
}
