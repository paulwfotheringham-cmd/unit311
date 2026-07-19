import { requireCurrentWorkspace } from "@/lib/workspace-context";

export type CalendarWorkspaceScope = {
  /** Explicit override for system/provisioning callers. Prefer omit to use session context. */
  workspaceId?: string | null;
};

/**
 * Resolve the tenant key for Calendar module operations.
 * Uses requireCurrentWorkspace() unless an explicit workspaceId is provided.
 */
export async function resolveCalendarWorkspaceId(
  scope?: CalendarWorkspaceScope,
): Promise<string> {
  const explicit = scope?.workspaceId?.trim();
  if (explicit) return explicit;
  const workspace = await requireCurrentWorkspace();
  return workspace.id;
}
