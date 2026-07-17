export const CRM_LEAD_CLIENT_NOTE_PREFIX = "CRM Lead ID:";

export function isCrmLinkedClientNotes(notes: string | null | undefined) {
  return String(notes ?? "").includes(CRM_LEAD_CLIENT_NOTE_PREFIX);
}

export function buildCrmLeadClientNotes(leadId: string, leadNotes: string) {
  const marker = `${CRM_LEAD_CLIENT_NOTE_PREFIX} ${leadId}`;
  const trimmed = leadNotes.trim();
  return trimmed ? `${marker}\n\n${trimmed}` : marker;
}
