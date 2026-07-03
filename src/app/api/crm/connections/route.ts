import { NextRequest, NextResponse } from "next/server";

import {
  createConnectionWithSource,
  listConnectionsWithSource,
} from "@/lib/crm-connections-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { connections, source } = await listConnectionsWithSource();
    return NextResponse.json({ connections, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load connections";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const { connection, source } = await createConnectionWithSource({
      name: body.name,
      role: body.role,
      specialties: body.specialties,
      background: body.background,
      countryExperience: body.countryExperience,
      city: body.city,
      country: body.country,
    });

    return NextResponse.json({ connection, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create connection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
