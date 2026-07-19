import type { NextRequest, NextResponse } from "next/server";

import {
  createPlatformSessionToken,
  type PlatformSession,
} from "@/lib/platform-auth";
import { applyPlatformSessionCookie } from "@/lib/platform-session-cookie";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type RebindWorkspace = {
  id: string;
  slug: string;
  name: string;
};

export type HostRebindAuditInput = {
  userId: string;
  previousWorkspace: { id: string; slug: string } | null;
  newWorkspace: { id: string; slug: string };
  host: string | null;
  reason: "host_rebind";
};

function withSessionWorkspace(
  session: PlatformSession,
  workspace: RebindWorkspace,
): PlatformSession {
  return {
    ...session,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    workspaceName: workspace.name,
  };
}

/**
 * Non-blocking audit for automatic host-driven session rebinds.
 * Must never throw or affect request behaviour.
 */
export async function recordHostRebindAudit(input: HostRebindAuditInput): Promise<void> {
  const timestamp = new Date().toISOString();
  const description = JSON.stringify({
    userId: input.userId,
    previousWorkspace: input.previousWorkspace,
    newWorkspace: input.newWorkspace,
    host: input.host,
    timestamp,
    reason: input.reason,
  });

  if (!isSupabaseConfigured()) {
    console.info("[workspace-host-rebind]", description);
    return;
  }

  try {
    const supabase = createSupabaseServerClient();
    const previousId = input.previousWorkspace?.id?.trim() || null;
    await supabase.from("workspace_audit_log").insert({
      workspace_id: input.newWorkspace.id,
      event_type: "host_rebind",
      entity_type: "session",
      entity_id: previousId,
      description,
      performed_by: input.userId,
    });
  } catch (error) {
    console.info("[workspace-host-rebind]", description, error);
  }
}

export function sessionNeedsWorkspaceRebind(
  session: PlatformSession,
  workspace: RebindWorkspace,
): boolean {
  return (
    session.workspaceId !== workspace.id ||
    session.workspaceSlug !== workspace.slug ||
    session.workspaceName !== workspace.name
  );
}

/**
 * Re-issue the signed session cookie for the host-derived active workspace.
 * Records a host_rebind audit event when the claim actually changes.
 */
export async function rebindSessionToWorkspace(options: {
  session: PlatformSession;
  workspace: RebindWorkspace;
  host: string | null;
  response: NextResponse;
  request?: NextRequest | Request;
}): Promise<PlatformSession> {
  const { session, workspace, host, response, request } = options;
  const previousWorkspace =
    session.workspaceId && session.workspaceSlug
      ? { id: session.workspaceId, slug: session.workspaceSlug }
      : null;

  const needsRebind = sessionNeedsWorkspaceRebind(session, workspace);
  const nextSession = withSessionWorkspace(session, workspace);
  applyPlatformSessionCookie(response, createPlatformSessionToken(nextSession), request);

  if (needsRebind) {
    void recordHostRebindAudit({
      userId: session.sub,
      previousWorkspace,
      newWorkspace: { id: workspace.id, slug: workspace.slug },
      host,
      reason: "host_rebind",
    });
  }

  return nextSession;
}
