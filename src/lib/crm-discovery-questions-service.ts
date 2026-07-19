import {
  buildDiscoveryQuestionnaireNotes,
  normalizeDiscoveryQuestionnaire,
  parseDiscoveryQuestionnaireFromNotes,
  type DiscoveryQuestionnaireData,
} from "@/lib/discovery-questions-data";
import { getLeadById, updateLead } from "@/lib/crm-leads-service";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type DbLeadRow = {
  discovery_questionnaire?: unknown;
  notes?: string | null;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

function isMissingDiscoveryQuestionnaireColumn(message: string) {
  return (
    message.includes("discovery_questionnaire") &&
    (message.includes("does not exist") || message.includes("Could not find"))
  );
}

function mergeNotesWithQuestionnaire(
  existingNotes: string,
  questionnaire: DiscoveryQuestionnaireData,
) {
  const withoutBlock = existingNotes
    .replace(/Discovery questionnaire JSON:[\s\S]*/u, "")
    .trim();
  const block = buildDiscoveryQuestionnaireNotes(questionnaire);
  return withoutBlock ? `${withoutBlock}\n\n${block}` : block;
}

export async function getDiscoveryQuestionnaire(
  leadId: string,
): Promise<DiscoveryQuestionnaireData | null> {
  const lead = await getLeadById(leadId);
  if (!lead) return null;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("crm_leads")
    .select("discovery_questionnaire, notes")
    .eq("id", leadId)
    .eq("workspace_id", lead.workspaceId)
    .maybeSingle();

  if (error) {
    if (isMissingDiscoveryQuestionnaireColumn(error.message)) {
      return (
        parseDiscoveryQuestionnaireFromNotes(lead.notes) ??
        normalizeDiscoveryQuestionnaire(null)
      );
    }
    throw new Error(error.message);
  }

  const row = data as DbLeadRow | null;
  if (row?.discovery_questionnaire) {
    return normalizeDiscoveryQuestionnaire(row.discovery_questionnaire);
  }

  return (
    parseDiscoveryQuestionnaireFromNotes(row?.notes ?? lead.notes) ??
    normalizeDiscoveryQuestionnaire(null)
  );
}

export async function saveDiscoveryQuestionnaire(
  leadId: string,
  input: DiscoveryQuestionnaireData,
): Promise<DiscoveryQuestionnaireData> {
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error("Lead not found.");

  const payload = normalizeDiscoveryQuestionnaire({
    ...input,
    updatedAt: new Date().toISOString(),
  });

  const supabase = requireSupabase();
  const { error } = await supabase
    .from("crm_leads")
    .update({
      discovery_questionnaire: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("workspace_id", lead.workspaceId);

  if (error && isMissingDiscoveryQuestionnaireColumn(error.message)) {
    await updateLead(
      leadId,
      {
        notes: mergeNotesWithQuestionnaire(lead.notes, payload),
      },
      { workspaceId: lead.workspaceId },
    );
    return payload;
  }

  if (error) throw new Error(error.message);
  return payload;
}
