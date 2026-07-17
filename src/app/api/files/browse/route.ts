import { NextRequest, NextResponse } from "next/server";

import { browseFolder } from "@/lib/internal-files-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY." },
      { status: 503 },
    );
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const folderId = request.nextUrl.searchParams.get("folderId");
    const query = request.nextUrl.searchParams.get("q") ?? undefined;
    const categoryId = request.nextUrl.searchParams.get("categoryId");

    const result = await browseFolder(
      {
        folderId: folderId || null,
        query,
        categoryId: categoryId || null,
      },
      { workspaceId: workspace.id },
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to browse files";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
