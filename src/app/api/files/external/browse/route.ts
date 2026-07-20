import { NextRequest, NextResponse } from "next/server";

import { filesApiErrorStatus, requireInternalFilesAccess } from "@/lib/files-api-auth";
import { browseExternalFilesFromDb } from "@/lib/external-files-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireInternalFilesAccess();
  if ("error" in auth) return auth.error;

  try {
    const folderId = request.nextUrl.searchParams.get("folderId");
    const query = request.nextUrl.searchParams.get("q") ?? undefined;
    const result = await browseExternalFilesFromDb(
      {
        folderId: folderId || null,
        query,
      },
      { workspaceId: auth.workspace.id },
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to browse external files";
    return NextResponse.json(
      { error: message, entries: [], breadcrumb: [] },
      { status: filesApiErrorStatus(message, error) },
    );
  }
}
