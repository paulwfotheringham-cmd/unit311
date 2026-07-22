import {
  createSupabaseServiceRoleClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/server";

import type {
  AssistantBusinessContext,
  AssistantChatMessage,
  AssistantConversationRecord,
} from "./types";

const TABLE = "executive_assistant_conversations";

type DbRow = {
  id: string;
  title: string;
  user_id: string;
  workspace_id: string | null;
  organisation_id: string | null;
  messages: AssistantChatMessage[] | null;
  workspace_context: AssistantBusinessContext | null;
  is_saved?: boolean | null;
  created_at: string;
  updated_at: string;
};

let savedColumnReady: boolean | null = null;

function mapRow(row: DbRow): AssistantConversationRecord {
  return {
    id: row.id,
    title: row.title,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    organisationId: row.organisation_id,
    messages: Array.isArray(row.messages) ? row.messages : [],
    workspaceContext: row.workspace_context ?? null,
    isSaved: Boolean(row.is_saved),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapListRow(row: Omit<DbRow, "messages"> & { messages?: AssistantChatMessage[] | null }) {
  return {
    id: row.id,
    title: row.title,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    organisationId: row.organisation_id,
    messages: [],
    workspaceContext: row.workspace_context ?? null,
    isSaved: Boolean(row.is_saved),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies AssistantConversationRecord;
}

function requireClient() {
  if (!isSupabaseServiceRoleConfigured()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for conversation storage (RLS has no open policies).",
    );
  }
  return createSupabaseServiceRoleClient();
}

function isPersistedConversationId(conversationId: string | null | undefined): conversationId is string {
  if (!conversationId) return false;
  if (conversationId === "pending") return false;
  if (conversationId.startsWith("local_")) return false;
  return true;
}

export function createMessageId() {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function titleFromMessages(messages: AssistantChatMessage[]) {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser?.content.trim()) return "New conversation";
  const trimmed = firstUser.content.trim().replace(/\s+/g, " ");
  return trimmed.length <= 56 ? trimmed : `${trimmed.slice(0, 56).trimEnd()}…`;
}

async function ensureSavedColumn(supabase: ReturnType<typeof requireClient>) {
  if (savedColumnReady === true) return true;
  if (savedColumnReady === false) return false;

  const probe = await supabase.from(TABLE).select("is_saved").limit(1);
  if (!probe.error) {
    savedColumnReady = true;
    return true;
  }

  // Best-effort apply via Supabase Management API when available in the runtime.
  try {
    const { applyExecutiveAssistantSavedFlagMigration } = await import(
      "@/lib/internal-db-migrations"
    );
    const applied = await applyExecutiveAssistantSavedFlagMigration();
    if (applied) {
      const retry = await supabase.from(TABLE).select("is_saved").limit(1);
      savedColumnReady = !retry.error;
      return savedColumnReady;
    }
  } catch {
    // Column may already exist on environments without management token.
  }

  savedColumnReady = false;
  return false;
}

export async function listConversationsForUser(input: {
  userId: string;
  workspaceId?: string | null;
  limit?: number;
}): Promise<AssistantConversationRecord[]> {
  await ensureConversationTables();
  const supabase = requireClient();
  const hasSavedColumn = await ensureSavedColumn(supabase);
  const limit = input.limit ?? 40;

  if (!hasSavedColumn) {
    let query = supabase
      .from(TABLE)
      .select(
        "id, title, user_id, workspace_id, organisation_id, created_at, updated_at, workspace_context",
      )
      .eq("user_id", input.userId)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (input.workspaceId) query = query.eq("workspace_id", input.workspaceId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    // Without is_saved, only newly Save-created rows should appear going forward
    // (auto-create is disabled). Surface what exists so Save still works pre-migration.
    return ((data ?? []) as unknown as Array<Omit<DbRow, "messages">>).map((row) =>
      mapListRow({ ...row, is_saved: false }),
    );
  }

  let query = supabase
    .from(TABLE)
    .select(
      "id, title, user_id, workspace_id, organisation_id, created_at, updated_at, workspace_context, is_saved",
    )
    .eq("user_id", input.userId)
    .eq("is_saved", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (input.workspaceId) {
    query = query.eq("workspace_id", input.workspaceId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Array<Omit<DbRow, "messages">>).map(mapListRow);
}

export async function getConversationForUser(
  conversationId: string,
  userId: string,
): Promise<AssistantConversationRecord | null> {
  if (!isPersistedConversationId(conversationId)) return null;
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as DbRow) : null;
}

export async function createConversation(input: {
  userId: string;
  workspaceId?: string | null;
  organisationId?: string | null;
  title?: string;
  messages?: AssistantChatMessage[];
  workspaceContext?: AssistantBusinessContext | null;
  isSaved?: boolean;
}): Promise<AssistantConversationRecord> {
  await ensureConversationTables();
  const supabase = requireClient();
  const hasSavedColumn = await ensureSavedColumn(supabase);
  const now = new Date().toISOString();
  const messages = input.messages ?? [];
  const payload: Record<string, unknown> = {
    title: input.title ?? titleFromMessages(messages) ?? "New conversation",
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    organisation_id: input.organisationId ?? null,
    messages,
    workspace_context: input.workspaceContext ?? null,
    created_at: now,
    updated_at: now,
  };
  if (hasSavedColumn) {
    payload.is_saved = input.isSaved ?? true;
  }

  const { data, error } = await supabase.from(TABLE).insert(payload).select("*").single();

  if (error) throw new Error(error.message);
  return mapRow(data as DbRow);
}

export async function updateConversation(input: {
  conversationId: string;
  userId: string;
  title?: string;
  messages?: AssistantChatMessage[];
  workspaceContext?: AssistantBusinessContext | null;
  isSaved?: boolean;
}): Promise<AssistantConversationRecord> {
  if (!isPersistedConversationId(input.conversationId)) {
    throw new Error("Conversation is not persisted yet. Press Save Chat first.");
  }
  const supabase = requireClient();
  const hasSavedColumn = await ensureSavedColumn(supabase);
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) patch.title = input.title;
  if (input.messages !== undefined) {
    patch.messages = input.messages;
    if (input.title === undefined) {
      patch.title = titleFromMessages(input.messages);
    }
  }
  if (input.workspaceContext !== undefined) {
    patch.workspace_context = input.workspaceContext;
  }
  if (hasSavedColumn && input.isSaved !== undefined) {
    patch.is_saved = input.isSaved;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", input.conversationId)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as DbRow);
}

export async function renameConversation(input: {
  conversationId: string;
  userId: string;
  title: string;
}): Promise<AssistantConversationRecord> {
  return updateConversation({
    conversationId: input.conversationId,
    userId: input.userId,
    title: input.title.trim() || "New conversation",
  });
}

export async function deleteConversation(input: {
  conversationId: string;
  userId: string;
}): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", input.conversationId)
    .eq("user_id", input.userId);
  if (error) throw new Error(error.message);
}

export { isPersistedConversationId };

export async function ensureConversationTables(): Promise<boolean> {
  if (!isSupabaseServiceRoleConfigured()) return false;
  try {
    // Tables are created by supabase/migrations/101_executive_assistant_conversations.sql
    // (and 102 for trust / 106 for is_saved). Probe availability; do not auto-apply base migrations here.
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase.from(TABLE).select("id").limit(1);
    if (error) return false;
    await ensureSavedColumn(supabase);
    return true;
  } catch {
    return false;
  }
}
