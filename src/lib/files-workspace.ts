import { requireCurrentWorkspace } from "@/lib/workspace-context";

export type FilesWorkspaceScope = {
  /** Explicit override for system/provisioning callers. Prefer omit to use session context. */
  workspaceId?: string | null;
};

/**
 * Resolve the tenant key for File Explorer module operations.
 * Uses requireCurrentWorkspace() unless an explicit workspaceId is provided.
 */
export async function resolveFilesWorkspaceId(scope?: FilesWorkspaceScope): Promise<string> {
  const explicit = scope?.workspaceId?.trim();
  if (explicit) return explicit;
  const workspace = await requireCurrentWorkspace();
  return workspace.id;
}
