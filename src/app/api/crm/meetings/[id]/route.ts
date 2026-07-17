import { NextRequest, NextResponse } from "next/server";

import { EXECUTIVE_MEETING_STATUSES } from "@/lib/founder-booking/meeting-slug";
import {
  deleteFounderSessionBooking,
  updateFounderSessionMeetingStatus,
} from "@/lib/founder-booking/service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status?: string };
    const status = body.status?.trim();

    if (!status || !EXECUTIVE_MEETING_STATUSES.includes(status as (typeof EXECUTIVE_MEETING_STATUSES)[number])) {
      return NextResponse.json({ error: "A valid meeting status is required." }, { status: 400 });
    }

    const booking = await updateFounderSessionMeetingStatus(
      id,
      status as (typeof EXECUTIVE_MEETING_STATUSES)[number],
    );
    return NextResponse.json({ booking });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update meeting";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    await deleteFounderSessionBooking(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete meeting";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
