import { NextRequest, NextResponse } from "next/server";

import { commitCrmLeadDiscovery } from "@/lib/crm-discovery-commit-service";
import { getLeadById } from "@/lib/crm-leads-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { discoveryNotes?: string };

    const existingLead = await getLeadById(id, { workspaceId: workspace.id });
    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    // commitCrmLeadDiscovery resolves workspace via session context
    const result = await commitCrmLeadDiscovery(
      id,
      body.discoveryNotes !== undefined ? body.discoveryNotes : undefined,
    );

    const lead = await getLeadById(id, { workspaceId: workspace.id });

    return NextResponse.json({ ...result, lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to commit discovery";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
