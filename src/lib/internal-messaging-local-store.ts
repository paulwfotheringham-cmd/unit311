import {
  INTERNAL_MESSAGING_ROOM,
  slugifyChannelName,
  type ChatMessage,
  type MessageChannel,
  type MessageChannelType,
  type MessageType,
} from "@/lib/internal-messaging-data";
import { createInitialUsers } from "@/lib/user-management-data";

const operators = createInitialUsers();

function nowIso() {
  return new Date().toISOString();
}

function createDefaultChannel(): MessageChannel {
  return {
    id: "local-default",
    room: INTERNAL_MESSAGING_ROOM,
    name: "Internal Operations Room",
    channelType: "internal",
    clientKey: null,
    createdByOperatorId: operators[0]?.id ?? "user-1",
    createdByOperatorName: operators[0]?.fullName ?? "Operator",
    memberOperatorIds: operators.map((operator) => operator.id),
    memberClientUsernames: [],
    createdAt: nowIso(),
    unreadCount: 0,
  };
}

const channels = new Map<string, MessageChannel>();
const messagesByRoom = new Map<string, ChatMessage[]>();
const readState = new Map<string, string>();

channels.set(INTERNAL_MESSAGING_ROOM, createDefaultChannel());
messagesByRoom.set(INTERNAL_MESSAGING_ROOM, []);

function channelRecord(id: string, input: Omit<MessageChannel, "id" | "createdAt" | "unreadCount">): MessageChannel {
  const channel: MessageChannel = {
    ...input,
    id,
    createdAt: nowIso(),
    unreadCount: 0,
  };
  channels.set(channel.room, channel);
  if (!messagesByRoom.has(channel.room)) {
    messagesByRoom.set(channel.room, []);
  }
  return channel;
}

function attachUnreadCounts(channelList: MessageChannel[], viewerKey: string): MessageChannel[] {
  return channelList.map((channel) => {
    const lastReadAt = readState.get(`${viewerKey}:${channel.room}`);
    const roomMessages = messagesByRoom.get(channel.room) ?? [];
    const unreadCount = roomMessages.filter((message) => {
      if (message.operatorId === viewerKey) return false;
      if (!lastReadAt) return true;
      return new Date(message.createdAt).getTime() > new Date(lastReadAt).getTime();
    }).length;
    return { ...channel, unreadCount };
  });
}

export function localListChannelsForViewer(input: {
  viewerType: "internal" | "client";
  operatorId?: string;
  clientKey?: string;
  viewerKey: string;
}): MessageChannel[] {
  const all = Array.from(channels.values());

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

  return attachUnreadCounts(filtered, input.viewerKey);
}

export function localCreateChannel(input: {
  name: string;
  channelType?: MessageChannelType;
  clientKey?: string | null;
  createdByOperatorId: string;
  createdByOperatorName: string;
  memberOperatorIds: string[];
  memberClientUsernames?: string[];
  description?: string;
  isPrivate?: boolean;
}): MessageChannel {
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

  const room = `${slugifyChannelName(name)}-${crypto.randomUUID().slice(0, 8)}`;
  const channel = channelRecord(`local-${room}`, {
    room,
    name,
    channelType,
    clientKey,
    createdByOperatorId: input.createdByOperatorId,
    createdByOperatorName: input.createdByOperatorName,
    memberOperatorIds: members,
    memberClientUsernames: clientMembers,
  });

  const privacyLabel = input.isPrivate ? "Private channel" : "Channel";
  const descriptionLine = input.description?.trim() ? ` ${input.description.trim()}` : "";

  localSendMessage({
    operatorId: "system",
    operatorName: "System",
    username: "system",
    content:
      channelType === "client"
        ? `${privacyLabel} created for ${clientKey} client collaboration.${descriptionLine}`
        : `${privacyLabel} created for internal team collaboration.${descriptionLine}`,
    room: channel.room,
    messageType: "system",
  });

  return channel;
}

export function localUpdateChannelMembers(
  channelId: string,
  memberOperatorIds: string[],
): MessageChannel {
  const members = Array.from(new Set(memberOperatorIds.filter(Boolean)));
  if (members.length === 0) {
    throw new Error("At least one member is required.");
  }

  const channel = Array.from(channels.values()).find((entry) => entry.id === channelId);
  if (!channel) throw new Error("Channel not found.");

  const updated = { ...channel, memberOperatorIds: members };
  channels.set(channel.room, updated);
  return updated;
}

export function localDeleteChannel(channelId: string) {
  const channel = Array.from(channels.values()).find((entry) => entry.id === channelId);
  if (!channel) throw new Error("Channel not found.");
  if (channel.room === INTERNAL_MESSAGING_ROOM) {
    throw new Error("The default internal operations room cannot be deleted.");
  }

  channels.delete(channel.room);
  messagesByRoom.delete(channel.room);
  for (const key of readState.keys()) {
    if (key.endsWith(`:${channel.room}`)) readState.delete(key);
  }
  return channel;
}

export function localMarkChannelRead(viewerKey: string, room: string) {
  readState.set(`${viewerKey}:${room}`, nowIso());
}

export function localListMessages(options?: { room?: string; limit?: number }): ChatMessage[] {
  const room = options?.room ?? INTERNAL_MESSAGING_ROOM;
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 200);
  const messages = messagesByRoom.get(room) ?? [];
  return messages.slice(-limit);
}

export function localSendMessage(input: {
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
}): ChatMessage {
  const trimmed = input.content.trim();
  const hasAttachment = Boolean(input.attachmentUrl);
  if (!trimmed && !hasAttachment && input.messageType !== "call" && input.messageType !== "system") {
    throw new Error("Message cannot be empty.");
  }

  const room = input.room ?? INTERNAL_MESSAGING_ROOM;
  if (!channels.has(room)) {
    throw new Error("Channel not found.");
  }

  const message: ChatMessage = {
    id: `local-msg-${crypto.randomUUID()}`,
    room,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    username: input.username,
    content: trimmed || input.attachmentName || "Attachment",
    messageType: input.messageType ?? (hasAttachment ? "file" : "text"),
    attachmentName: input.attachmentName ?? null,
    attachmentUrl: input.attachmentUrl ?? null,
    attachmentMime: input.attachmentMime ?? null,
    callLink: input.callLink ?? null,
    createdAt: nowIso(),
  };

  const roomMessages = messagesByRoom.get(room) ?? [];
  roomMessages.push(message);
  messagesByRoom.set(room, roomMessages);
  return message;
}

export function localListScheduledCalls() {
  return [];
}

export function localCreateScheduledCall() {
  throw new Error("Scheduled calls require Supabase in this environment.");
}
