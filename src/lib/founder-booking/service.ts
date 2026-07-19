import { createCalendarEvent, listCalendarEvents } from "@/lib/internal-calendar-service";
import { sendMailboxEmail } from "@/lib/email/smtp";
import {
  buildFounderConfirmationEmail,
  buildFounderHourReminderEmail,
  buildFounderInternalNotificationEmail,
  buildFounderReminderEmail,
  buildFounderStartMeetingEmail,
  buildFounderWeekReminderEmail,
} from "@/lib/founder-booking/emails";
import { runFounderBookingSideEffects } from "@/lib/founder-booking/side-effects";
import {
  buildExecutiveCallSlug,
  buildExecutiveCallUrl,
  extractExecutiveCallSlugFromUrl,
  type ExecutiveMeetingStatus,
} from "@/lib/founder-booking/meeting-slug";
import {
  buildSlotsForDateKey,
  FOUNDER_SLOT_MINUTES,
  formatLondonDateTime,
  listBookableDateKeys,
  londonDateKey,
  londonLocalToUtcIso,
  type FounderSessionSlot,
} from "@/lib/founder-booking/slots";
import {
  DEFAULT_FOUNDER_BOOKING_TIMEZONE,
  formatDateTimeInTimezone,
  getFounderBookingTimezone,
} from "@/lib/founder-booking/timezones";
import { withFounderSessionBookingsTable } from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { parseTranscriptDraft, type TranscriptLine } from "@/lib/executive-call-transcript-data";
import type { BookThankYouSelections } from "@/lib/book-thank-you-data";
import {
  requireCurrentWorkspace,
  resolveWorkspaceBinding,
} from "@/lib/workspace-context";

export type FounderBookingsWorkspaceScope = {
  workspaceId?: string | null;
};

async function resolveFounderBookingsWorkspaceId(
  scope?: FounderBookingsWorkspaceScope,
): Promise<string> {
  const explicit = scope?.workspaceId?.trim();
  if (explicit) return explicit;
  try {
    return (await requireCurrentWorkspace()).id;
  } catch {
    const workspace = await resolveWorkspaceBinding({ fallbackInternal: true });
    if (!workspace) throw new Error("Workspace context is required.");
    return workspace.id;
  }
}

/**
 * Founder booking is a public flow (no session), so calendar reads/writes
 * always target the Internal unit311 workspace rather than session context.
 */
async function resolveFounderBookingCalendarWorkspaceId(): Promise<string> {
  const internal = await resolveWorkspaceBinding({ fallbackInternal: true });
  if (!internal) throw new Error("Workspace context is required.");
  return internal.id;
}

export type FounderSessionBooking = {
  id: string;
  name: string;
  organization: string;
  role: string | null;
  email: string;
  startsAt: string;
  endsAt: string;
  videoLink: string;
  meetingSlug: string | null;
  status: ExecutiveMeetingStatus;
  clientTimezone: string | null;
  calendarEventId: string | null;
  confirmationSentAt: string | null;
  internalNotificationSentAt: string | null;
  reminderSentAt: string | null;
  weekReminderSentAt: string | null;
  hourReminderSentAt: string | null;
  startReminderSentAt: string | null;
  crmLeadId: string | null;
  externalFolderId: string | null;
  hostStartedAt: string | null;
  clientJoinedAt: string | null;
  hostLeftAt: string | null;
  clientLeftAt: string | null;
  guestsAdmittedAt: string | null;
  transcriptDraft: TranscriptLine[];
  transcriptFileId: string | null;
  transcriptSavedAt: string | null;
  focusSelections: BookThankYouSelections | null;
  focusOverviewPdfFileId: string | null;
  focusSelectionsSubmittedAt: string | null;
  createdAt: string;
};

type DbFounderSessionBooking = {
  id: string;
  name: string;
  organization: string;
  role?: string | null;
  email: string;
  starts_at: string;
  ends_at: string;
  video_link: string;
  meeting_slug?: string | null;
  status?: string | null;
  client_timezone: string | null;
  calendar_event_id: string | null;
  confirmation_sent_at: string | null;
  internal_notification_sent_at: string | null;
  reminder_sent_at: string | null;
  week_reminder_sent_at?: string | null;
  hour_reminder_sent_at?: string | null;
  start_reminder_sent_at?: string | null;
  crm_lead_id?: string | null;
  external_folder_id?: string | null;
  host_started_at?: string | null;
  client_joined_at?: string | null;
  host_left_at?: string | null;
  client_left_at?: string | null;
  guests_admitted_at?: string | null;
  transcript_draft?: unknown;
  transcript_file_id?: string | null;
  transcript_saved_at?: string | null;
  focus_selections?: unknown;
  focus_overview_pdf_file_id?: string | null;
  focus_selections_submitted_at?: string | null;
  created_at: string;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

function parseFocusSelections(value: unknown): BookThankYouSelections | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { general?: unknown; modules?: unknown };
  if (!record.general || typeof record.general !== "object") return null;
  if (!record.modules || typeof record.modules !== "object") return null;
  return {
    general: record.general as Record<string, boolean>,
    modules: record.modules as Record<string, boolean>,
  };
}

function mapBooking(row: DbFounderSessionBooking): FounderSessionBooking {
  return {
    id: row.id,
    name: row.name,
    organization: row.organization,
    role: row.role?.trim() || null,
    email: row.email,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    videoLink: row.video_link,
    meetingSlug: row.meeting_slug ?? null,
    status: (row.status as ExecutiveMeetingStatus | undefined) ?? "scheduled",
    clientTimezone: row.client_timezone,
    calendarEventId: row.calendar_event_id,
    confirmationSentAt: row.confirmation_sent_at,
    internalNotificationSentAt: row.internal_notification_sent_at,
    reminderSentAt: row.reminder_sent_at,
    weekReminderSentAt: row.week_reminder_sent_at ?? null,
    hourReminderSentAt: row.hour_reminder_sent_at ?? null,
    startReminderSentAt: row.start_reminder_sent_at ?? null,
    crmLeadId: row.crm_lead_id ?? null,
    externalFolderId: row.external_folder_id ?? null,
    hostStartedAt: row.host_started_at ?? null,
    clientJoinedAt: row.client_joined_at ?? null,
    hostLeftAt: row.host_left_at ?? null,
    clientLeftAt: row.client_left_at ?? null,
    guestsAdmittedAt: row.guests_admitted_at ?? null,
    transcriptDraft: parseTranscriptDraft(row.transcript_draft),
    transcriptFileId: row.transcript_file_id ?? null,
    transcriptSavedAt: row.transcript_saved_at ?? null,
    focusSelections: parseFocusSelections(row.focus_selections),
    focusOverviewPdfFileId: row.focus_overview_pdf_file_id ?? null,
    focusSelectionsSubmittedAt: row.focus_selections_submitted_at ?? null,
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
  const internalWorkspaceId = await resolveFounderBookingCalendarWorkspaceId();
  const events = await listCalendarEvents(fromIso, toIso, { workspaceId: internalWorkspaceId });
  return new Set(events.map((event) => event.startsAt));
}

export async function listAvailableFounderSlots(dateKey?: string): Promise<{
  dateKeys: string[];
  slots: FounderSessionSlot[];
}> {
  void maybeSendDueFounderSessionHourReminders().catch(() => undefined);

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
  role: string;
  email: string;
  startsAt: string;
  clientTimezone?: string;
}) {
  const name = input.name.trim();
  const organization = input.organization.trim();
  const role = input.role.trim();
  const email = input.email.trim().toLowerCase();
  const startsAt = input.startsAt;
  const clientTimezone = input.clientTimezone?.trim() || DEFAULT_FOUNDER_BOOKING_TIMEZONE;
  const clientTimezoneMeta = getFounderBookingTimezone(clientTimezone);

  if (!name || !organization || !role || !email) {
    throw new Error("Name, role, organisation, and email are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const dateKey = londonDateKey(new Date(startsAt));
  const allowedSlots = buildSlotsForDateKey(dateKey);
  const selectedSlot = allowedSlots.find((slot) => slot.startsAt === startsAt);
  if (!selectedSlot) {
    throw new Error("Please choose a valid weekday slot between 9:00 am and 6:00 pm GMT.");
  }

  const { slots } = await listAvailableFounderSlots(dateKey);
  if (!slots.some((slot) => slot.startsAt === startsAt)) {
    throw new Error("That time slot is no longer available. Please choose another.");
  }

  const bookingId = crypto.randomUUID();
  const meetingSlug = buildExecutiveCallSlug(organization, bookingId);
  const executiveCallLink = buildExecutiveCallUrl(meetingSlug);
  const endsAt = new Date(
    new Date(startsAt).getTime() + FOUNDER_SLOT_MINUTES * 60_000,
  ).toISOString();

  const internalCalendarWorkspaceId = await resolveFounderBookingCalendarWorkspaceId();
  const calendarEvent = await createCalendarEvent(
    {
      title: `Executive strategy session — ${name}`,
      eventType: "meeting",
      startsAt,
      endsAt,
      clientName: organization,
      location: executiveCallLink,
      notes: `Booked via unit311central.com/book\nContact: ${name} <${email}>\nRole: ${role}\nClient timezone: ${clientTimezoneMeta.label}\nMeeting room: ${executiveCallLink}`,
    },
    { workspaceId: internalCalendarWorkspaceId },
  );

  const supabase = requireSupabase();
  const bookingWorkspaceId = await resolveFounderBookingsWorkspaceId();
  const { data } = await withFounderSessionBookingsTable(async () => {
    const basePayload = {
      id: bookingId,
      workspace_id: bookingWorkspaceId,
      name,
      organization,
      role,
      email,
      starts_at: startsAt,
      ends_at: endsAt,
      video_link: executiveCallLink,
      calendar_event_id: calendarEvent.id,
    };

    let result = await supabase
      .from("founder_session_bookings")
      .insert({
        ...basePayload,
        client_timezone: clientTimezone,
        meeting_slug: meetingSlug,
        status: "scheduled",
      })
      .select("*")
      .single();

    if (result.error && result.error.message.includes("role")) {
      const { role: _role, ...payloadWithoutRole } = basePayload;
      result = await supabase
        .from("founder_session_bookings")
        .insert({
          ...payloadWithoutRole,
          client_timezone: clientTimezone,
          meeting_slug: meetingSlug,
          status: "scheduled",
        })
        .select("*")
        .single();
    }

    if (result.error && result.error.message.includes("meeting_slug")) {
      result = await supabase
        .from("founder_session_bookings")
        .insert({ ...basePayload, client_timezone: clientTimezone })
        .select("*")
        .single();
    } else if (result.error && result.error.message.includes("client_timezone")) {
      result = await supabase.from("founder_session_bookings").insert(basePayload).select("*").single();
    }

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

  if (!booking.meetingSlug) {
    await withFounderSessionBookingsTable(async () => {
      const { error: slugUpdateError } = await supabase
        .from("founder_session_bookings")
        .update({ meeting_slug: meetingSlug })
        .eq("id", booking.id);
      if (!slugUpdateError) {
        booking.meetingSlug = meetingSlug;
      }
    }).catch(() => undefined);
  }

  const emailInput = {
    name,
    organization,
    role,
    email,
    startsAt,
    endsAt: booking.endsAt ?? endsAt,
    videoLink: booking.videoLink,
    clientTimezone,
    meetingSlug: booking.meetingSlug ?? meetingSlug,
    bookingId: booking.id,
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

  const sideEffects = await runFounderBookingSideEffects({
    booking,
    name,
    organization,
    role,
    email,
    startsAt,
    videoLink: booking.videoLink,
  });

  return {
    booking: {
      ...booking,
      confirmationSentAt: sentAt,
      internalNotificationSentAt: sentAt,
      crmLeadId: sideEffects.crmLeadId,
      externalFolderId: sideEffects.externalFolderId,
    },
    email: {
      confirmationMessageId: confirmationResult.messageId,
      internalMessageId: internalResult.messageId,
    },
    sideEffects,
    formattedWhen: formatLondonDateTime(startsAt),
    formattedWhenClient: formatDateTimeInTimezone(startsAt, clientTimezoneMeta.id),
    clientTimezoneLabel: clientTimezoneMeta.label,
  };
}

export async function sendDueFounderSessionReminders() {
  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();
    const now = Date.now();
    const weekResults = await sendFounderSessionWeekReminders(supabase, now);
    const hourResults = await sendFounderSessionHourReminders(supabase, now);
    const dayResults = await sendFounderSessionDayBeforeReminders(supabase);

    return {
      processed: weekResults.length + hourResults.length + dayResults.length,
      weekResults,
      hourResults,
      dayResults,
    };
  });
}

async function sendFounderSessionWeekReminders(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  nowMs: number,
) {
  const fromIso = new Date(nowMs + 6.5 * 24 * 60 * 60 * 1000).toISOString();
  const toIso = new Date(nowMs + 7.5 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("founder_session_bookings")
    .select("*")
    .is("week_reminder_sent_at", null)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso);

  if (error) throw new Error(error.message);
  return sendReminderBatch(
    supabase,
    (data as DbFounderSessionBooking[]).map(mapBooking),
    "week_reminder_sent_at",
    buildFounderWeekReminderEmail,
  );
}

async function sendFounderSessionHourReminders(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  nowMs: number,
) {
  const fromIso = new Date(nowMs + 45 * 60 * 1000).toISOString();
  const toIso = new Date(nowMs + 75 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("founder_session_bookings")
    .select("*")
    .is("hour_reminder_sent_at", null)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso);

  if (error) throw new Error(error.message);
  return sendReminderBatch(
    supabase,
    (data as DbFounderSessionBooking[]).map(mapBooking),
    "hour_reminder_sent_at",
    buildFounderHourReminderEmail,
  );
}

async function sendFounderSessionDayBeforeReminders(
  supabase: ReturnType<typeof createSupabaseServerClient>,
) {
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
  return sendReminderBatch(
    supabase,
    (data as DbFounderSessionBooking[]).map(mapBooking),
    "reminder_sent_at",
    buildFounderReminderEmail,
  );
}

async function sendReminderBatch(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  bookings: FounderSessionBooking[],
  sentAtColumn: "week_reminder_sent_at" | "hour_reminder_sent_at" | "reminder_sent_at",
  buildEmail: (input: {
    name: string;
    organization: string;
    email: string;
    startsAt: string;
    videoLink: string;
    clientTimezone?: string;
  }) => { subject: string; html: string; text: string },
) {
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const booking of bookings) {
    try {
      const reminder = buildEmail({
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
        subject: reminder.subject,
        html: reminder.html,
        text: reminder.text,
      });

      await supabase
        .from("founder_session_bookings")
        .update({ [sentAtColumn]: new Date().toISOString() })
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

  return results;
}

async function maybeSendDueFounderSessionHourReminders() {
  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();
    return sendFounderSessionHourReminders(supabase, Date.now());
  });
}

export async function getFounderSessionBookingById(bookingId: string) {
  const normalizedId = bookingId.trim();
  if (!normalizedId) return null;

  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("founder_session_bookings")
      .select("*")
      .eq("id", normalizedId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapBooking(data as DbFounderSessionBooking) : null;
  });
}

export async function listFounderSessionBookings(scope?: FounderBookingsWorkspaceScope) {
  await maybeSendDueFounderSessionHourReminders().catch(() => undefined);
  const workspaceId = await resolveFounderBookingsWorkspaceId(scope);

  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("founder_session_bookings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("starts_at", { ascending: true });

    if (error) throw new Error(error.message);
    return (data as DbFounderSessionBooking[]).map(mapBooking);
  });
}

export async function getFounderSessionBookingBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return null;

  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();

    const { data: slugMatch, error: slugError } = await supabase
      .from("founder_session_bookings")
      .select("*")
      .eq("meeting_slug", normalizedSlug)
      .maybeSingle();

    if (slugError && !slugError.message.includes("meeting_slug")) {
      throw new Error(slugError.message);
    }

    let row = slugMatch as DbFounderSessionBooking | null;

    if (!row) {
      const executiveCallSuffix = `/executivecall/${normalizedSlug}`;
      const { data: linkMatches, error: linkError } = await supabase
        .from("founder_session_bookings")
        .select("*")
        .ilike("video_link", `%${executiveCallSuffix}%`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (linkError) throw new Error(linkError.message);
      row = (linkMatches?.[0] as DbFounderSessionBooking | undefined) ?? null;
    }

    if (!row) return null;

    if (!row.meeting_slug) {
      const slugFromLink = extractExecutiveCallSlugFromUrl(row.video_link);
      const slugToPersist = slugFromLink ?? normalizedSlug;
      const { error: backfillError } = await supabase
        .from("founder_session_bookings")
        .update({ meeting_slug: slugToPersist })
        .eq("id", row.id);

      if (!backfillError) {
        row = { ...row, meeting_slug: slugToPersist };
      }
    }

    return mapBooking(row);
  });
}

export async function updateFounderSessionMeetingStatus(
  bookingId: string,
  status: ExecutiveMeetingStatus,
) {
  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("founder_session_bookings")
      .update({ status })
      .eq("id", bookingId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapBooking(data as DbFounderSessionBooking);
  });
}

export async function getFounderSessionBookingsForCrmLead(crmLeadId: string) {
  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("founder_session_bookings")
      .select("*")
      .eq("crm_lead_id", crmLeadId)
      .neq("status", "cancelled")
      .order("starts_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data as DbFounderSessionBooking[]).map(mapBooking);
  });
}

function normalizeBookingMatch(value: string) {
  return value.trim().toLowerCase();
}

/** Link orphan bookings by company/email, then return all bookings for the lead. */
export async function resolveBookingsForCrmLead(lead: {
  id: string;
  companyName: string;
  email: string;
}) {
  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();
    const normalizedCompany = normalizeBookingMatch(lead.companyName);
    const normalizedEmail = normalizeBookingMatch(lead.email);

    const { data: candidates, error } = await supabase
      .from("founder_session_bookings")
      .select("*")
      .neq("status", "cancelled")
      .or(`crm_lead_id.is.null,crm_lead_id.neq.${lead.id}`)
      .order("starts_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    const toLink = (candidates as DbFounderSessionBooking[]).filter((row) => {
      const org = normalizeBookingMatch(row.organization ?? "");
      const email = normalizeBookingMatch(row.email ?? "");
      return (
        (normalizedCompany.length > 0 && org === normalizedCompany) ||
        (normalizedEmail.length > 0 && email === normalizedEmail)
      );
    });

    for (const row of toLink) {
      const { error: linkError } = await supabase
        .from("founder_session_bookings")
        .update({ crm_lead_id: lead.id })
        .eq("id", row.id);
      if (linkError) throw new Error(linkError.message);
    }

    return getFounderSessionBookingsForCrmLead(lead.id);
  });
}

export async function completeFounderSessionBookingsForCrmLead(crmLeadId: string) {
  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("founder_session_bookings")
      .update({ status: "completed" })
      .eq("crm_lead_id", crmLeadId)
      .neq("status", "cancelled")
      .neq("status", "completed")
      .select("*");

    if (error) throw new Error(error.message);
    return (data as DbFounderSessionBooking[]).map(mapBooking);
  });
}

export async function deleteFounderSessionBooking(bookingId: string) {
  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();
    const { error } = await supabase.from("founder_session_bookings").delete().eq("id", bookingId);

    if (error) throw new Error(error.message);
  });
}

export async function sendFounderSessionStartReminder(bookingId: string) {
  return withFounderSessionBookingsTable(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("founder_session_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error) throw new Error(error.message);
    const booking = mapBooking(data as DbFounderSessionBooking);

    const reminder = buildFounderStartMeetingEmail({
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
      subject: reminder.subject,
      html: reminder.html,
      text: reminder.text,
    });

    const sentAt = new Date().toISOString();
    await supabase
      .from("founder_session_bookings")
      .update({ start_reminder_sent_at: sentAt })
      .eq("id", booking.id);

    return { booking: { ...booking, startReminderSentAt: sentAt }, sentAt };
  });
}
