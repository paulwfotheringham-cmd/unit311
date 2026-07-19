import { requireCurrentWorkspace } from "@/lib/workspace-context";

export type HrWorkspaceScope = {
  /** Explicit override for system/provisioning callers. Prefer omit to use session context. */
  workspaceId?: string | null;
};

/**
 * Resolve the tenant key for Human Resources module operations.
 * Uses requireCurrentWorkspace() unless an explicit workspaceId is provided.
 */
export async function resolveHrWorkspaceId(scope?: HrWorkspaceScope): Promise<string> {
  const explicit = scope?.workspaceId?.trim();
  if (explicit) return explicit;
  const workspace = await requireCurrentWorkspace();
  return workspace.id;
}
