export const CRM_CLIENT_REPORT_NOTES_PREFIX = "CRM client report JSON:";

export type CrmClientReportNotesMetadata = {
  clientReportFileId?: string | null;
  clientReportFileName?: string | null;
  clientReportGeneratedAt?: string | null;
  clientReportPptFileId?: string | null;
  clientReportPptFileName?: string | null;
  clientReportSentAt?: string | null;
  clientReportMessageId?: string | null;
  clientReportRepliedAt?: string | null;
  clientReportReminder7dSentAt?: string | null;
  clientReportReminder14dSentAt?: string | null;
  clientReportLastReminderSentAt?: string | null;
  clientChatRoom?: string | null;
  clientChatKey?: string | null;
  clientChatAccessToken?: string | null;
  companyLogoFileId?: string | null;
  companyLogoFileName?: string | null;
};

function stripClientReportNotesBlock(notes: string) {
  const prefixIndex = notes.indexOf(CRM_CLIENT_REPORT_NOTES_PREFIX);
  if (prefixIndex < 0) return notes.trim();

  return notes.slice(0, prefixIndex).trim();
}

export function parseClientReportFromNotes(
  notes: string | null | undefined,
): CrmClientReportNotesMetadata | null {
  if (!notes?.includes(CRM_CLIENT_REPORT_NOTES_PREFIX)) return null;

  const jsonStart = notes.indexOf("{", notes.indexOf(CRM_CLIENT_REPORT_NOTES_PREFIX));
  if (jsonStart < 0) return null;

  try {
    return JSON.parse(notes.slice(jsonStart)) as CrmClientReportNotesMetadata;
  } catch {
    return null;
  }
}

export function buildClientReportNotesBlock(metadata: CrmClientReportNotesMetadata) {
  return `${CRM_CLIENT_REPORT_NOTES_PREFIX}\n${JSON.stringify(metadata)}`;
}

export function mergeClientReportNotes(
  existingNotes: string,
  metadata: CrmClientReportNotesMetadata,
  explicitNotes?: string,
) {
  const baseNotes = stripClientReportNotesBlock(explicitNotes ?? existingNotes);
  const previous = parseClientReportFromNotes(existingNotes) ?? {};
  const merged = { ...previous, ...metadata };
  const block = buildClientReportNotesBlock(merged);
  return baseNotes ? `${baseNotes}\n\n${block}` : block;
}

export function extractClientReportPatch(
  patch: Partial<{
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
): CrmClientReportNotesMetadata | null {
  const metadata: CrmClientReportNotesMetadata = {};

  if (patch.clientReportFileId !== undefined) {
    metadata.clientReportFileId = patch.clientReportFileId;
  }
  if (patch.clientReportFileName !== undefined) {
    metadata.clientReportFileName = patch.clientReportFileName;
  }
  if (patch.clientReportGeneratedAt !== undefined) {
    metadata.clientReportGeneratedAt = patch.clientReportGeneratedAt;
  }
  if (patch.clientReportPptFileId !== undefined) {
    metadata.clientReportPptFileId = patch.clientReportPptFileId;
  }
  if (patch.clientReportPptFileName !== undefined) {
    metadata.clientReportPptFileName = patch.clientReportPptFileName;
  }
  if (patch.clientReportSentAt !== undefined) {
    metadata.clientReportSentAt = patch.clientReportSentAt;
  }
  if (patch.clientReportMessageId !== undefined) {
    metadata.clientReportMessageId = patch.clientReportMessageId;
  }
  if (patch.clientReportRepliedAt !== undefined) {
    metadata.clientReportRepliedAt = patch.clientReportRepliedAt;
  }
  if (patch.clientReportReminder7dSentAt !== undefined) {
    metadata.clientReportReminder7dSentAt = patch.clientReportReminder7dSentAt;
  }
  if (patch.clientReportReminder14dSentAt !== undefined) {
    metadata.clientReportReminder14dSentAt = patch.clientReportReminder14dSentAt;
  }
  if (patch.clientReportLastReminderSentAt !== undefined) {
    metadata.clientReportLastReminderSentAt = patch.clientReportLastReminderSentAt;
  }
  if (patch.clientChatRoom !== undefined) {
    metadata.clientChatRoom = patch.clientChatRoom;
  }
  if (patch.clientChatKey !== undefined) {
    metadata.clientChatKey = patch.clientChatKey;
  }
  if (patch.clientChatAccessToken !== undefined) {
    metadata.clientChatAccessToken = patch.clientChatAccessToken;
  }
  if (patch.companyLogoFileId !== undefined) {
    metadata.companyLogoFileId = patch.companyLogoFileId;
  }
  if (patch.companyLogoFileName !== undefined) {
    metadata.companyLogoFileName = patch.companyLogoFileName;
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

export const CRM_CLIENT_REPORT_DB_COLUMNS = [
  "client_report_file_id",
  "client_report_file_name",
  "client_report_generated_at",
  "client_report_ppt_file_id",
  "client_report_ppt_file_name",
  "client_report_sent_at",
  "client_report_message_id",
  "client_report_replied_at",
  "client_report_reminder_7d_sent_at",
  "client_report_reminder_14d_sent_at",
  "client_report_last_reminder_sent_at",
  "client_chat_room",
  "client_chat_key",
  "client_chat_access_token",
  "company_logo_file_id",
  "company_logo_file_name",
] as const;

export function stripClientReportDbColumns(payload: Record<string, string | number | null>) {
  const next = { ...payload };
  for (const column of CRM_CLIENT_REPORT_DB_COLUMNS) {
    delete next[column];
  }
  return next;
}
