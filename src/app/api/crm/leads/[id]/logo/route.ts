import { NextRequest, NextResponse } from "next/server";

import { uploadCrmLeadCompanyLogo } from "@/lib/crm-company-logo-service";
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

    const existingLead = await getLeadById(id, { workspaceId: workspace.id });
    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Logo file is required." }, { status: 400 });
    }

    // uploadCrmLeadCompanyLogo resolves workspace via session context
    const result = await uploadCrmLeadCompanyLogo(id, file);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload company logo";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : message.includes("Lead not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
