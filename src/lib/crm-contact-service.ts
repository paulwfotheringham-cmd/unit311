import {
  CRM_ACTIVITY_ACK_EMAIL,
  CRM_ACTIVITY_CONTACT_FORM,
  CRM_ACTIVITY_MANUAL_REVIEW,
  CRM_ACTIVITY_REPLY_EMAIL,
  CRM_CONTACT_SOURCE_WEBSITE,
  mapCrmActivity,
  mapCrmContactHistory,
  type CrmActivity,
  type CrmContactHistory,
} from "@/lib/crm-contact-data";
import {
  postEnquiryReplyToEnquiriesChannel,
  postWebsiteEnquiryToEnquiriesChannel,
} from "@/lib/crm-enquiries-messaging";
import { mapCrmLead, type CrmLead } from "@/lib/crm-data";
import {
  createLead,
  resolveCrmWorkspaceId,
  type CrmWorkspaceScope,
} from "@/lib/crm-leads-service";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function normalizeMessageId(value: string | null | undefined) {
  return (value ?? "").trim().replace(/^<|>$/g, "").toLowerCase();
}

export type CrmLeadMatchResult = {
  lead: CrmLead | null;
  matches: CrmLead[];
  ambiguous: boolean;
};

/**
 * Match by email OR organisation (case-insensitive).
 * Ambiguous = more than one distinct lead matches either criterion.
 */
export async function findCrmLeadsForContact(
  input: {
    organisation: string;
    email: string;
  },
  scope?: CrmWorkspaceScope,
): Promise<CrmLeadMatchResult> {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  const supabase = requireSupabase();
  const organisation = normalizeKey(input.organisation);
  const email = normalizeKey(input.email);

  const { data, error } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);

  const leads = (data ?? []).map(mapCrmLead);
  const byEmail = email
    ? leads.filter((lead) => normalizeKey(lead.email || "") === email)
    : [];
  const byOrganisation = organisation
    ? leads.filter((lead) => normalizeKey(lead.companyName) === organisation)
    : [];

  const matchedById = new Map<string, CrmLead>();
  for (const lead of [...byEmail, ...byOrganisation]) {
    matchedById.set(lead.id, lead);
  }
  const matches = [...matchedById.values()];

  if (matches.length === 0) {
    return { lead: null, matches: [], ambiguous: false };
  }

  if (matches.length === 1) {
    return { lead: matches[0], matches, ambiguous: false };
  }

  // Prefer email match when several leads match; still flag as ambiguous.
  const preferred =
    byEmail[0] ??
    matches.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];

  return { lead: preferred, matches, ambiguous: true };
}

/** @deprecated use findCrmLeadsForContact */
export async function findCrmLeadForContact(
  input: {
    organisation: string;
    email: string;
  },
  scope?: CrmWorkspaceScope,
): Promise<CrmLead | null> {
  const result = await findCrmLeadsForContact(input, scope);
  return result.lead;
}

async function createCrmActivity(input: {
  crmLeadId: string;
  activityType: string;
  title: string;
  subject?: string;
  message?: string;
  occurredAt?: string;
  contactHistoryId?: string | null;
  emailMessageId?: string | null;
  emailThreadId?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
  workspaceId?: string | null;
  scope?: CrmWorkspaceScope;
}) {
  const workspaceId = await resolveCrmWorkspaceId({
    workspaceId: input.workspaceId ?? input.scope?.workspaceId,
  });
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("crm_activities")
    .insert({
      workspace_id: workspaceId,
      crm_lead_id: input.crmLeadId,
      activity_type: input.activityType,
      title: input.title,
      subject: input.subject?.trim() || null,
      message: input.message?.trim() || null,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      contact_history_id: input.contactHistoryId ?? null,
      email_message_id: input.emailMessageId ?? null,
      email_thread_id: input.emailThreadId ?? null,
      created_by: input.createdBy ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCrmActivity(data);
}

async function touchLeadContactCounters(input: {
  leadId: string;
  firstName: string;
  surname: string;
  organisation: string;
  role: string;
  email: string;
  now: string;
  ambiguous?: boolean;
  ambiguousLeadIds?: string[];
  workspaceId?: string | null;
  scope?: CrmWorkspaceScope;
}) {
  const workspaceId = await resolveCrmWorkspaceId({
    workspaceId: input.workspaceId ?? input.scope?.workspaceId,
  });
  const supabase = requireSupabase();
  const existing = await supabase
    .from("crm_leads")
    .select("*")
    .eq("id", input.leadId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  const row = existing.data;
  const currentCount = typeof row?.contact_count === "number" ? row.contact_count : 0;
  const contactName = [input.firstName, input.surname].filter(Boolean).join(" ").trim();
  const currentSource = typeof row?.source === "string" ? row.source.trim() : "";

  const payload: Record<string, string | number | boolean | null> = {
    last_contact_at: input.now,
    last_activity_at: input.now,
    contact_count: currentCount + 1,
    updated_at: input.now,
  };

  if (!currentSource || currentSource === "Website") {
    payload.source = CRM_CONTACT_SOURCE_WEBSITE;
  }

  if (input.organisation.trim()) payload.company_name = input.organisation.trim();
  if (contactName) payload.contact_name = contactName;
  if (input.email.trim()) payload.email = input.email.trim();
  if (input.firstName.trim()) payload.first_name = input.firstName.trim();
  if (input.surname.trim()) payload.surname = input.surname.trim();
  if (input.role.trim()) payload.role = input.role.trim();

  if (input.ambiguous) {
    payload.needs_manual_review = true;
    payload.manual_review_reason = [
      "Multiple CRM leads matched this Contact Form enquiry (email or organisation).",
      input.ambiguousLeadIds?.length
        ? `Candidate lead IDs: ${input.ambiguousLeadIds.join(", ")}`
        : "",
      "Do not auto-merge. Review manually.",
    ]
      .filter(Boolean)
      .join(" ");
    payload.next_action = "Manual review: possible duplicate CRM leads";
    payload.next_action_date = input.now.slice(0, 10);
  }

  const { error } = await supabase
    .from("crm_leads")
    .update(payload)
    .eq("id", input.leadId)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

export async function recordWebsiteContactEnquiry(
  input: {
    firstName: string;
    surname: string;
    organisation: string;
    role: string;
    email: string;
    subject: string;
    message: string;
    notificationEmailMessageId?: string | null;
    confirmationEmailMessageId?: string | null;
    workspaceId?: string | null;
  },
  scope?: CrmWorkspaceScope,
): Promise<{
  lead: CrmLead;
  history: CrmContactHistory;
  activity: CrmActivity;
  acknowledgementActivity: CrmActivity | null;
  createdLead: boolean;
  ambiguousMatch: boolean;
}> {
  const workspaceId = await resolveCrmWorkspaceId({
    workspaceId: input.workspaceId ?? scope?.workspaceId,
  });
  const workspaceScope: CrmWorkspaceScope = { workspaceId };
  const now = new Date().toISOString();
  const contactName = [input.firstName, input.surname].filter(Boolean).join(" ").trim();
  const companyName = input.organisation.trim() || contactName || input.email;

  let createdLead = false;
  const match = await findCrmLeadsForContact(
    {
      organisation: input.organisation,
      email: input.email,
    },
    workspaceScope,
  );

  let lead: CrmLead;
  if (!match.lead) {
    // Only create when there is no email OR organisation match.
    lead = await createLead({
      companyName,
      contactName: contactName || input.email,
      email: input.email,
      status: "Cold",
      source: CRM_CONTACT_SOURCE_WEBSITE,
      nextAction: "Reply to website contact enquiry",
      nextActionDate: now.slice(0, 10),
      notes: "",
      workspaceId,
    });
    createdLead = true;

    const supabase = requireSupabase();
    await supabase
      .from("crm_leads")
      .update({
        first_name: input.firstName.trim() || null,
        surname: input.surname.trim() || null,
        role: input.role.trim() || null,
        source: CRM_CONTACT_SOURCE_WEBSITE,
        last_contact_at: now,
        last_activity_at: now,
        contact_count: 1,
        needs_manual_review: false,
        original_enquiry_subject: input.subject.trim() || null,
        original_enquiry_message: input.message,
        original_enquiry_submitted_at: now,
        updated_at: now,
      })
      .eq("id", lead.id)
      .eq("workspace_id", workspaceId);
  } else {
    lead = match.lead;
    // Existing match (unique or ambiguous): never create another lead.
    await touchLeadContactCounters({
      leadId: lead.id,
      firstName: input.firstName,
      surname: input.surname,
      organisation: input.organisation,
      role: input.role,
      email: input.email,
      now,
      ambiguous: match.ambiguous,
      ambiguousLeadIds: match.matches.map((item) => item.id),
      workspaceId,
    });

    // Preserve the first enquiry forever — only set if still empty.
    if (!lead.originalEnquirySubmittedAt) {
      const supabase = requireSupabase();
      await supabase
        .from("crm_leads")
        .update({
          original_enquiry_subject: input.subject.trim() || null,
          original_enquiry_message: input.message,
          original_enquiry_submitted_at: now,
          updated_at: now,
        })
        .eq("id", lead.id)
        .eq("workspace_id", workspaceId)
        .is("original_enquiry_submitted_at", null);
    }

    if (match.ambiguous) {
      // Also flag other candidates so they appear in review queues.
      const supabase = requireSupabase();
      const primaryLeadId = lead.id;
      const otherIds = match.matches.map((item) => item.id).filter((id) => id !== primaryLeadId);
      if (otherIds.length) {
        await supabase
          .from("crm_leads")
          .update({
            needs_manual_review: true,
            manual_review_reason:
              "Also matched a Contact Form enquiry that matched multiple CRM leads. Review for duplicates.",
            updated_at: now,
          })
          .in("id", otherIds)
          .eq("workspace_id", workspaceId);
      }
    }
  }

  const supabase = requireSupabase();
  const { data: historyRow, error: historyError } = await supabase
    .from("crm_contact_history")
    .insert({
      workspace_id: workspaceId,
      crm_lead_id: lead.id,
      subject: input.subject.trim() || null,
      message: input.message,
      submitted_at: now,
      source: CRM_CONTACT_SOURCE_WEBSITE,
      reply_status: "awaiting_reply",
      notification_email_message_id: input.notificationEmailMessageId ?? null,
      confirmation_email_message_id: input.confirmationEmailMessageId ?? null,
    })
    .select("*")
    .single();

  if (historyError) throw new Error(historyError.message);
  const history = mapCrmContactHistory(historyRow);

  const activity = await createCrmActivity({
    crmLeadId: lead.id,
    activityType: CRM_ACTIVITY_CONTACT_FORM,
    title: "Website Contact Form Submitted",
    subject: input.subject,
    message: input.message,
    occurredAt: now,
    contactHistoryId: history.id,
    emailMessageId: input.notificationEmailMessageId ?? null,
    emailThreadId: input.notificationEmailMessageId ?? null,
    workspaceId,
    metadata: {
      firstName: input.firstName,
      surname: input.surname,
      organisation: input.organisation,
      role: input.role,
      email: input.email,
      source: CRM_CONTACT_SOURCE_WEBSITE,
      ambiguousMatch: match.ambiguous,
      matchedLeadIds: match.matches.map((item) => item.id),
    },
  });

  let acknowledgementActivity: CrmActivity | null = null;
  if (input.confirmationEmailMessageId) {
    acknowledgementActivity = await createCrmActivity({
      crmLeadId: lead.id,
      activityType: CRM_ACTIVITY_ACK_EMAIL,
      title: "Acknowledgement Email Sent",
      subject: "Thank you for contacting Unit311 Central",
      occurredAt: now,
      contactHistoryId: history.id,
      emailMessageId: input.confirmationEmailMessageId,
      emailThreadId: input.confirmationEmailMessageId,
      createdBy: "System",
      workspaceId,
      metadata: {
        emailModuleLinked: true,
        toEmail: input.email,
      },
    });
  }

  if (match.ambiguous) {
    await createCrmActivity({
      crmLeadId: lead.id,
      activityType: CRM_ACTIVITY_MANUAL_REVIEW,
      title: "Flagged for Manual Review",
      subject: input.subject,
      message:
        "Multiple CRM leads matched this enquiry by email or organisation. Enquiry appended without creating a new lead.",
      occurredAt: now,
      contactHistoryId: history.id,
      workspaceId,
      metadata: {
        matchedLeadIds: match.matches.map((item) => item.id),
      },
    });
  }

  await postWebsiteEnquiryToEnquiriesChannel(
    {
      leadId: lead.id,
      organisation: input.organisation,
      firstName: input.firstName,
      surname: input.surname,
      role: input.role,
      email: input.email,
      subject: input.subject,
    },
    { workspaceId },
  ).catch(() => undefined);

  const refreshed = await supabase
    .from("crm_leads")
    .select("*")
    .eq("id", lead.id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (refreshed.error) throw new Error(refreshed.error.message);

  return {
    lead: refreshed.data ? mapCrmLead(refreshed.data) : lead,
    history,
    activity,
    acknowledgementActivity,
    createdLead,
    ambiguousMatch: match.ambiguous,
  };
}

export async function listCrmContactHistoryForLead(
  leadId: string,
  scope?: CrmWorkspaceScope,
): Promise<CrmContactHistory[]> {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("crm_contact_history")
    .select("*")
    .eq("crm_lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCrmContactHistory);
}

export async function listCrmActivitiesForLead(
  leadId: string,
  scope?: CrmWorkspaceScope,
): Promise<CrmActivity[]> {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("crm_activities")
    .select("*")
    .eq("crm_lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCrmActivity);
}

export async function linkEmailReplyToCrmContact(
  input: {
    toEmail: string;
    subject?: string;
    replyEmailMessageId?: string | null;
    inReplyTo?: string | null;
    references?: string[];
    emailThreadId?: string | null;
    repliedBy?: string | null;
  },
  scope?: CrmWorkspaceScope,
): Promise<{ updated: number }> {
  if (!isSupabaseConfigured()) return { updated: 0 };

  const workspaceId = await resolveCrmWorkspaceId(scope);
  const supabase = requireSupabase();
  const toEmail = normalizeKey(input.toEmail);
  if (!toEmail) return { updated: 0 };

  const now = new Date().toISOString();
  const referenceIds = [input.inReplyTo, ...(input.references ?? [])]
    .map(normalizeMessageId)
    .filter(Boolean);

  const { data: openRows, error } = await supabase
    .from("crm_contact_history")
    .select("*")
    .eq("reply_status", "awaiting_reply")
    .eq("workspace_id", workspaceId)
    .order("submitted_at", { ascending: false })
    .limit(200);

  if (error) {
    if (
      error.message.includes("does not exist") ||
      error.message.includes("schema cache") ||
      error.message.includes("crm_contact_history")
    ) {
      return { updated: 0 };
    }
    throw new Error(error.message);
  }

  type HistoryRow = {
    id: string;
    crm_lead_id: string;
    notification_email_message_id: string | null;
    confirmation_email_message_id: string | null;
  };

  const historyRows = (openRows ?? []) as HistoryRow[];
  if (!historyRows.length) return { updated: 0 };

  const leadIds = [...new Set(historyRows.map((row) => row.crm_lead_id))];
  const { data: leadRows, error: leadError } = await supabase
    .from("crm_leads")
    .select("id, email")
    .in("id", leadIds)
    .eq("workspace_id", workspaceId);
  if (leadError) throw new Error(leadError.message);

  const emailByLeadId = new Map(
    (leadRows ?? []).map((row) => [row.id as string, normalizeKey((row.email as string | null) ?? "")]),
  );

  const matched = historyRows.filter((row) => {
    const leadEmail = emailByLeadId.get(row.crm_lead_id) ?? "";
    if (leadEmail && leadEmail === toEmail) return true;

    const notificationId = normalizeMessageId(row.notification_email_message_id);
    const confirmationId = normalizeMessageId(row.confirmation_email_message_id);
    return referenceIds.some((id) => id === notificationId || id === confirmationId);
  });

  if (!matched.length) return { updated: 0 };

  const primary = matched[0];
  const threadId =
    input.emailThreadId?.trim() ||
    normalizeMessageId(primary.notification_email_message_id) ||
    input.replyEmailMessageId ||
    null;

  const { error: updateError } = await supabase
    .from("crm_contact_history")
    .update({
      reply_status: "replied",
      reply_at: now,
      replied_by: input.repliedBy?.trim() || null,
      reply_email_message_id: input.replyEmailMessageId ?? null,
      reply_email_thread_id: threadId,
      updated_at: now,
    })
    .eq("id", primary.id)
    .eq("workspace_id", workspaceId);

  if (updateError) throw new Error(updateError.message);

  await createCrmActivity({
    crmLeadId: primary.crm_lead_id,
    activityType: CRM_ACTIVITY_REPLY_EMAIL,
    title: "Reply Email Sent",
    subject: input.subject ?? "",
    occurredAt: now,
    contactHistoryId: primary.id,
    emailMessageId: input.replyEmailMessageId ?? null,
    emailThreadId: threadId,
    createdBy: input.repliedBy ?? null,
    workspaceId,
    metadata: {
      toEmail: input.toEmail,
      inReplyTo: input.inReplyTo ?? null,
    },
  });

  const { data: leadRow } = await supabase
    .from("crm_leads")
    .select("company_name")
    .eq("id", primary.crm_lead_id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  await supabase
    .from("crm_leads")
    .update({
      last_activity_at: now,
      next_action: "Follow up after contact reply",
      updated_at: now,
    })
    .eq("id", primary.crm_lead_id)
    .eq("workspace_id", workspaceId);

  await postEnquiryReplyToEnquiriesChannel(
    {
      organisation: (leadRow?.company_name as string | undefined) || input.toEmail,
      leadId: primary.crm_lead_id,
      replyEmailMessageId: input.replyEmailMessageId,
    },
    { workspaceId },
  ).catch(() => undefined);

  return { updated: 1 };
}
