import { NextRequest, NextResponse } from "next/server";

import type { ProjectPhase } from "@/lib/projects-data";
import { createProject, listProjects } from "@/lib/internal-projects-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const projects = await listProjects({ workspaceId: workspace.id });
    return NextResponse.json({
      projects,
      workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load projects";
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
      name?: string;
      clientId?: string;
      clientName?: string;
      site?: string;
      region?: string;
      operator?: string;
      phase?: ProjectPhase;
      startDate?: string | null;
      endDate?: string | null;
      notes?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }
    if (!body.clientName?.trim()) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }

    const project = await createProject(
      {
        name: body.name,
        clientId: body.clientId,
        clientName: body.clientName,
        site: body.site,
        region: body.region,
        operator: body.operator,
        phase: body.phase,
        startDate: body.startDate,
        endDate: body.endDate,
        notes: body.notes,
      },
      { workspaceId: workspace.id },
    );

    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
