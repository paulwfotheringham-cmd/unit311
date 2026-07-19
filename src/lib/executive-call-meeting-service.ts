import { getPlatformSession } from "@/lib/platform-session";
import type { PlatformSession } from "@/lib/platform-auth";
import {
  getFounderSessionBookingBySlug,
  type FounderSessionBooking,
} from "@/lib/founder-booking/service";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";
import { withFounderSessionBookingsTable } from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { parseTranscriptDraft } from "@/lib/executive-call-transcript-data";

export type ExecutiveCallSession = {
  id: string;
  slug: string;
  name: string;
  organization: string;
  email: string;
  startsAt: string;
  endsAt: string;
  status: string;
  hostStarted: boolean;
  hostStartedAt: string | null;
  clientJoinedAt: string | null;
  hostLeftAt: string | null;
  clientLeftAt: string | null;
  guestsAdmitted: boolean;
  guestsAdmittedAt: string | null;
  transcriptSavedAt: string | null;
  transcriptFileId: string | null;
  formattedWhenGmt: string;
};

type DbBookingPatch = {
  host_started_at?: string | null;
  client_joined_at?: string | null;
  host_left_at?: string | null;
  client_left_at?: string | null;
  guests_admitted_at?: string | null;
  status?: string;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function isExecutiveCallHost(session: PlatformSession | null, guestEmail: string) {
  if (!session || session.userType !== "internal") {
    return false;
  }

  const normalizedGuest = guestEmail.trim().toLowerCase();
  const viewerIdentity = session.username.trim().toLowerCase();
  if (normalizedGuest && viewerIdentity === normalizedGuest) {
    return false;
  }

  return true;
}

function mapExecutiveCallSession(booking: FounderSessionBooking, slug: string): ExecutiveCallSession {
  return {
    id: booking.id,
    slug,
    name: booking.name,
    organization: booking.organization,
    email: booking.email,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    status: booking.status,
    hostStarted: Boolean(booking.hostStartedAt),
    hostStartedAt: booking.hostStartedAt,
    clientJoinedAt: booking.clientJoinedAt,
    hostLeftAt: booking.hostLeftAt,
    clientLeftAt: booking.clientLeftAt,
    guestsAdmitted: Boolean(booking.guestsAdmittedAt),
    guestsAdmittedAt: booking.guestsAdmittedAt,
    transcriptSavedAt: booking.transcriptSavedAt,
    transcriptFileId: booking.transcriptFileId,
    formattedWhenGmt: `${formatLondonDateTime(booking.startsAt)} GMT`,
  };
}

async function updateExecutiveCallBooking(slug: string, patch: DbBookingPatch) {
  return withFounderSessionBookingsTable(async () => {
    const booking = await getFounderSessionBookingBySlug(slug);
    if (!booking) throw new Error("Meeting not found.");

    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("founder_session_bookings")
      .update(patch)
      .eq("id", booking.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const row = data as Record<string, unknown>;
    return {
      ...booking,
      status: (row.status as FounderSessionBooking["status"]) ?? booking.status,
      hostStartedAt: (row.host_started_at as string | null) ?? booking.hostStartedAt,
      clientJoinedAt: (row.client_joined_at as string | null) ?? booking.clientJoinedAt,
      hostLeftAt: (row.host_left_at as string | null) ?? booking.hostLeftAt,
      clientLeftAt: (row.client_left_at as string | null) ?? booking.clientLeftAt,
      guestsAdmittedAt: (row.guests_admitted_at as string | null) ?? booking.guestsAdmittedAt,
      transcriptDraft: parseTranscriptDraft(row.transcript_draft),
      transcriptFileId: (row.transcript_file_id as string | null) ?? booking.transcriptFileId,
      transcriptSavedAt: (row.transcript_saved_at as string | null) ?? booking.transcriptSavedAt,
    };
  });
}

export async function getExecutiveCallSession(slug: string) {
  const session = await getPlatformSession();
  const booking = await getFounderSessionBookingBySlug(slug);
  if (!booking || booking.status === "cancelled") {
    return null;
  }

  const normalizedSlug = booking.meetingSlug ?? slug.trim().toLowerCase();

  return {
    meeting: mapExecutiveCallSession(booking, normalizedSlug),
    viewer: {
      isHost: isExecutiveCallHost(session, booking.email),
      displayName: session?.displayName ?? null,
    },
    transcript: booking.transcriptDraft,
  };
}

export async function startExecutiveCall(slug: string) {
  const session = await getPlatformSession();
  const booking = await getFounderSessionBookingBySlug(slug);
  if (!booking) throw new Error("Meeting not found.");
  if (!isExecutiveCallHost(session, booking.email)) {
    throw new Error("Only the Unit311 host can start this meeting.");
  }

  if (booking.hostStartedAt) {
    return mapExecutiveCallSession(booking, booking.meetingSlug ?? slug);
  }

  const updated = await updateExecutiveCallBooking(slug, {
    host_started_at: new Date().toISOString(),
    host_left_at: null,
    client_left_at: null,
    guests_admitted_at: null,
  });

  return mapExecutiveCallSession(updated, updated.meetingSlug ?? slug);
}

export async function admitExecutiveCallGuests(slug: string) {
  const session = await getPlatformSession();
  const booking = await getFounderSessionBookingBySlug(slug);
  if (!booking) throw new Error("Meeting not found.");
  if (!isExecutiveCallHost(session, booking.email)) {
    throw new Error("Only the Unit311 host can admit guests.");
  }
  if (!booking.hostStartedAt) {
    throw new Error("Connect to the meeting room before allowing guests to enter.");
  }

  if (booking.guestsAdmittedAt) {
    return mapExecutiveCallSession(booking, booking.meetingSlug ?? slug);
  }

  const updated = await updateExecutiveCallBooking(slug, {
    guests_admitted_at: new Date().toISOString(),
    client_left_at: null,
  });

  return mapExecutiveCallSession(updated, updated.meetingSlug ?? slug);
}

export async function joinExecutiveCall(slug: string) {
  const booking = await getFounderSessionBookingBySlug(slug);
  if (!booking) throw new Error("Meeting not found.");
  if (!booking.guestsAdmittedAt) {
    throw new Error("The host has not allowed guests to enter yet.");
  }

  if (booking.clientJoinedAt) {
    return mapExecutiveCallSession(booking, booking.meetingSlug ?? slug);
  }

  const updated = await updateExecutiveCallBooking(slug, {
    client_joined_at: new Date().toISOString(),
    client_left_at: null,
  });

  return mapExecutiveCallSession(updated, updated.meetingSlug ?? slug);
}

export async function leaveExecutiveCall(slug: string, role: "host" | "client") {
  const session = await getPlatformSession();
  const booking = await getFounderSessionBookingBySlug(slug);
  if (!booking) throw new Error("Meeting not found.");

  if (role === "host") {
    if (!isExecutiveCallHost(session, booking.email)) {
      throw new Error("Only the Unit311 host can end the host session.");
    }

    const endedAt = new Date().toISOString();
    const patch: DbBookingPatch = {
      host_left_at: endedAt,
      status: "completed",
    };
    if (booking.clientJoinedAt && !booking.clientLeftAt) {
      patch.client_left_at = endedAt;
    }

    const updated = await updateExecutiveCallBooking(slug, patch);
    return mapExecutiveCallSession(updated, updated.meetingSlug ?? slug);
  }

  const updated = await updateExecutiveCallBooking(slug, {
    client_left_at: new Date().toISOString(),
  });
  return mapExecutiveCallSession(updated, updated.meetingSlug ?? slug);
}
