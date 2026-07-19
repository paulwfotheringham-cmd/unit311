import { NextResponse } from "next/server";

import { listFounderSessionBookings } from "@/lib/founder-booking/service";
import { resolveFounderSessionFocusOverviewPdfFileId } from "@/lib/founder-booking/focus-submission-service";
import { formatDateTimeInTimezone, getFounderBookingTimezone } from "@/lib/founder-booking/timezones";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";
import { formatExecutiveMeetingStatus } from "@/lib/founder-booking/meeting-slug";
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
    const bookings = await listFounderSessionBookings({ workspaceId: workspace.id });
    const meetings = await Promise.all(
      bookings.map(async (booking) => {
      const timezoneMeta = getFounderBookingTimezone(booking.clientTimezone ?? "Europe/London");
      const focusOverviewPdfFileId = await resolveFounderSessionFocusOverviewPdfFileId(booking);
      return {
        id: booking.id,
        name: booking.name,
        organization: booking.organization,
        role: booking.role,
        email: booking.email,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        formattedWhenGmt: `${formatLondonDateTime(booking.startsAt)} GMT`,
        formattedWhenClient: booking.clientTimezone
          ? formatDateTimeInTimezone(booking.startsAt, timezoneMeta.id)
          : null,
        clientTimezone: timezoneMeta.label,
        clientTimezoneAbbrev: timezoneMeta.abbreviation,
        status: booking.status,
        statusLabel: formatExecutiveMeetingStatus(booking.status),
        meetingSlug: booking.meetingSlug,
        meetingLink: booking.videoLink,
        startReminderSentAt: booking.startReminderSentAt,
        transcriptSavedAt: booking.transcriptSavedAt,
        transcriptFileId: booking.transcriptFileId,
        focusOverviewPdfFileId,
        focusSelectionsSubmittedAt: booking.focusSelectionsSubmittedAt,
      };
    }),
    );

    return NextResponse.json({ meetings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load meetings";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
