import { NextRequest, NextResponse } from "next/server";

import {
  deleteConnectionWithSource,
  updateConnectionWithSource,
} from "@/lib/crm-connections-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
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

    const { connection, source } = await updateConnectionWithSource(id, body);
    return NextResponse.json({ connection, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update connection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { source } = await deleteConnectionWithSource(id);
    return NextResponse.json({ ok: true, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete connection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
