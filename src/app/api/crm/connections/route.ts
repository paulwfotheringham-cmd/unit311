import { NextRequest, NextResponse } from "next/server";

import {
  createConnectionWithSource,
  listConnectionsWithSource,
} from "@/lib/crm-connections-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { connections, source } = await listConnectionsWithSource({
      workspaceId: workspace.id,
    });
    return NextResponse.json({ connections, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load connections";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const body = (await request.json()) as {
      name?: string;
      role?: string;
      specialties?: string;
      background?: string;
      countryExperience?: string;
      city?: string;
      country?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { connection, source } = await createConnectionWithSource(
      {
        name: body.name,
        role: body.role,
        specialties: body.specialties,
        background: body.background,
        countryExperience: body.countryExperience,
        city: body.city,
        country: body.country,
      },
      { workspaceId: workspace.id },
    );

    return NextResponse.json({ connection, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create connection";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
