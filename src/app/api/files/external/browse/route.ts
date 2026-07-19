import { NextRequest, NextResponse } from "next/server";

import { browseExternalFilesFromDb } from "@/lib/external-files-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const folderId = request.nextUrl.searchParams.get("folderId");
    const query = request.nextUrl.searchParams.get("q") ?? undefined;
    const result = await browseExternalFilesFromDb(
      {
        folderId: folderId || null,
        query,
      },
      { workspaceId: workspace.id },
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to browse external files";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message, entries: [], breadcrumb: [] }, { status });
  }
}
