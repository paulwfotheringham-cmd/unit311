export const INTERNAL_MESSAGING_ROOM = "internal-ops";
export const SUPPORT_MESSAGING_ROOM = "support-desk";
export const ENQUIRIES_MESSAGING_ROOM = "enquiries";
export const ENQUIRIES_CHANNEL_NAME = "Enquiries";

export const MESSAGING_STORAGE_KEY = "dc-messaging-operator-id";
export const MESSAGING_ACTIVE_CHANNEL_KEY = "dc-messaging-active-channel";

export type MessageType = "text" | "file" | "call" | "system";

export type ChatMessage = {
  id: string;
  room: string;
  operatorId: string;
  operatorName: string;
  username: string;
  content: string;
  messageType: MessageType;
  attachmentName: string | null;
  attachmentUrl: string | null;
  attachmentMime: string | null;
  callLink: string | null;
  createdAt: string;
};

export type MessagingParticipant = {
  operatorId: string;
  operatorName: string;
  username: string;
  joinedAt: string;
};

export type MessageChannelType = "internal" | "client";

export type MessageChannel = {
  id: string;
  room: string;
  name: string;
  channelType: MessageChannelType;
  clientKey: string | null;
  createdByOperatorId: string;
  createdByOperatorName: string;
  memberOperatorIds: string[];
  memberClientUsernames: string[];
  createdAt: string;
  unreadCount?: number;
};

export type ScheduledCall = {
  id: string;
  room: string;
  title: string;
  scheduledAt: string;
  participantOperatorIds: string[];
  callLink: string;
  callType: "voice" | "video";
  createdByOperatorId: string;
  createdByOperatorName: string;
  createdAt: string;
};

type DbMessage = {
  id: string;
  room: string;
  operator_id: string;
  operator_name: string;
  username: string;
  content: string;
  message_type?: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  attachment_mime?: string | null;
  call_link?: string | null;
  created_at: string;
};

type DbChannel = {
  id: string;
  room: string;
  name: string;
  channel_type?: string | null;
  client_key?: string | null;
  created_by_operator_id: string;
  created_by_operator_name: string;
  member_operator_ids: string[];
  member_client_usernames?: string[] | null;
  created_at: string;
};

type DbScheduledCall = {
  id: string;
  room: string;
  title: string;
  scheduled_at: string;
  participant_operator_ids: string[];
  call_link: string;
  call_type: string;
  created_by_operator_id: string;
  created_by_operator_name: string;
  created_at: string;
};

function parseMessageType(value: string | null | undefined): MessageType {
  if (value === "file" || value === "call" || value === "system") return value;
  return "text";
}

function parseCallType(value: string | null | undefined): "voice" | "video" {
  return value === "voice" ? "voice" : "video";
}

export function mapChatMessage(row: DbMessage): ChatMessage {
  const messageType = parseMessageType(row.message_type);
  return {
    id: row.id,
    room: row.room,
    operatorId: row.operator_id,
    operatorName: normalizeMessageSenderName({
      messageType,
      username: row.username,
      operatorName: row.operator_name,
    }),
    username: row.username,
    content: row.content,
    messageType,
    attachmentName: row.attachment_name ?? null,
    attachmentUrl: row.attachment_url ?? null,
    attachmentMime: row.attachment_mime ?? null,
    callLink: row.call_link ?? null,
    createdAt: row.created_at,
  };
}

export function mapMessageChannel(row: DbChannel): MessageChannel {
  return {
    id: row.id,
    room: row.room,
    name: row.name,
    channelType: row.channel_type === "client" ? "client" : "internal",
    clientKey: row.client_key ?? null,
    createdByOperatorId: row.created_by_operator_id,
    createdByOperatorName: row.created_by_operator_name,
    memberOperatorIds: row.member_operator_ids ?? [],
    memberClientUsernames: row.member_client_usernames ?? [],
    createdAt: row.created_at,
  };
}

export function mapScheduledCall(row: DbScheduledCall): ScheduledCall {
  return {
    id: row.id,
    room: row.room,
    title: row.title,
    scheduledAt: row.scheduled_at,
    participantOperatorIds: row.participant_operator_ids ?? [],
    callLink: row.call_link,
    callType: parseCallType(row.call_type),
    createdByOperatorId: row.created_by_operator_id,
    createdByOperatorName: row.created_by_operator_name,
    createdAt: row.created_at,
  };
}

export function normalizeMessageSenderName(input: {
  messageType: MessageType;
  username: string;
  operatorName: string;
}): string {
  if (input.messageType === "system" || input.username === "system") {
    return "System";
  }

  if (input.operatorName === "Unit311 Operations" || input.operatorName === "BCN Operations") {
    return "System";
  }

  return input.operatorName;
}

export function formatMessageSenderName(
  message: Pick<ChatMessage, "messageType" | "username" | "operatorName">,
) {
  return normalizeMessageSenderName(message);
}

export function formatMessageTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatScheduledCallTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slugifyChannelName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "channel";
}

import { CENTRAL_SITE_URL } from "@/lib/app-domains";

export function generateCallLink(type: "voice" | "video") {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `${CENTRAL_SITE_URL}/meet/${type}/${id}`;
}

export function buildScheduledCallDateTime(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}
