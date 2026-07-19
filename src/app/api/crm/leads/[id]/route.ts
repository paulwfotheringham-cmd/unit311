import { NextRequest, NextResponse } from "next/server";

import type { LeadStatus } from "@/lib/crm-data";
import { deleteLead, updateLead } from "@/lib/crm-leads-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json()) as {
      companyName?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      status?: LeadStatus;
      source?: string;
      nextAction?: string;
      nextActionDate?: string | null;
      estimatedValue?: number | null;
      notes?: string;
      discoveryNotes?: string;
    };

    const lead = await updateLead(id, body, { workspaceId: workspace.id });
    return NextResponse.json({ lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update lead";
    const status =
      message.includes("Authentication required") ||
      message.includes("Workspace context") ||
      message.includes("Lead not found")
        ? message.includes("Lead not found")
          ? 404
          : 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    await deleteLead(id, { workspaceId: workspace.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete lead";
    const status =
      message.includes("Authentication required") ||
      message.includes("Workspace context") ||
      message.includes("Lead not found")
        ? message.includes("Lead not found")
          ? 404
          : 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
