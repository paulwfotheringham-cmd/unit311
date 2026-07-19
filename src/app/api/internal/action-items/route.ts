import { NextResponse } from "next/server";

import { listOpenActionItems } from "@/lib/internal-action-items-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured.", items: [] }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const items = await listOpenActionItems({ workspaceId: workspace.id });
    return NextResponse.json({
      items,
      workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load action items";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message, items: [] }, { status });
  }
}
