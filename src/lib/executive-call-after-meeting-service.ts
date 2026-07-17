import { sendMailboxEmail } from "@/lib/email/smtp";
import { buildFounderPostMeetingThankYouEmail } from "@/lib/founder-booking/emails";
import {
  getFounderSessionBookingBySlug,
} from "@/lib/founder-booking/service";
import { withFounderSessionBookingsTable } from "@/lib/internal-db-migrations";

export async function sendExecutiveCallPostMeetingThankYou(slug: string) {
  return withFounderSessionBookingsTable(async () => {
    const booking = await getFounderSessionBookingBySlug(slug);
    if (!booking) throw new Error("Meeting not found.");
    if (!booking.hostLeftAt) throw new Error("Meeting has not ended yet.");

    const email = buildFounderPostMeetingThankYouEmail({
      name: booking.name,
      organization: booking.organization,
      email: booking.email,
      startsAt: booking.startsAt,
      videoLink: booking.videoLink,
      clientTimezone: booking.clientTimezone ?? undefined,
    });

    await sendMailboxEmail({
      account: "info",
      to: booking.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    return { sentTo: booking.email };
  });
}
