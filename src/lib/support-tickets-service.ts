import {
  createBlankTicketInput,
  mapSupportTicket,
  type SupportTicket,
  type SupportTicketPriority,
} from "@/lib/support-data";
import {
  resolveSupportWorkspaceId,
  type SupportWorkspaceScope,
} from "@/lib/support-workspace";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type DbSupportTicket = Parameters<typeof mapSupportTicket>[0];

export type { SupportWorkspaceScope };

function requireSupportSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

function buildTicketPayload(input: Partial<SupportTicket>) {
  const payload: Record<string, string | boolean | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.organisation !== undefined) payload.organisation = input.organisation.trim();
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.description !== undefined) payload.description = input.description.trim();
  if (input.userAssigned !== undefined) {
    payload.user_assigned = input.userAssigned?.trim() || null;
  }
  if (input.clientPhone !== undefined) {
    payload.client_phone = input.clientPhone?.trim() || null;
  }
  if (input.clientPriorityLabel !== undefined) {
    payload.client_priority_label = input.clientPriorityLabel?.trim() || null;
  }
  if (input.archived !== undefined) payload.archived = input.archived;
  if (input.closed !== undefined) payload.closed = input.closed;

  return payload;
}

/** Global sequence keeps SUP-XXX IDs unique across tenants (PK is id alone). */
async function nextTicketId(): Promise<string> {
  const supabase = requireSupportSupabase();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const latest = data?.[0]?.id as string | undefined;
  const match = latest?.match(/^SUP-(\d+)$/);
  const nextNumber = match ? Number(match[1]) + 1 : 1;
  return `SUP-${String(nextNumber).padStart(3, "0")}`;
}

export async function listSupportTickets(
  includeArchived = true,
  scope?: SupportWorkspaceScope,
): Promise<SupportTicket[]> {
  const workspaceId = await resolveSupportWorkspaceId(scope);
  const supabase = requireSupportSupabase();
  let query = supabase
    .from("support_tickets")
    .select(
      "id,name,organisation,priority,description,user_assigned,client_phone,client_priority_label,archived,closed,created_at,updated_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (!includeArchived) {
    query = query.eq("archived", false);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as DbSupportTicket[]).map(mapSupportTicket);
}

export async function createSupportTicket(
  input: Partial<SupportTicket> & { name: string },
  scope?: SupportWorkspaceScope,
): Promise<SupportTicket> {
  const workspaceId = await resolveSupportWorkspaceId(scope);
  const supabase = requireSupportSupabase();
  const blank = createBlankTicketInput();
  const id = await nextTicketId();

  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      id,
      workspace_id: workspaceId,
      name: input.name.trim(),
      organisation: input.organisation?.trim() || "",
      priority: input.priority ?? blank.priority,
      description: input.description?.trim() || "",
      user_assigned: input.userAssigned?.trim() || null,
      client_phone: input.clientPhone?.trim() || null,
      client_priority_label: input.clientPriorityLabel?.trim() || null,
      archived: input.archived ?? false,
      closed: input.closed ?? false,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapSupportTicket(data as DbSupportTicket);
}

export async function getSupportTicket(
  id: string,
  scope?: SupportWorkspaceScope,
): Promise<SupportTicket | null> {
  const workspaceId = await resolveSupportWorkspaceId(scope);
  const supabase = requireSupportSupabase();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapSupportTicket(data as DbSupportTicket) : null;
}

export async function requireSupportTicketInWorkspace(
  id: string,
  scope?: SupportWorkspaceScope,
): Promise<SupportTicket> {
  const ticket = await getSupportTicket(id, scope);
  if (!ticket) throw new Error("Ticket not found.");
  return ticket;
}

export async function updateSupportTicket(
  id: string,
  patch: Partial<SupportTicket>,
  scope?: SupportWorkspaceScope,
): Promise<SupportTicket> {
  const workspaceId = await resolveSupportWorkspaceId(scope);
  await requireSupportTicketInWorkspace(id, { workspaceId });
  const supabase = requireSupportSupabase();
  const payload = buildTicketPayload(patch);

  const { data, error } = await supabase
    .from("support_tickets")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapSupportTicket(data as DbSupportTicket);
}

export async function deleteSupportTicket(id: string, scope?: SupportWorkspaceScope) {
  const workspaceId = await resolveSupportWorkspaceId(scope);
  await requireSupportTicketInWorkspace(id, { workspaceId });
  const supabase = requireSupportSupabase();
  const { error } = await supabase
    .from("support_tickets")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

export async function archiveSupportTicket(
  id: string,
  archived: boolean,
  scope?: SupportWorkspaceScope,
) {
  return updateSupportTicket(id, { archived }, scope);
}

export type { SupportTicketPriority };
