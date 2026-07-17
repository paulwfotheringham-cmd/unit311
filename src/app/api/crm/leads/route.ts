import { NextRequest, NextResponse } from "next/server";

import type { LeadStatus } from "@/lib/crm-data";
import { createLead, listLeads } from "@/lib/crm-leads-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const status = request.nextUrl.searchParams.get("status") as LeadStatus | "All" | null;
    const leads = await listLeads(status ?? "All", { workspaceId: workspace.id });
    return NextResponse.json({
      leads,
      workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load leads";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
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
    };

    if (!body.companyName?.trim() || !body.contactName?.trim()) {
      return NextResponse.json(
        { error: "Company name and contact name are required" },
        { status: 400 },
      );
    }

    const lead = await createLead(
      body as { companyName: string; contactName: string },
      { workspaceId: workspace.id },
    );
    return NextResponse.json({ lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create lead";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
