export const INFO_EMAIL_ADDRESS = "hello@unit311.com";
export const INFO_EMAIL_PROVIDER = "Egg Mail";

export type InfoEmailThreadStatus = "unread" | "open" | "replied" | "closed";

export type InfoEmailDirection = "inbound" | "outbound";

export type InfoEmailMessage = {
  id: string;
  threadId: string;
  direction: InfoEmailDirection;
  fromName: string;
  fromEmail: string;
  body: string;
  repliedByUserId: string | null;
  repliedByName: string | null;
  sentAt: string;
  createdAt: string;
};

export type InfoEmailThread = {
  id: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  receivedAt: string;
  status: InfoEmailThreadStatus;
  createdAt: string;
  updatedAt: string;
  messages: InfoEmailMessage[];
  replyCount: number;
  lastActivityAt: string;
};

type DbThread = {
  id: string;
  subject: string;
  from_name: string;
  from_email: string;
  received_at: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type DbMessage = {
  id: string;
  thread_id: string;
  direction: string;
  from_name: string;
  from_email: string;
  body: string;
  replied_by_user_id: string | null;
  replied_by_name: string | null;
  sent_at: string;
  created_at: string;
};

export function mapInfoEmailMessage(row: DbMessage): InfoEmailMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    direction: row.direction === "outbound" ? "outbound" : "inbound",
    fromName: row.from_name,
    fromEmail: row.from_email,
    body: row.body,
    repliedByUserId: row.replied_by_user_id,
    repliedByName: row.replied_by_name,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

export function mapInfoEmailThread(
  row: DbThread,
  messages: InfoEmailMessage[],
): InfoEmailThread {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );
  const lastActivityAt =
    sorted[sorted.length - 1]?.sentAt ?? row.received_at;
  const replyCount = sorted.filter((message) => message.direction === "outbound").length;
  const status = row.status as InfoEmailThreadStatus;

  return {
    id: row.id,
    subject: row.subject,
    fromName: row.from_name,
    fromEmail: row.from_email,
    receivedAt: row.received_at,
    status: status === "replied" || status === "closed" ? status : "open",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: sorted,
    replyCount,
    lastActivityAt,
  };
}

export function threadStatusLabel(status: InfoEmailThreadStatus) {
  switch (status) {
    case "unread":
      return "Unread";
    case "open":
      return "Awaiting reply";
    case "replied":
      return "Replied";
    case "closed":
      return "Closed";
  }
}

export function threadStatusClass(status: InfoEmailThreadStatus) {
  switch (status) {
    case "unread":
      return "border-sky-400/30 bg-sky-500/15 text-sky-200";
    case "open":
      return "border-amber-400/30 bg-amber-500/15 text-amber-200";
    case "replied":
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
    case "closed":
      return "border-white/15 bg-white/5 text-white/50";
  }
}

export function formatEmailDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatEmailDateLong(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
