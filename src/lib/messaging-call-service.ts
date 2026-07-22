import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { clearWebrtcSignals } from "@/lib/executive-call-webrtc-service";
import type { PlatformSession } from "@/lib/platform-session";

export type MessagingCallType = "voice" | "video";

export type MessagingCallRoom = {
  sessionId: string;
  workspaceId: string;
  channelRoom: string;
  callType: MessagingCallType;
  hostOperatorId: string;
  hostOperatorName: string;
  hostJoinedAt: string | null;
  guestOperatorId: string | null;
  guestOperatorName: string | null;
  guestJoinedAt: string | null;
  endedAt: string | null;
  createdAt: string;
};

export type MessagingCallSessionPayload = {
  room: MessagingCallRoom;
  viewer: {
    isHost: boolean;
    displayName: string;
    operatorId: string;
  };
  bothJoined: boolean;
};

type RoomRow = {
  session_id: string;
  workspace_id: string;
  channel_room: string;
  call_type: string;
  host_operator_id: string;
  host_operator_name: string | null;
  host_joined_at: string | null;
  guest_operator_id: string | null;
  guest_operator_name: string | null;
  guest_joined_at: string | null;
  ended_at: string | null;
  created_at: string;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function mapRoom(row: RoomRow): MessagingCallRoom {
  return {
    sessionId: row.session_id,
    workspaceId: row.workspace_id,
    channelRoom: row.channel_room,
    callType: row.call_type === "voice" ? "voice" : "video",
    hostOperatorId: row.host_operator_id,
    hostOperatorName: row.host_operator_name ?? "",
    hostJoinedAt: row.host_joined_at,
    guestOperatorId: row.guest_operator_id,
    guestOperatorName: row.guest_operator_name,
    guestJoinedAt: row.guest_joined_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
  };
}

export function parseMessagingCallSessionId(callLinkOrId: string) {
  const trimmed = callLinkOrId.trim();
  const match = trimmed.match(/\/meet\/(?:voice|video)\/([^/?#]+)/i);
  if (match?.[1]) return match[1];
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

export async function createMessagingCallRoom(input: {
  sessionId: string;
  workspaceId: string;
  channelRoom: string;
  callType: MessagingCallType;
  hostOperatorId: string;
  hostOperatorName: string;
}): Promise<MessagingCallRoom> {
  const supabase = requireSupabase();
  const sessionId = parseMessagingCallSessionId(input.sessionId);
  if (!sessionId) throw new Error("sessionId is required.");

  const { data: existing } = await supabase
    .from("messaging_call_rooms")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing && !(existing as RoomRow).ended_at) {
    return mapRoom(existing as RoomRow);
  }

  await clearWebrtcSignals(sessionId).catch(() => undefined);

  const { data, error } = await supabase
    .from("messaging_call_rooms")
    .upsert(
      {
        session_id: sessionId,
        workspace_id: input.workspaceId,
        channel_room: input.channelRoom,
        call_type: input.callType,
        host_operator_id: input.hostOperatorId,
        host_operator_name: input.hostOperatorName,
        host_joined_at: null,
        guest_operator_id: null,
        guest_operator_name: null,
        guest_joined_at: null,
        ended_at: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: "session_id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRoom(data as RoomRow);
}

export async function getMessagingCallRoom(sessionId: string): Promise<MessagingCallRoom | null> {
  const supabase = requireSupabase();
  const id = parseMessagingCallSessionId(sessionId);
  const { data, error } = await supabase
    .from("messaging_call_rooms")
    .select("*")
    .eq("session_id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRoom(data as RoomRow) : null;
}

function resolveOperatorId(session: PlatformSession) {
  return session.sub || session.username;
}

function resolveDisplayName(session: PlatformSession) {
  return session.displayName?.trim() || session.username;
}

export async function getMessagingCallSession(
  sessionId: string,
  session: PlatformSession,
): Promise<MessagingCallSessionPayload | null> {
  const room = await getMessagingCallRoom(sessionId);
  if (!room || room.endedAt) return null;

  const operatorId = resolveOperatorId(session);
  const isHost = room.hostOperatorId === operatorId || room.hostOperatorId === session.username;

  return {
    room,
    viewer: {
      isHost,
      displayName: resolveDisplayName(session),
      operatorId,
    },
    bothJoined: Boolean(room.hostJoinedAt && room.guestJoinedAt),
  };
}

export async function joinMessagingCallRoom(input: {
  sessionId: string;
  session: PlatformSession;
}): Promise<MessagingCallSessionPayload> {
  const supabase = requireSupabase();
  const room = await getMessagingCallRoom(input.sessionId);
  if (!room) throw new Error("Call not found.");
  if (room.endedAt) throw new Error("This call has ended.");

  const operatorId = resolveOperatorId(input.session);
  const displayName = resolveDisplayName(input.session);
  const isHost =
    room.hostOperatorId === operatorId || room.hostOperatorId === input.session.username;
  const now = new Date().toISOString();

  if (isHost) {
    const { data, error } = await supabase
      .from("messaging_call_rooms")
      .update({ host_joined_at: room.hostJoinedAt ?? now })
      .eq("session_id", room.sessionId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const mapped = mapRoom(data as RoomRow);
    return {
      room: mapped,
      viewer: { isHost: true, displayName, operatorId },
      bothJoined: Boolean(mapped.hostJoinedAt && mapped.guestJoinedAt),
    };
  }

  if (
    room.guestOperatorId &&
    room.guestOperatorId !== operatorId &&
    room.guestOperatorId !== input.session.username
  ) {
    throw new Error("This call already has two participants.");
  }

  const { data, error } = await supabase
    .from("messaging_call_rooms")
    .update({
      guest_operator_id: operatorId,
      guest_operator_name: displayName,
      guest_joined_at: room.guestJoinedAt ?? now,
    })
    .eq("session_id", room.sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const mapped = mapRoom(data as RoomRow);
  return {
    room: mapped,
    viewer: { isHost: false, displayName, operatorId },
    bothJoined: Boolean(mapped.hostJoinedAt && mapped.guestJoinedAt),
  };
}

export async function leaveMessagingCallRoom(input: {
  sessionId: string;
  session: PlatformSession;
}): Promise<MessagingCallRoom> {
  const supabase = requireSupabase();
  const room = await getMessagingCallRoom(input.sessionId);
  if (!room) throw new Error("Call not found.");

  const operatorId = resolveOperatorId(input.session);
  const isHost =
    room.hostOperatorId === operatorId || room.hostOperatorId === input.session.username;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("messaging_call_rooms")
    .update({
      ended_at: now,
      ...(isHost ? { host_joined_at: room.hostJoinedAt } : { guest_joined_at: room.guestJoinedAt }),
    })
    .eq("session_id", room.sessionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await clearWebrtcSignals(room.sessionId).catch(() => undefined);
  return mapRoom(data as RoomRow);
}
