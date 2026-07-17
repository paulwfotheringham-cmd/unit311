import { NextResponse } from "next/server";

import { getWorkspaceContextDiagnostics } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

/**
 * Phase 1 workspace tenancy diagnostics.
 * Confirms runtime Workspace Context before any module filtering.
 */
export async function GET() {
  const diagnostics = await getWorkspaceContextDiagnostics();

  return NextResponse.json(
    {
      phase: "workspace-isolation-phase-1",
      host: diagnostics.host,
      authenticated: diagnostics.authenticated,
      authenticatedUser: diagnostics.sessionUser,
      sessionWorkspace: diagnostics.sessionWorkspace,
      resolvedWorkspace: diagnostics.resolvedWorkspace
        ? {
            id: diagnostics.resolvedWorkspace.id,
            slug: diagnostics.resolvedWorkspace.slug,
            name: diagnostics.resolvedWorkspace.name,
          }
        : null,
      source: diagnostics.source,
      currentWorkspace: diagnostics.resolvedWorkspace
        ? {
            id: diagnostics.resolvedWorkspace.id,
            slug: diagnostics.resolvedWorkspace.slug,
            name: diagnostics.resolvedWorkspace.name,
          }
        : null,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
