import { NextResponse } from "next/server";

import { promoteCrmLeadToClient } from "@/lib/crm-lead-client-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const client = await promoteCrmLeadToClient(id, { workspaceId: workspace.id });
    return NextResponse.json({ client });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to move lead to client directory";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : message.includes("Lead not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
