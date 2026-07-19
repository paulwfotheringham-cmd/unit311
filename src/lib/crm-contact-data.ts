export type CrmContactReplyStatus = "awaiting_reply" | "replied";

export type CrmContactHistory = {
  id: string;
  crmLeadId: string;
  subject: string;
  message: string;
  submittedAt: string;
  source: string;
  replyStatus: CrmContactReplyStatus;
  replyAt: string | null;
  repliedBy: string | null;
  replyEmailMessageId: string | null;
  replyEmailThreadId: string | null;
  notificationEmailMessageId: string | null;
  confirmationEmailMessageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmActivity = {
  id: string;
  crmLeadId: string;
  activityType: string;
  title: string;
  subject: string;
  message: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
  contactHistoryId: string | null;
  emailMessageId: string | null;
  emailThreadId: string | null;
  createdBy: string | null;
  createdAt: string;
};

export const CRM_CONTACT_SOURCE_WEBSITE = "Website Contact Form";

export const CRM_ACTIVITY_CONTACT_FORM = "website_contact_form_submitted";
export const CRM_ACTIVITY_ACK_EMAIL = "acknowledgement_email_sent";
export const CRM_ACTIVITY_REPLY_EMAIL = "reply_email_sent";
export const CRM_ACTIVITY_MANUAL_REVIEW = "manual_review_flagged";

/** Deep link into the existing Email module (no email body duplication). */
export function buildCrmEmailModuleHref(input: {
  emailMessageId?: string | null;
  emailThreadId?: string | null;
  account?: string | null;
}) {
  const params = new URLSearchParams({ view: "info-email" });
  if (input.account) params.set("emailAccount", input.account);
  if (input.emailThreadId) params.set("emailThreadId", input.emailThreadId);
  if (input.emailMessageId) params.set("emailMessageId", input.emailMessageId);
  return `/?${params.toString()}`;
}

type DbContactHistory = {
  id: string;
  crm_lead_id: string;
  subject: string | null;
  message: string;
  submitted_at: string;
  source: string | null;
  reply_status: string;
  reply_at: string | null;
  replied_by: string | null;
  reply_email_message_id: string | null;
  reply_email_thread_id: string | null;
  notification_email_message_id: string | null;
  confirmation_email_message_id: string | null;
  created_at: string;
  updated_at: string;
};

type DbActivity = {
  id: string;
  crm_lead_id: string;
  activity_type: string;
  title: string;
  subject: string | null;
  message: string | null;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
  contact_history_id: string | null;
  email_message_id: string | null;
  email_thread_id: string | null;
  created_by: string | null;
  created_at: string;
};

export function mapCrmContactHistory(row: DbContactHistory): CrmContactHistory {
  return {
    id: row.id,
    crmLeadId: row.crm_lead_id,
    subject: row.subject ?? "",
    message: row.message,
    submittedAt: row.submitted_at,
    source: row.source ?? CRM_CONTACT_SOURCE_WEBSITE,
    replyStatus: row.reply_status === "replied" ? "replied" : "awaiting_reply",
    replyAt: row.reply_at,
    repliedBy: row.replied_by,
    replyEmailMessageId: row.reply_email_message_id,
    replyEmailThreadId: row.reply_email_thread_id,
    notificationEmailMessageId: row.notification_email_message_id,
    confirmationEmailMessageId: row.confirmation_email_message_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCrmActivity(row: DbActivity): CrmActivity {
  return {
    id: row.id,
    crmLeadId: row.crm_lead_id,
    activityType: row.activity_type,
    title: row.title,
    subject: row.subject ?? "",
    message: row.message ?? "",
    occurredAt: row.occurred_at,
    metadata: row.metadata ?? {},
    contactHistoryId: row.contact_history_id,
    emailMessageId: row.email_message_id,
    emailThreadId: row.email_thread_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
