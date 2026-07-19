import { NextResponse } from "next/server";

import { submitFounderSessionFocusSelections } from "@/lib/founder-booking/focus-submission-service";
import { getFounderSessionBookingById } from "@/lib/founder-booking/service";
import { getPlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const booking = await getFounderSessionBookingById(id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (!booking.focusSelections) {
      return NextResponse.json(
        {
          error:
            "No focus selections stored for this booking. The client must submit focus areas on /book after booking.",
        },
        { status: 400 },
      );
    }

    const result = await submitFounderSessionFocusSelections(id, booking.focusSelections);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to regenerate focus PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
