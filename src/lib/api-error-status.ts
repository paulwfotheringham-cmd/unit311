import { WorkspaceAccessError } from "@/lib/workspace-context";

/** Map thrown API errors to an HTTP status without masking the message. */
export function apiErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof WorkspaceAccessError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Authentication required")) return 401;
  if (message.includes("Workspace context") || message.includes("Workspace access denied")) {
    return message.includes("Workspace access denied") ? 403 : 401;
  }
  if (message.includes("Client not found") || message.includes("not found")) return 404;
  return fallback;
}
