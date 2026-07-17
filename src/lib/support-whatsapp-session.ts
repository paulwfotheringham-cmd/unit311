import {
  resolveSupportWorkspaceId,
  type SupportWorkspaceScope,
} from "@/lib/support-workspace";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getWhatsAppNotifyPhone } from "@/lib/whatsapp/client";

export type WhatsAppSupportSessionStep =
  | "awaiting_name"
  | "awaiting_organisation"
  | "awaiting_priority"
  | "awaiting_description"
  | "awaiting_assignment";

export type WhatsAppSupportSession = {
  phone: string;
  ticketId: string;
  step: WhatsAppSupportSessionStep;
  updatedAt: string;
};

type DbSession = {
  phone: string;
  ticket_id: string;
  step: WhatsAppSupportSessionStep;
  updated_at: string;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function mapSession(row: DbSession): WhatsAppSupportSession {
  return {
    phone: row.phone,
    ticketId: row.ticket_id,
    step: row.step,
    updatedAt: row.updated_at,
  };
}

export function resolveWhatsAppSessionPhone(phone?: string | null) {
  return (phone ?? getWhatsAppNotifyPhone()).replace(/\D/g, "") || getWhatsAppNotifyPhone();
}

export async function getWhatsAppSupportSession(
  phone?: string | null,
  scope?: SupportWorkspaceScope,
): Promise<WhatsAppSupportSession | null> {
  const workspaceId = await resolveSupportWorkspaceId(scope);
  const supabase = requireSupabase();
  const normalizedPhone = resolveWhatsAppSessionPhone(phone);

  const { data, error } = await supabase
    .from("whatsapp_support_sessions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapSession(data as DbSession) : null;
}

export async function upsertWhatsAppSupportSession(
  input: {
    phone?: string | null;
    ticketId: string;
    step: WhatsAppSupportSessionStep;
  },
  scope?: SupportWorkspaceScope,
) {
  const workspaceId = await resolveSupportWorkspaceId(scope);
  const supabase = requireSupabase();
  const normalizedPhone = resolveWhatsAppSessionPhone(input.phone);

  const { data, error } = await supabase
    .from("whatsapp_support_sessions")
    .upsert(
      {
        workspace_id: workspaceId,
        phone: normalizedPhone,
        ticket_id: input.ticketId,
        step: input.step,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,phone" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapSession(data as DbSession);
}

export async function clearWhatsAppSupportSession(
  phone?: string | null,
  scope?: SupportWorkspaceScope,
) {
  const workspaceId = await resolveSupportWorkspaceId(scope);
  const supabase = requireSupabase();
  const normalizedPhone = resolveWhatsAppSessionPhone(phone);

  const { error } = await supabase
    .from("whatsapp_support_sessions")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("phone", normalizedPhone);

  if (error) throw new Error(error.message);
}
