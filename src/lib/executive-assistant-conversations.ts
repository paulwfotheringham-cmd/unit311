export type ExecutiveChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ExecutiveSavedConversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ExecutiveChatMessage[];
};

const STORAGE_KEY_PREFIX = "unit311-executive-assistant-conversations";

/** @deprecated Prefer workspace-scoped key via storageKeyForWorkspace. */
export const EXECUTIVE_ASSISTANT_CONVERSATIONS_KEY = STORAGE_KEY_PREFIX;

export const EXECUTIVE_ASSISTANT_WELCOME: ExecutiveChatMessage = {
  role: "assistant",
  content:
    "I'm your executive assistant for this workspace. Ask about pipeline, projects, finance, or operations.",
};

function storageKeyForWorkspace(workspaceId?: string | null) {
  const id = workspaceId?.trim();
  return id ? `${STORAGE_KEY_PREFIX}:${id}` : STORAGE_KEY_PREFIX;
}

export function createConversationId() {
  return `conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function conversationTitleFromMessages(messages: ExecutiveChatMessage[]) {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return "New conversation";

  const trimmed = firstUser.content.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 48) return trimmed;
  return `${trimmed.slice(0, 48).trimEnd()}…`;
}

export function formatConversationUpdatedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function loadExecutiveConversations(
  workspaceId?: string | null,
): ExecutiveSavedConversation[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(storageKeyForWorkspace(workspaceId));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as ExecutiveSavedConversation[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (conversation) =>
        conversation &&
        typeof conversation.id === "string" &&
        Array.isArray(conversation.messages) &&
        conversation.messages.length > 0,
    );
  } catch {
    return [];
  }
}

export function saveExecutiveConversations(
  conversations: ExecutiveSavedConversation[],
  workspaceId?: string | null,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKeyForWorkspace(workspaceId), JSON.stringify(conversations));
}
