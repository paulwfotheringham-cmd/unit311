import { NextResponse } from "next/server";

import { ClientFilesError } from "@/lib/client-files-root";
import { requireInternalWorkspaceSession } from "@/lib/internal-admin-auth";
import type { CurrentWorkspace } from "@/lib/workspace-context";
import type { PlatformSession } from "@/lib/platform-session";

/**
 * Internal operators only for File Explorer (MOD-101/103).
 * External Users must not access internal/client file APIs.
 */
export async function requireInternalFilesAccess(): Promise<
  { error: NextResponse } | { session: PlatformSession; workspace: CurrentWorkspace }
> {
  return requireInternalWorkspaceSession();
}

export function filesApiErrorStatus(message: string, error?: unknown): number {
  if (error instanceof ClientFilesError) return error.status;
  if (
    message.includes("Authentication required") ||
    message.includes("Workspace context") ||
    message.includes("Workspace access")
  ) {
    return 401;
  }
  if (
    message.includes("Insufficient privileges") ||
    message.includes("outside this client's") ||
    message.includes("Client root folder cannot")
  ) {
    return 403;
  }
  if (message.includes("not found") || message.includes("required") || message.includes("cannot")) {
    return 400;
  }
  return 500;
}
