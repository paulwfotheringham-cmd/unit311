import { NextRequest, NextResponse } from "next/server";

import type { CompanyDetailsFields } from "@/lib/company-details-data";
import {
  COMPANY_DETAILS_MIGRATION_REQUIRED,
  getCompanyDetails,
  upsertCompanyDetails,
} from "@/lib/company-details-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  requireCurrentWorkspace,
  WorkspaceAccessError,
} from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

function errorStatus(error: unknown): number {
  if (error instanceof WorkspaceAccessError) return error.status;
  const message = error instanceof Error ? error.message : "";
  if (message === COMPANY_DETAILS_MIGRATION_REQUIRED) return 503;
  if (message.includes("Authentication required")) return 401;
  if (
    message.includes("required") ||
    message.includes("valid") ||
    message.includes("Invalid")
  ) {
    return 400;
  }
  return 500;
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const details = await getCompanyDetails({ workspaceId: workspace.id });
    return NextResponse.json({
      details,
      workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load company details";
    return NextResponse.json({ error: message }, { status: errorStatus(error) });
  }
}

export async function PUT(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const body = (await request.json()) as Partial<CompanyDetailsFields>;
    const details = await upsertCompanyDetails(body, { workspaceId: workspace.id });
    return NextResponse.json({
      details,
      workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save company details";
    return NextResponse.json({ error: message }, { status: errorStatus(error) });
  }
}
