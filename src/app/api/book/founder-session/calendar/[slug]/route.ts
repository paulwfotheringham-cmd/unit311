import { NextRequest, NextResponse } from "next/server";

import {
  buildDiscoverySessionIcs,
  getDiscoverySessionEndsAt,
} from "@/lib/founder-booking/calendar";
import { getFounderSessionBookingBySlug } from "@/lib/founder-booking/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const booking = await getFounderSessionBookingBySlug(slug);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const endsAt = booking.endsAt ?? getDiscoverySessionEndsAt(booking.startsAt);
    const ics = buildDiscoverySessionIcs({
      startsAt: booking.startsAt,
      endsAt,
      videoLink: booking.videoLink,
      organization: booking.organization,
      bookingId: booking.id,
    });

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="discovery-session-unit311-central.ics"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate calendar file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
