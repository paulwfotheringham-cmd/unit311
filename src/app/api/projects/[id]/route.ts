import { NextRequest, NextResponse } from "next/server";

import { deleteProject } from "@/lib/internal-projects-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    await deleteProject(id, { workspaceId: workspace.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete project";
    const status =
      message.includes("Authentication required") ||
      message.includes("Workspace context") ||
      message.includes("Project not found")
        ? message.includes("Project not found")
          ? 404
          : 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
