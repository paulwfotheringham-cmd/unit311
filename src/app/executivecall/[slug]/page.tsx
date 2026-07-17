import { notFound } from "next/navigation";

import ExecutiveCallRoom from "@/components/executivecall/ExecutiveCallRoom";
import { getFounderSessionBookingBySlug } from "@/lib/founder-booking/service";
import { formatDateTimeInTimezone, getFounderBookingTimezone } from "@/lib/founder-booking/timezones";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";
import { createPageMetadata } from "@/lib/metadata";

type ExecutiveCallPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ExecutiveCallPageProps) {
  const { slug } = await params;
  const booking = await getFounderSessionBookingBySlug(slug).catch(() => null);

  return createPageMetadata({
    title: booking
      ? `Executive call — ${booking.organization}`
      : "Executive call",
    description: "Private executive strategy session room for Unit311 Central.",
    path: `/executivecall/${slug}`,
  });
}

export default async function ExecutiveCallPage({ params }: ExecutiveCallPageProps) {
  const { slug } = await params;
  const booking = await getFounderSessionBookingBySlug(slug).catch(() => null);

  if (!booking || booking.status === "cancelled") {
    notFound();
  }

  const timezoneMeta = getFounderBookingTimezone(booking.clientTimezone ?? "Europe/London");

  return (
    <section className="min-h-screen bg-[#020617]">
      <ExecutiveCallRoom
        slug={booking.meetingSlug ?? slug}
        formattedWhenClient={
          booking.clientTimezone
            ? formatDateTimeInTimezone(booking.startsAt, timezoneMeta.id)
            : null
        }
        clientTimezoneLabel={timezoneMeta.label}
      />
    </section>
  );
}
