import { NextRequest, NextResponse } from "next/server";

import {
  createFounderSessionBooking,
  listAvailableFounderSlots,
} from "@/lib/founder-booking/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const dateKey = request.nextUrl.searchParams.get("date") ?? undefined;
    const result = await listAvailableFounderSlots(dateKey ?? undefined);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load booking slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      organization?: string;
      role?: string;
      email?: string;
      startsAt?: string;
      clientTimezone?: string;
    };

    if (
      !body.name?.trim() ||
      !body.organization?.trim() ||
      !body.role?.trim() ||
      !body.email?.trim() ||
      !body.startsAt
    ) {
      return NextResponse.json(
        { error: "Name, role, organisation, email, and time slot are required." },
        { status: 400 },
      );
    }

    const result = await createFounderSessionBooking({
      name: body.name,
      organization: body.organization,
      role: body.role,
      email: body.email,
      startsAt: body.startsAt,
      clientTimezone: body.clientTimezone,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create booking";
    const status = message.includes("no longer available") || message.includes("just booked") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
