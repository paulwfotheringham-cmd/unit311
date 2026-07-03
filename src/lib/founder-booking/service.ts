import { createCalendarEvent, listCalendarEvents } from "@/lib/internal-calendar-service";
import { generateCallLink } from "@/lib/internal-messaging-data";
import { sendMailboxEmail } from "@/lib/email/smtp";
import {
  buildFounderConfirmationEmail,
  buildFounderInternalNotificationEmail,
  buildFounderReminderEmail,
} from "@/lib/founder-booking/emails";
import {
  buildSlotsForDateKey,
  FOUNDER_SLOT_MINUTES,
  formatLondonDateTime,
  listBookableDateKeys,
  londonDateKey,
  londonLocalToUtcIso,
  type FounderSessionSlot,
} from "@/lib/founder-booking/slots";
import { withFounderSessionBookingsTable } from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type FounderSessionBooking = {
  id: string;
  name: string;
  organization: string;
  email: string;
  startsAt: string;
  endsAt: string;
  videoLink: string;
  calendarEventId: string | null;
  confirmationSentAt: string | null;
  internalNotificationSentAt: string | null;
  reminderSentAt: string | null;
  createdAt: string;
};

type DbFounderSessionBooking = {
  id: string;
  name: string;
  organization: string;
  email: string;
  starts_at: string;
  ends_at: string;
  video_link: string;
  calendar_event_id: string | null;
  confirmation_sent_at: string | null;
  internal_notification_sent_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

function mapBooking(row: DbFounderSessionBooking): FounderSessionBooking {
  return {
    id: row.id,
    name: row.name,
    organization: row.organization,
    email: row.email,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    videoLink: row.video_link,
    calendarEventId: row.calendar_event_id,
    confirmationSentAt: row.confirmation_sent_at,
    internalNotificationSentAt: row.internal_notification_sent_at,
    reminderSentAt: row.reminder_sent_at,
    createdAt: row.created_at,
  };
}

async function listBookedStartsAt(fromIso: string, toIso: string) {
  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();

    const { data, error } = await supabase
      .from("founder_session_bookings")
      .select("starts_at")
      .gte("starts_at", fromIso)
      .lte("starts_at", toIso);

    if (error) throw new Error(error.message);
    return new Set((data ?? []).map((row) => row.starts_at as string));
  });
}

async function listCalendarStartsAt(fromIso: string, toIso: string) {
  const events = await listCalendarEvents(fromIso, toIso);
  return new Set(events.map((event) => event.startsAt));
}

export async function listAvailableFounderSlots(dateKey?: string): Promise<{
  dateKeys: string[];
  slots: FounderSessionSlot[];
}> {
  const dateKeys = listBookableDateKeys();
  const selectedDateKey = dateKey && dateKeys.includes(dateKey) ? dateKey : dateKeys[0];
  if (!selectedDateKey) return { dateKeys: [], slots: [] };

  const candidateSlots = buildSlotsForDateKey(selectedDateKey);
  if (candidateSlots.length === 0) {
    return { dateKeys, slots: [] };
  }

  const fromIso = candidateSlots[0].startsAt;
  const toIso = candidateSlots[candidateSlots.length - 1].endsAt;
  const [bookedStarts, calendarStarts] = await Promise.all([
    listBookedStartsAt(fromIso, toIso).catch(() => new Set<string>()),
    listCalendarStartsAt(fromIso, toIso).catch(() => new Set<string>()),
  ]);

  const blocked = new Set([...bookedStarts, ...calendarStarts]);
  const slots = candidateSlots.filter((slot) => !blocked.has(slot.startsAt));

  return { dateKeys, slots };
}

export async function createFounderSessionBooking(input: {
  name: string;
  organization: string;
  email: string;
  startsAt: string;
}) {
  const name = input.name.trim();
  const organization = input.organization.trim();
  const email = input.email.trim().toLowerCase();
  const startsAt = input.startsAt;

  if (!name || !organization || !email) {
    throw new Error("Name, organisation, and email are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const dateKey = londonDateKey(new Date(startsAt));
  const allowedSlots = buildSlotsForDateKey(dateKey);
  const selectedSlot = allowedSlots.find((slot) => slot.startsAt === startsAt);
  if (!selectedSlot) {
    throw new Error("Please choose a valid weekday slot between 9:00 and 18:00 UK time.");
  }

  const { slots } = await listAvailableFounderSlots(dateKey);
  if (!slots.some((slot) => slot.startsAt === startsAt)) {
    throw new Error("That time slot is no longer available. Please choose another.");
  }

  const videoLink = generateCallLink("video");
  const endsAt = new Date(
    new Date(startsAt).getTime() + FOUNDER_SLOT_MINUTES * 60_000,
  ).toISOString();

  const calendarEvent = await createCalendarEvent({
    title: `Founder session — ${name}`,
    eventType: "meeting",
    startsAt,
    endsAt,
    clientName: organization,
    location: videoLink,
    notes: `Booked via unit311central.com/book\nContact: ${name} <${email}>`,
  });

  const supabase = requireSupabase();
  const { data } = await withFounderSessionBookingsTable(async () => {
    const result = await supabase
      .from("founder_session_bookings")
      .insert({
        name,
        organization,
        email,
        starts_at: startsAt,
        ends_at: endsAt,
        video_link: videoLink,
        calendar_event_id: calendarEvent.id,
      })
      .select("*")
      .single();

    if (result.error) {
      throw new Error(
        result.error.message.includes("founder_session_bookings_starts_at_uidx")
          ? "That time slot was just booked. Please choose another."
          : result.error.message,
      );
    }
    return result;
  });

  const booking = mapBooking(data as DbFounderSessionBooking);
  const emailInput = {
    name,
    organization,
    email,
    startsAt,
    videoLink,
  };

  const confirmation = buildFounderConfirmationEmail(emailInput);
  const internal = buildFounderInternalNotificationEmail(emailInput);

  const [confirmationResult, internalResult] = await Promise.all([
    sendMailboxEmail({
      account: "info",
      to: email,
      subject: confirmation.subject,
      html: confirmation.html,
      text: confirmation.text,
    }),
    sendMailboxEmail({
      account: "info",
      to: "info@unit311central.com",
      subject: internal.subject,
      html: internal.html,
      text: internal.text,
    }),
  ]);

  const sentAt = new Date().toISOString();
  await withFounderSessionBookingsTable(async () =>
    supabase
      .from("founder_session_bookings")
      .update({
        confirmation_sent_at: sentAt,
        internal_notification_sent_at: sentAt,
      })
      .eq("id", booking.id),
  );

  return {
    booking: {
      ...booking,
      confirmationSentAt: sentAt,
      internalNotificationSentAt: sentAt,
    },
    email: {
      confirmationMessageId: confirmationResult.messageId,
      internalMessageId: internalResult.messageId,
    },
    formattedWhen: formatLondonDateTime(startsAt),
  };
}

export async function sendDueFounderSessionReminders() {
  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();

    const tomorrowProbe = new Date(Date.now() + 25 * 60 * 60 * 1000);
    const tomorrowKey = londonDateKey(tomorrowProbe);
    const fromIso = londonLocalToUtcIso(tomorrowKey, 0, 0);
    const dayAfterProbe = new Date(new Date(fromIso).getTime() + 25 * 60 * 60 * 1000);
    const dayAfterKey = londonDateKey(dayAfterProbe);
    const toIso = londonLocalToUtcIso(dayAfterKey, 0, 0);

    const { data, error } = await supabase
      .from("founder_session_bookings")
      .select("*")
      .is("reminder_sent_at", null)
      .gte("starts_at", fromIso)
      .lt("starts_at", toIso);

    if (error) throw new Error(error.message);

    const bookings = (data as DbFounderSessionBooking[]).map(mapBooking);
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const booking of bookings) {
      try {
        const reminder = buildFounderReminderEmail({
          name: booking.name,
          organization: booking.organization,
          email: booking.email,
          startsAt: booking.startsAt,
          videoLink: booking.videoLink,
        });

        await sendMailboxEmail({
          account: "info",
          to: booking.email,
          subject: reminder.subject,
          html: reminder.html,
          text: reminder.text,
        });

        await supabase
          .from("founder_session_bookings")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", booking.id);

        results.push({ id: booking.id, ok: true });
      } catch (reminderError) {
        results.push({
          id: booking.id,
          ok: false,
          error: reminderError instanceof Error ? reminderError.message : "Reminder failed",
        });
      }
    }

    return { processed: results.length, results };
  });
}
