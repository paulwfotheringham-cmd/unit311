import { NextRequest, NextResponse } from "next/server";

import { generateAndSendCrmClientReportPdf } from "@/lib/crm-client-report-service";
import { getLeadById } from "@/lib/crm-leads-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;

    const existingLead = await getLeadById(id, { workspaceId: workspace.id });
    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    // generateAndSendCrmClientReportPdf resolves workspace via session context
    const result = await generateAndSendCrmClientReportPdf(id);
    const lead = await getLeadById(id, { workspaceId: workspace.id });

    return NextResponse.json({ ...result, lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate client report";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
