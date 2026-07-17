import {
  INTERNAL_MESSAGING_ROOM,
  mapChatMessage,
  mapMessageChannel,
  mapScheduledCall,
  slugifyChannelName,
  type ChatMessage,
  type MessageChannel,
  type MessageChannelType,
  type MessageType,
  type ScheduledCall,
} from "@/lib/internal-messaging-data";
import { INTERNAL_FILES_BUCKET } from "@/lib/internal-files-data";
import {
  resolveMessagingWorkspaceId,
  type MessagingWorkspaceScope,
} from "@/lib/messaging-workspace";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type DbMessage = Parameters<typeof mapChatMessage>[0];
type DbChannel = Parameters<typeof mapMessageChannel>[0];
type DbScheduledCall = Parameters<typeof mapScheduledCall>[0];

export type { MessagingWorkspaceScope };

function requireMessagingSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

export async function listMessages(
  options?: {
    room?: string;
    limit?: number;
  },
  scope?: MessagingWorkspaceScope,
): Promise<ChatMessage[]> {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const supabase = requireMessagingSupabase();
  const room = options?.room ?? INTERNAL_MESSAGING_ROOM;
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 200);

  const { data, error } = await supabase
    .from("internal_messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("room", room)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as DbMessage[]).map(mapChatMessage);
}

export async function sendMessage(
  input: {
    operatorId: string;
    operatorName: string;
    username: string;
    content: string;
    room?: string;
    messageType?: MessageType;
    attachmentName?: string | null;
    attachmentUrl?: string | null;
    attachmentMime?: string | null;
    callLink?: string | null;
  },
  scope?: MessagingWorkspaceScope,
): Promise<ChatMessage> {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const trimmed = input.content.trim();
  const hasAttachment = Boolean(input.attachmentUrl);
  if (
    !trimmed &&
    !hasAttachment &&
    input.messageType !== "call" &&
    input.messageType !== "system"
  ) {
    throw new Error("Message cannot be empty.");
  }

  const supabase = requireMessagingSupabase();
  const { data, error } = await supabase
    .from("internal_messages")
    .insert({
      workspace_id: workspaceId,
      room: input.room ?? INTERNAL_MESSAGING_ROOM,
      operator_id: input.operatorId,
      operator_name: input.operatorName,
      username: input.username,
      content: trimmed || input.attachmentName || "Attachment",
      message_type: input.messageType ?? (hasAttachment ? "file" : "text"),
      attachment_name: input.attachmentName ?? null,
      attachment_url: input.attachmentUrl ?? null,
      attachment_mime: input.attachmentMime ?? null,
      call_link: input.callLink ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapChatMessage(data as DbMessage);
}

export async function getChannelByRoom(
  room: string,
  scope?: MessagingWorkspaceScope,
): Promise<MessageChannel | null> {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const supabase = requireMessagingSupabase();
  const { data, error } = await supabase
    .from("internal_message_channels")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("room", room)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapMessageChannel(data as DbChannel) : null;
}

export async function getChannelByName(
  name: string,
  scope?: MessagingWorkspaceScope,
): Promise<MessageChannel | null> {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const supabase = requireMessagingSupabase();
  const { data, error } = await supabase
    .from("internal_message_channels")
    .select("*")
    .eq("workspace_id", workspaceId)
    .ilike("name", name.trim())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapMessageChannel(data as DbChannel) : null;
}

export async function listChannels(scope?: MessagingWorkspaceScope): Promise<MessageChannel[]> {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const supabase = requireMessagingSupabase();
  const { data, error } = await supabase
    .from("internal_message_channels")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as DbChannel[]).map(mapMessageChannel);
}

async function attachUnreadCounts(
  channels: MessageChannel[],
  viewerKey: string,
  workspaceId: string,
): Promise<MessageChannel[]> {
  if (channels.length === 0) return channels;

  const supabase = requireMessagingSupabase();
  const rooms = channels.map((channel) => channel.room);

  const [{ data: readStates }, { data: messages }] = await Promise.all([
    supabase
      .from("internal_message_read_state")
      .select("room, last_read_at")
      .eq("workspace_id", workspaceId)
      .eq("viewer_key", viewerKey)
      .in("room", rooms),
    supabase
      .from("internal_messages")
      .select("room, operator_id, created_at")
      .eq("workspace_id", workspaceId)
      .in("room", rooms)
      .order("created_at", { ascending: false }),
  ]);

  const lastReadByRoom = new Map(
    (readStates ?? []).map((row) => [row.room as string, row.last_read_at as string]),
  );

  const unreadByRoom = new Map<string, number>();
  for (const room of rooms) {
    unreadByRoom.set(room, 0);
  }

  for (const message of messages ?? []) {
    const room = message.room as string;
    if (!unreadByRoom.has(room)) continue;
    const operatorId = message.operator_id as string;
    if (operatorId === viewerKey) continue;
    const lastReadAt = lastReadByRoom.get(room);
    const createdAt = message.created_at as string;
    if (!lastReadAt || new Date(createdAt).getTime() > new Date(lastReadAt).getTime()) {
      unreadByRoom.set(room, (unreadByRoom.get(room) ?? 0) + 1);
    }
  }

  return channels.map((channel) => ({
    ...channel,
    unreadCount: unreadByRoom.get(channel.room) ?? 0,
  }));
}

export async function listChannelsForViewer(
  input: {
    viewerType: "internal" | "client";
    operatorId?: string;
    clientKey?: string;
    viewerKey: string;
  },
  scope?: MessagingWorkspaceScope,
): Promise<MessageChannel[]> {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const all = await listChannels({ workspaceId });

  const filtered =
    input.viewerType === "client"
      ? all.filter(
          (channel) =>
            channel.channelType === "client" &&
            channel.memberClientUsernames.includes(input.clientKey ?? ""),
        )
      : all.filter(
          (channel) =>
            channel.channelType === "internal" ||
            (channel.channelType === "client" &&
              (!input.operatorId || channel.memberOperatorIds.includes(input.operatorId))),
        );

  return attachUnreadCounts(filtered, input.viewerKey, workspaceId);
}

export async function markChannelRead(
  viewerKey: string,
  room: string,
  scope?: MessagingWorkspaceScope,
) {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const supabase = requireMessagingSupabase();
  const { error } = await supabase.from("internal_message_read_state").upsert(
    {
      workspace_id: workspaceId,
      viewer_key: viewerKey,
      room,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,viewer_key,room" },
  );

  if (error) throw new Error(error.message);
}

export async function getUnreadTotal(viewerKey: string, scope?: MessagingWorkspaceScope) {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const supabase = requireMessagingSupabase();
  const { data: readStates, error: readError } = await supabase
    .from("internal_message_read_state")
    .select("room, last_read_at")
    .eq("workspace_id", workspaceId)
    .eq("viewer_key", viewerKey);

  if (readError) throw new Error(readError.message);

  const lastReadByRoom = new Map(
    (readStates ?? []).map((row) => [row.room as string, row.last_read_at as string]),
  );

  const { data: messages, error: messageError } = await supabase
    .from("internal_messages")
    .select("room, operator_id, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (messageError) throw new Error(messageError.message);

  const unreadRooms = new Set<string>();
  for (const message of messages ?? []) {
    const room = message.room as string;
    const operatorId = message.operator_id as string;
    if (operatorId === viewerKey) continue;
    const lastReadAt = lastReadByRoom.get(room);
    const createdAt = message.created_at as string;
    if (!lastReadAt || new Date(createdAt).getTime() > new Date(lastReadAt).getTime()) {
      unreadRooms.add(room);
    }
  }

  return unreadRooms.size;
}

export async function createChannel(
  input: {
    name: string;
    channelType?: MessageChannelType;
    clientKey?: string | null;
    createdByOperatorId: string;
    createdByOperatorName: string;
    memberOperatorIds: string[];
    memberClientUsernames?: string[];
    description?: string;
    isPrivate?: boolean;
  },
  scope?: MessagingWorkspaceScope,
): Promise<MessageChannel> {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const name = input.name.trim();
  if (!name) throw new Error("Channel name is required.");

  const channelType = input.channelType ?? "internal";
  const clientKey = channelType === "client" ? input.clientKey?.trim() || null : null;
  if (channelType === "client" && !clientKey) {
    throw new Error("Client selection is required for client channels.");
  }

  const members = Array.from(
    new Set([input.createdByOperatorId, ...input.memberOperatorIds.filter(Boolean)]),
  );
  const clientMembers =
    channelType === "client"
      ? Array.from(new Set([clientKey!, ...(input.memberClientUsernames ?? [])].filter(Boolean)))
      : [];

  const supabase = requireMessagingSupabase();
  const room = `${slugifyChannelName(name)}-${crypto.randomUUID().slice(0, 8)}`;

  const { data, error } = await supabase
    .from("internal_message_channels")
    .insert({
      workspace_id: workspaceId,
      room,
      name,
      channel_type: channelType,
      client_key: clientKey,
      created_by_operator_id: input.createdByOperatorId,
      created_by_operator_name: input.createdByOperatorName,
      member_operator_ids: members,
      member_client_usernames: clientMembers,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const channel = mapMessageChannel(data as DbChannel);

  const privacyLabel = input.isPrivate ? "Private channel" : "Channel";
  const descriptionLine = input.description?.trim()
    ? ` ${input.description.trim()}`
    : "";

  await sendMessage(
    {
      operatorId: "system",
      operatorName: "System",
      username: "system",
      content:
        channelType === "client"
          ? `${privacyLabel} created for ${clientKey} client collaboration.${descriptionLine}`
          : `${privacyLabel} created for internal team collaboration.${descriptionLine}`,
      room: channel.room,
      messageType: "system",
    },
    { workspaceId },
  );

  return channel;
}

async function requireChannelInWorkspace(
  channelId: string,
  workspaceId: string,
): Promise<MessageChannel> {
  const supabase = requireMessagingSupabase();
  const { data, error } = await supabase
    .from("internal_message_channels")
    .select("*")
    .eq("id", channelId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Channel not found.");
  return mapMessageChannel(data as DbChannel);
}

export async function updateChannelMembers(
  channelId: string,
  memberOperatorIds: string[],
  scope?: MessagingWorkspaceScope,
): Promise<MessageChannel> {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const members = Array.from(new Set(memberOperatorIds.filter(Boolean)));
  if (members.length === 0) {
    throw new Error("At least one member is required.");
  }

  await requireChannelInWorkspace(channelId, workspaceId);

  const supabase = requireMessagingSupabase();
  const { data, error } = await supabase
    .from("internal_message_channels")
    .update({ member_operator_ids: members })
    .eq("id", channelId)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapMessageChannel(data as DbChannel);
}

export async function deleteChannel(channelId: string, scope?: MessagingWorkspaceScope) {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const channel = await requireChannelInWorkspace(channelId, workspaceId);
  if (channel.room === INTERNAL_MESSAGING_ROOM) {
    throw new Error("The default internal operations room cannot be deleted.");
  }

  const supabase = requireMessagingSupabase();
  await supabase
    .from("internal_messages")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("room", channel.room);
  await supabase
    .from("internal_scheduled_calls")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("room", channel.room);
  await supabase
    .from("internal_message_read_state")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("room", channel.room);

  const { error: deleteError } = await supabase
    .from("internal_message_channels")
    .delete()
    .eq("id", channelId)
    .eq("workspace_id", workspaceId);

  if (deleteError) throw new Error(deleteError.message);
  return channel;
}

export async function cleanupUnit311Messaging(scope?: MessagingWorkspaceScope) {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const supabase = requireMessagingSupabase();
  const legacyOperatorIds = ["user-bcndrone", "user-1", "user-2", "user-3", "user-4", "user-5"];

  await supabase.from("internal_operators").delete().in("id", legacyOperatorIds);

  const mapped = await listChannels({ workspaceId });
  const toDelete = mapped.filter(
    (channel) =>
      channel.name === "Nick" ||
      (channel.channelType === "client" && channel.name !== "Test Channel"),
  );

  for (const channel of toDelete) {
    await deleteChannel(channel.id, { workspaceId });
  }

  const { data: activeOperators, error: operatorsError } = await supabase
    .from("internal_operators")
    .select("id")
    .eq("status", "Active")
    .order("full_name", { ascending: true });
  if (operatorsError) throw new Error(operatorsError.message);

  const memberIds = (activeOperators ?? []).map((row) => row.id as string);
  for (const channel of mapped) {
    if (channel.channelType !== "internal") continue;
    if (toDelete.some((entry) => entry.id === channel.id)) continue;
    await supabase
      .from("internal_message_channels")
      .update({ member_operator_ids: memberIds })
      .eq("id", channel.id)
      .eq("workspace_id", workspaceId);
  }

  return {
    deletedChannels: toDelete.map((channel) => channel.name),
    memberIds,
  };
}

export async function listScheduledCalls(
  room?: string,
  scope?: MessagingWorkspaceScope,
): Promise<ScheduledCall[]> {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const supabase = requireMessagingSupabase();
  let query = supabase
    .from("internal_scheduled_calls")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("scheduled_at", { ascending: true });

  if (room) {
    query = query.eq("room", room);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as DbScheduledCall[]).map(mapScheduledCall);
}

export async function createScheduledCall(
  input: {
    room: string;
    title: string;
    scheduledAt: string;
    participantOperatorIds: string[];
    callLink: string;
    callType: "voice" | "video";
    createdByOperatorId: string;
    createdByOperatorName: string;
  },
  scope?: MessagingWorkspaceScope,
): Promise<ScheduledCall> {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const title = input.title.trim();
  if (!title) throw new Error("Call title is required.");

  const supabase = requireMessagingSupabase();
  const { data, error } = await supabase
    .from("internal_scheduled_calls")
    .insert({
      workspace_id: workspaceId,
      room: input.room,
      title,
      scheduled_at: input.scheduledAt,
      participant_operator_ids: input.participantOperatorIds,
      call_link: input.callLink,
      call_type: input.callType,
      created_by_operator_id: input.createdByOperatorId,
      created_by_operator_name: input.createdByOperatorName,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapScheduledCall(data as DbScheduledCall);
}

export async function uploadMessagingAttachment(
  file: File,
  room: string,
  scope?: MessagingWorkspaceScope,
) {
  const workspaceId = await resolveMessagingWorkspaceId(scope);
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Attachments must be 10 MB or smaller.");
  }

  const supabase = requireMessagingSupabase();
  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
  const storagePath = `messaging/${workspaceId}/${room}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(INTERNAL_FILES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from(INTERNAL_FILES_BUCKET).getPublicUrl(storagePath);

  return {
    name: file.name,
    url: data.publicUrl,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  };
}
