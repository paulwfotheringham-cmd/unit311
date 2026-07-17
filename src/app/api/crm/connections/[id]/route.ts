import { NextRequest, NextResponse } from "next/server";

import {
  deleteConnectionWithSource,
  updateConnectionWithSource,
} from "@/lib/crm-connections-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      role?: string;
      specialties?: string;
      background?: string;
      countryExperience?: string;
      city?: string;
      country?: string;
    };

    const { connection, source } = await updateConnectionWithSource(id, body, {
      workspaceId: workspace.id,
    });
    return NextResponse.json({ connection, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update connection";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const { source } = await deleteConnectionWithSource(id, { workspaceId: workspace.id });
    return NextResponse.json({ ok: true, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete connection";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
