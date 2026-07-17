import {
  INFO_EMAIL_ADDRESS,
  mapInfoEmailMessage,
  mapInfoEmailThread,
  type InfoEmailThread,
} from "@/lib/info-email-data";
import { resolveEmailWorkspaceId, type EmailWorkspaceScope } from "@/lib/email-workspace";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type DbThread = Parameters<typeof mapInfoEmailThread>[0];
type DbMessage = Parameters<typeof mapInfoEmailMessage>[0];

function requireInfoEmailSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

async function loadMessagesForThreads(threadIds: string[], workspaceId: string) {
  if (threadIds.length === 0) return new Map<string, ReturnType<typeof mapInfoEmailMessage>[]>();

  const supabase = requireInfoEmailSupabase();
  const { data, error } = await supabase
    .from("internal_info_email_messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("thread_id", threadIds)
    .order("sent_at", { ascending: true });

  if (error) throw new Error(error.message);

  const map = new Map<string, ReturnType<typeof mapInfoEmailMessage>[]>();
  for (const row of (data ?? []) as DbMessage[]) {
    const message = mapInfoEmailMessage(row);
    const list = map.get(message.threadId) ?? [];
    list.push(message);
    map.set(message.threadId, list);
  }
  return map;
}

export async function listInfoEmailThreads(
  scope?: EmailWorkspaceScope,
): Promise<InfoEmailThread[]> {
  const workspaceId = await resolveEmailWorkspaceId(scope);
  const supabase = requireInfoEmailSupabase();
  const { data, error } = await supabase
    .from("internal_info_email_threads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("received_at", { ascending: false });

  if (error) throw new Error(error.message);

  const threads = (data ?? []) as DbThread[];
  const messagesByThread = await loadMessagesForThreads(
    threads.map((thread) => thread.id),
    workspaceId,
  );

  return threads.map((thread) =>
    mapInfoEmailThread(thread, messagesByThread.get(thread.id) ?? []),
  );
}

export async function getInfoEmailThread(
  id: string,
  scope?: EmailWorkspaceScope,
): Promise<InfoEmailThread | null> {
  const workspaceId = await resolveEmailWorkspaceId(scope);
  const supabase = requireInfoEmailSupabase();
  const { data, error } = await supabase
    .from("internal_info_email_threads")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const messagesByThread = await loadMessagesForThreads([id], workspaceId);
  return mapInfoEmailThread(data as DbThread, messagesByThread.get(id) ?? []);
}

export async function addInfoEmailReply(
  input: {
    threadId: string;
    body: string;
    repliedByUserId: string;
    repliedByName: string;
  },
  scope?: EmailWorkspaceScope,
): Promise<InfoEmailThread> {
  const workspaceId = await resolveEmailWorkspaceId(scope);
  const existing = await getInfoEmailThread(input.threadId, { workspaceId });
  if (!existing) throw new Error("Thread not found.");

  const supabase = requireInfoEmailSupabase();
  const now = new Date().toISOString();

  const { error: messageError } = await supabase.from("internal_info_email_messages").insert({
    workspace_id: workspaceId,
    thread_id: input.threadId,
    direction: "outbound",
    from_name: input.repliedByName,
    from_email: INFO_EMAIL_ADDRESS,
    body: input.body.trim(),
    replied_by_user_id: input.repliedByUserId,
    replied_by_name: input.repliedByName,
    sent_at: now,
  });

  if (messageError) throw new Error(messageError.message);

  const { error: threadError } = await supabase
    .from("internal_info_email_threads")
    .update({ status: "replied", updated_at: now })
    .eq("id", input.threadId)
    .eq("workspace_id", workspaceId);

  if (threadError) throw new Error(threadError.message);

  const thread = await getInfoEmailThread(input.threadId, { workspaceId });
  if (!thread) throw new Error("Thread not found after reply");
  return thread;
}
