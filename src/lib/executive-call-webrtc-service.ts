import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  ensureExecutiveCallWebrtcSignalsTable,
  withExecutiveCallWebrtcSignalsTable,
} from "@/lib/internal-db-migrations";

export type WebrtcSenderRole = "host" | "guest";
export type WebrtcSignalType = "offer" | "answer" | "ice-candidate" | "hangup" | "ready";

export type WebrtcSignal = {
  id: string;
  meetingSlug: string;
  senderRole: WebrtcSenderRole;
  signalType: WebrtcSignalType;
  payload: Record<string, unknown>;
  createdAt: string;
};

type WebrtcSignalRow = {
  id: string;
  meeting_slug: string;
  sender_role: string;
  signal_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function mapRow(row: WebrtcSignalRow): WebrtcSignal {
  return {
    id: row.id,
    meetingSlug: row.meeting_slug,
    senderRole: row.sender_role as WebrtcSenderRole,
    signalType: row.signal_type as WebrtcSignalType,
    payload: row.payload ?? {},
    createdAt: row.created_at,
  };
}

export async function postWebrtcSignal(input: {
  meetingSlug: string;
  senderRole: WebrtcSenderRole;
  signalType: WebrtcSignalType;
  payload?: Record<string, unknown>;
}): Promise<WebrtcSignal> {
  await ensureExecutiveCallWebrtcSignalsTable();
  return withExecutiveCallWebrtcSignalsTable(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("executive_call_webrtc_signals")
      .insert({
        meeting_slug: input.meetingSlug,
        sender_role: input.senderRole,
        signal_type: input.signalType,
        payload: input.payload ?? {},
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapRow(data as WebrtcSignalRow);
  });
}

export async function listWebrtcSignalsSince(input: {
  meetingSlug: string;
  afterIso?: string | null;
  excludeRole?: WebrtcSenderRole | null;
}): Promise<WebrtcSignal[]> {
  await ensureExecutiveCallWebrtcSignalsTable();
  return withExecutiveCallWebrtcSignalsTable(async () => {
    const supabase = requireSupabase();
    let query = supabase
      .from("executive_call_webrtc_signals")
      .select("*")
      .eq("meeting_slug", input.meetingSlug)
      .order("created_at", { ascending: true })
      .limit(200);

    if (input.afterIso) {
      query = query.gt("created_at", input.afterIso);
    }
    if (input.excludeRole) {
      query = query.neq("sender_role", input.excludeRole);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as WebrtcSignalRow[]).map(mapRow);
  });
}

export async function clearWebrtcSignals(meetingSlug: string): Promise<void> {
  await ensureExecutiveCallWebrtcSignalsTable();
  return withExecutiveCallWebrtcSignalsTable(async () => {
    const supabase = requireSupabase();
    const { error } = await supabase
      .from("executive_call_webrtc_signals")
      .delete()
      .eq("meeting_slug", meetingSlug);
    if (error) throw new Error(error.message);
  });
}
