import { parseClientReportFromNotes } from "@/lib/crm-client-report-notes";

export type LeadStatus = "Cold" | "Warm" | "Hot" | "Won" | "Active Customer" | "Lost";

export type CrmLead = {
  id: string;
  workspaceId: string;
  companyName: string;
  contactName: string;
  firstName: string;
  surname: string;
  role: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  nextAction: string;
  nextActionDate: string | null;
  estimatedValue: number | null;
  notes: string;
  discoveryNotes: string;
  lastContactAt: string | null;
  lastActivityAt: string | null;
  contactCount: number;
  needsManualReview: boolean;
  manualReviewReason: string;
  originalEnquirySubject: string;
  originalEnquiryMessage: string;
  originalEnquirySubmittedAt: string | null;
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
  createdAt: string;
  updatedAt: string;
};

export const LEAD_STATUS_OPTIONS: LeadStatus[] = [
  "Cold",
  "Warm",
  "Hot",
  "Won",
  "Active Customer",
  "Lost",
];

export const LEAD_SOURCE_OPTIONS = [
  "Website Contact Form",
  "Website",
  "Referral",
  "LinkedIn",
  "Trade show",
  "Cold outreach",
  "Existing client",
  "Other",
] as const;

type DbLead = {
  id: string;
  workspace_id?: string | null;
  company_name: string;
  contact_name: string;
  first_name?: string | null;
  surname?: string | null;
  role?: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  next_action: string | null;
  next_action_date: string | null;
  estimated_value: number | null;
  notes: string | null;
  discovery_notes: string | null;
  last_contact_at?: string | null;
  last_activity_at?: string | null;
  contact_count?: number | null;
  needs_manual_review?: boolean | null;
  manual_review_reason?: string | null;
  original_enquiry_subject?: string | null;
  original_enquiry_message?: string | null;
  original_enquiry_submitted_at?: string | null;
  client_report_file_id?: string | null;
  client_report_file_name?: string | null;
  client_report_generated_at?: string | null;
  client_report_ppt_file_id?: string | null;
  client_report_ppt_file_name?: string | null;
  client_report_sent_at?: string | null;
  client_report_message_id?: string | null;
  client_report_replied_at?: string | null;
  client_report_reminder_7d_sent_at?: string | null;
  client_report_reminder_14d_sent_at?: string | null;
  client_report_last_reminder_sent_at?: string | null;
  client_chat_room?: string | null;
  client_chat_key?: string | null;
  client_chat_access_token?: string | null;
  company_logo_file_id?: string | null;
  company_logo_file_name?: string | null;
  created_at: string;
  updated_at: string;
};

export function mapCrmLead(row: DbLead): CrmLead {
  const notesFallback = parseClientReportFromNotes(row.notes);

  return {
    id: row.id,
    workspaceId: row.workspace_id ? String(row.workspace_id) : "",
    companyName: row.company_name,
    contactName: row.contact_name,
    firstName: row.first_name ?? "",
    surname: row.surname ?? "",
    role: row.role ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    status: row.status as LeadStatus,
    source: row.source ?? "",
    nextAction: row.next_action ?? "",
    nextActionDate: row.next_action_date,
    estimatedValue: row.estimated_value,
    notes: row.notes ?? "",
    discoveryNotes: row.discovery_notes ?? "",
    lastContactAt: row.last_contact_at ?? null,
    lastActivityAt: row.last_activity_at ?? null,
    contactCount: typeof row.contact_count === "number" ? row.contact_count : 0,
    needsManualReview: Boolean(row.needs_manual_review),
    manualReviewReason: row.manual_review_reason ?? "",
    originalEnquirySubject: row.original_enquiry_subject ?? "",
    originalEnquiryMessage: row.original_enquiry_message ?? "",
    originalEnquirySubmittedAt: row.original_enquiry_submitted_at ?? null,
    clientReportFileId: row.client_report_file_id ?? notesFallback?.clientReportFileId ?? null,
    clientReportFileName:
      row.client_report_file_name ?? notesFallback?.clientReportFileName ?? null,
    clientReportGeneratedAt:
      row.client_report_generated_at ?? notesFallback?.clientReportGeneratedAt ?? null,
    clientReportPptFileId:
      row.client_report_ppt_file_id ?? notesFallback?.clientReportPptFileId ?? null,
    clientReportPptFileName:
      row.client_report_ppt_file_name ?? notesFallback?.clientReportPptFileName ?? null,
    clientReportSentAt: row.client_report_sent_at ?? notesFallback?.clientReportSentAt ?? null,
    clientReportMessageId:
      row.client_report_message_id ?? notesFallback?.clientReportMessageId ?? null,
    clientReportRepliedAt:
      row.client_report_replied_at ?? notesFallback?.clientReportRepliedAt ?? null,
    clientReportReminder7dSentAt:
      row.client_report_reminder_7d_sent_at ??
      notesFallback?.clientReportReminder7dSentAt ??
      null,
    clientReportReminder14dSentAt:
      row.client_report_reminder_14d_sent_at ??
      notesFallback?.clientReportReminder14dSentAt ??
      null,
    clientReportLastReminderSentAt:
      row.client_report_last_reminder_sent_at ??
      notesFallback?.clientReportLastReminderSentAt ??
      null,
    clientChatRoom: row.client_chat_room ?? notesFallback?.clientChatRoom ?? null,
    clientChatKey: row.client_chat_key ?? notesFallback?.clientChatKey ?? null,
    clientChatAccessToken:
      row.client_chat_access_token ?? notesFallback?.clientChatAccessToken ?? null,
    companyLogoFileId: row.company_logo_file_id ?? notesFallback?.companyLogoFileId ?? null,
    companyLogoFileName:
      row.company_logo_file_name ?? notesFallback?.companyLogoFileName ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isClientReportPendingApproval(lead: CrmLead) {
  return Boolean(lead.clientReportPptFileId) && !lead.clientReportSentAt;
}

export function hasClientReportPptDraft(lead: CrmLead) {
  return Boolean(lead.clientReportPptFileId);
}

export function canSendClientReportPdf(lead: CrmLead) {
  return Boolean(lead.clientReportPptFileId) && !lead.clientReportSentAt && Boolean(lead.email.trim());
}

export function leadStatusClass(status: LeadStatus) {
  switch (status) {
    case "Cold":
      return "border-sky-400/40 bg-sky-500/15 text-sky-300";
    case "Warm":
      return "border-amber-400/40 bg-amber-500/15 text-amber-200";
    case "Hot":
      return "border-red-400/40 bg-red-500/15 text-red-300";
    case "Won":
      return "border-emerald-400/40 bg-emerald-500/15 text-emerald-300";
    case "Active Customer":
      return "border-emerald-400/50 bg-emerald-500/20 text-emerald-200";
    case "Lost":
      return "border-white/20 bg-white/10 text-white/55";
  }
}

export function formatLeadDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function createBlankLeadInput() {
  return {
    companyName: "",
    contactName: "",
    firstName: "",
    surname: "",
    role: "",
    email: "",
    phone: "",
    status: "Cold" as LeadStatus,
    source: "Website",
    nextAction: "",
    nextActionDate: null as string | null,
    estimatedValue: null as number | null,
    notes: "",
  };
}
