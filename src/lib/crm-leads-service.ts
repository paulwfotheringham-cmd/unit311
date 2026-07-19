import { createBlankLeadInput, mapCrmLead, type CrmLead, type LeadStatus } from "@/lib/crm-data";
import {
  extractClientReportPatch,
  mergeClientReportNotes,
  parseClientReportFromNotes,
  stripClientReportDbColumns,
} from "@/lib/crm-client-report-notes";
import { isMissingCrmClientReportColumnError } from "@/lib/crm-client-report-schema";
import { promoteCrmLeadToClient } from "@/lib/crm-lead-client-service";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

type DbLead = Parameters<typeof mapCrmLead>[0];

export type CrmWorkspaceScope = {
  /** Explicit override for system/provisioning/cron callers. Prefer omit to use session context. */
  workspaceId?: string | null;
};

function requireCrmSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

/**
 * Resolve the tenant key for CRM module operations.
 * Uses requireCurrentWorkspace() unless an explicit workspaceId is provided.
 */
export async function resolveCrmWorkspaceId(scope?: CrmWorkspaceScope): Promise<string> {
  const explicit = scope?.workspaceId?.trim();
  if (explicit) return explicit;
  const workspace = await requireCurrentWorkspace();
  return workspace.id;
}

export async function listLeads(
  status?: LeadStatus | "All",
  scope?: CrmWorkspaceScope,
): Promise<CrmLead[]> {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  const supabase = requireCrmSupabase();
  let query = supabase
    .from("crm_leads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (status && status !== "All") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as DbLead[]).map(mapCrmLead);
}

export async function getLeadById(
  id: string,
  scope?: CrmWorkspaceScope,
): Promise<CrmLead | null> {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  const supabase = requireCrmSupabase();
  const { data, error } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapCrmLead(data as DbLead) : null;
}

/** Throws if the lead is missing or belongs to another workspace. */
export async function requireLeadInWorkspace(
  id: string,
  scope?: CrmWorkspaceScope,
): Promise<CrmLead> {
  const lead = await getLeadById(id, scope);
  if (!lead) {
    throw new Error("Lead not found.");
  }
  return lead;
}

/**
 * Capability-token / invite / public report-chat path.
 * Does not require a platform session — caller must already authorize via token/invite.
 */
export async function getLeadByIdForCapability(id: string): Promise<CrmLead | null> {
  const supabase = requireCrmSupabase();
  const { data, error } = await supabase.from("crm_leads").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapCrmLead(data as DbLead) : null;
}

export async function getLeadByReportChatToken(token: string): Promise<CrmLead | null> {
  const normalized = token.trim();
  if (!normalized) return null;

  const supabase = requireCrmSupabase();
  const { data, error } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("client_chat_access_token", normalized)
    .maybeSingle();

  if (error) {
    if (isMissingCrmClientReportColumnError(error.message)) {
      const { data: rows, error: listError } = await supabase.from("crm_leads").select("*");
      if (listError) throw new Error(listError.message);
      const match = (rows as DbLead[]).find((row) => {
        const fallback = parseClientReportFromNotes(row.notes);
        return fallback?.clientChatAccessToken === normalized;
      });
      return match ? mapCrmLead(match) : null;
    }
    throw new Error(error.message);
  }

  return data ? mapCrmLead(data as DbLead) : null;
}

export async function createLead(
  input: Partial<ReturnType<typeof createBlankLeadInput>> & {
    companyName: string;
    contactName: string;
    workspaceId?: string;
  },
  scope?: CrmWorkspaceScope,
): Promise<CrmLead> {
  const workspaceId = await resolveCrmWorkspaceId({
    workspaceId: input.workspaceId ?? scope?.workspaceId,
  });
  const supabase = requireCrmSupabase();
  const { data, error } = await supabase
    .from("crm_leads")
    .insert({
      workspace_id: workspaceId,
      company_name: input.companyName.trim(),
      contact_name: input.contactName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      status: input.status ?? "Cold",
      source: input.source?.trim() || null,
      next_action: input.nextAction?.trim() || null,
      next_action_date: input.nextActionDate || null,
      estimated_value: input.estimatedValue ?? null,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCrmLead(data as DbLead);
}

export async function updateLead(
  id: string,
  patch: Partial<{
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    status: LeadStatus;
    source: string;
    nextAction: string;
    nextActionDate: string | null;
    estimatedValue: number | null;
    notes: string;
    discoveryNotes: string;
    clientReportFileId: string | null;
    clientReportFileName: string | null;
    clientReportGeneratedAt: string | null;
    clientReportPptFileId: string | null;
    clientReportPptFileName: string | null;
    clientReportSentAt: string | null;
    clientReportMessageId: string | null;
    clientReportRepliedAt: string | null;
    clientReportReminder7dSentAt: string | null;
    clientReportReminder14dSentAt: string | null;
    clientReportLastReminderSentAt: string | null;
    clientChatRoom: string | null;
    clientChatKey: string | null;
    clientChatAccessToken: string | null;
    companyLogoFileId: string | null;
    companyLogoFileName: string | null;
  }>,
  scope?: CrmWorkspaceScope,
): Promise<CrmLead> {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  await requireLeadInWorkspace(id, { workspaceId });
  const supabase = requireCrmSupabase();
  const payload: Record<string, string | number | null> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.companyName !== undefined) payload.company_name = patch.companyName.trim();
  if (patch.contactName !== undefined) payload.contact_name = patch.contactName.trim();
  if (patch.email !== undefined) payload.email = patch.email.trim() || null;
  if (patch.phone !== undefined) payload.phone = patch.phone.trim() || null;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.source !== undefined) payload.source = patch.source.trim() || null;
  if (patch.nextAction !== undefined) payload.next_action = patch.nextAction.trim() || null;
  if (patch.nextActionDate !== undefined) payload.next_action_date = patch.nextActionDate;
  if (patch.estimatedValue !== undefined) payload.estimated_value = patch.estimatedValue;
  if (patch.notes !== undefined) payload.notes = patch.notes.trim() || null;
  if (patch.discoveryNotes !== undefined) {
    payload.discovery_notes = patch.discoveryNotes.trim() || null;
  }
  if (patch.clientReportFileId !== undefined) {
    payload.client_report_file_id = patch.clientReportFileId;
  }
  if (patch.clientReportFileName !== undefined) {
    payload.client_report_file_name = patch.clientReportFileName?.trim() || null;
  }
  if (patch.clientReportGeneratedAt !== undefined) {
    payload.client_report_generated_at = patch.clientReportGeneratedAt;
  }
  if (patch.clientReportPptFileId !== undefined) {
    payload.client_report_ppt_file_id = patch.clientReportPptFileId;
  }
  if (patch.clientReportPptFileName !== undefined) {
    payload.client_report_ppt_file_name = patch.clientReportPptFileName?.trim() || null;
  }
  if (patch.clientReportSentAt !== undefined) {
    payload.client_report_sent_at = patch.clientReportSentAt;
  }
  if (patch.clientReportMessageId !== undefined) {
    payload.client_report_message_id = patch.clientReportMessageId?.trim() || null;
  }
  if (patch.clientReportRepliedAt !== undefined) {
    payload.client_report_replied_at = patch.clientReportRepliedAt;
  }
  if (patch.clientReportReminder7dSentAt !== undefined) {
    payload.client_report_reminder_7d_sent_at = patch.clientReportReminder7dSentAt;
  }
  if (patch.clientReportReminder14dSentAt !== undefined) {
    payload.client_report_reminder_14d_sent_at = patch.clientReportReminder14dSentAt;
  }
  if (patch.clientReportLastReminderSentAt !== undefined) {
    payload.client_report_last_reminder_sent_at = patch.clientReportLastReminderSentAt;
  }
  if (patch.clientChatRoom !== undefined) {
    payload.client_chat_room = patch.clientChatRoom?.trim() || null;
  }
  if (patch.clientChatKey !== undefined) {
    payload.client_chat_key = patch.clientChatKey?.trim() || null;
  }
  if (patch.clientChatAccessToken !== undefined) {
    payload.client_chat_access_token = patch.clientChatAccessToken?.trim() || null;
  }
  if (patch.companyLogoFileId !== undefined) {
    payload.company_logo_file_id = patch.companyLogoFileId;
  }
  if (patch.companyLogoFileName !== undefined) {
    payload.company_logo_file_name = patch.companyLogoFileName?.trim() || null;
  }

  const clientReportMetadata = extractClientReportPatch(patch);

  let { data, error } = await supabase
    .from("crm_leads")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error && clientReportMetadata && isMissingCrmClientReportColumnError(error.message)) {
    const { data: existingRow, error: existingError } = await supabase
      .from("crm_leads")
      .select("notes")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    const fallbackPayload = stripClientReportDbColumns(payload);
    fallbackPayload.notes = mergeClientReportNotes(
      existingRow?.notes ?? "",
      clientReportMetadata,
      patch.notes,
    );

    ({ data, error } = await supabase
      .from("crm_leads")
      .update(fallbackPayload)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single());
  }

  if (error) throw new Error(error.message);
  const lead = mapCrmLead(data as DbLead);

  if (patch.status === "Won") {
    try {
      await promoteCrmLeadToClient(id, { workspaceId });
    } catch {
      // Lead save should succeed even if client directory sync fails temporarily.
    }
  }

  return lead;
}

export async function listLeadsAwaitingReportFollowup(
  scope?: CrmWorkspaceScope,
): Promise<CrmLead[]> {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  const supabase = requireCrmSupabase();
  const { data, error } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .not("client_report_sent_at", "is", null)
    .is("client_report_replied_at", null)
    .order("client_report_sent_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as DbLead[]).map(mapCrmLead);
}

/**
 * Platform cron path — lists awaiting follow-ups across all workspaces.
 * Callers must pass each lead's workspaceId into updateLead.
 */
export async function listLeadsAwaitingReportFollowupAcrossWorkspaces(): Promise<CrmLead[]> {
  const supabase = requireCrmSupabase();
  const { data, error } = await supabase
    .from("crm_leads")
    .select("*")
    .not("client_report_sent_at", "is", null)
    .is("client_report_replied_at", null)
    .order("client_report_sent_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as DbLead[]).map(mapCrmLead);
}

export async function deleteLead(id: string, scope?: CrmWorkspaceScope) {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  await requireLeadInWorkspace(id, { workspaceId });
  const supabase = requireCrmSupabase();
  const { error } = await supabase
    .from("crm_leads")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}
