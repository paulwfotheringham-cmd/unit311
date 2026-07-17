import { NextRequest, NextResponse } from "next/server";

import { ensureCrmClientReportSchema } from "@/lib/crm-client-report-schema";
import { generateCrmClientReportPptxDraft } from "@/lib/crm-client-report-service";
import {
  getDiscoveryQuestionnaire,
  saveDiscoveryQuestionnaire,
} from "@/lib/crm-discovery-questions-service";
import type { DiscoveryQuestionnaireData } from "@/lib/discovery-questions-data";
import { getLeadById } from "@/lib/crm-leads-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
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

    const questionnaire = await getDiscoveryQuestionnaire(id);
    if (!questionnaire) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    return NextResponse.json({ questionnaire });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load discovery questions";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json()) as { questionnaire?: DiscoveryQuestionnaireData };

    if (!body.questionnaire) {
      return NextResponse.json({ error: "Missing questionnaire payload." }, { status: 400 });
    }

    const existingLead = await getLeadById(id, { workspaceId: workspace.id });
    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const questionnaire = await saveDiscoveryQuestionnaire(id, body.questionnaire);
    await ensureCrmClientReportSchema().catch(() => false);

    let report = null;
    let reportWarning: string | null = null;
    try {
      // generateCrmClientReportPptxDraft resolves workspace via session context
      report = await generateCrmClientReportPptxDraft(id);
    } catch (reportError) {
      reportWarning =
        reportError instanceof Error
          ? reportError.message
          : "Discovery questions saved, but PowerPoint generation failed.";
    }

    const lead = await getLeadById(id, { workspaceId: workspace.id });

    return NextResponse.json({ questionnaire, report, reportWarning, lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save discovery questions";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : message === "Lead not found."
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
