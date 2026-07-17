import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import type { CrmLead } from "@/lib/crm-data";
import {
  buildClientReport14DayReminderEmail,
  buildClientReport7DayReminderEmail,
  clientReportEmailSubject,
} from "@/lib/crm-client-report-emails";
import { listLeadsAwaitingReportFollowupAcrossWorkspaces, updateLead } from "@/lib/crm-leads-service";
import { buildCrmSignupInviteUrl } from "@/lib/crm-signup-invite";
import { fetchMailboxMessages } from "@/lib/email/imap";
import { sendMailboxEmail } from "@/lib/email/smtp";
import type { EmailMessage } from "@/lib/email/types";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";
import { CONTACT } from "@/lib/site";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const INBOX_FETCH_LIMIT = 150;

type FollowupResult = {
  leadId: string;
  companyName: string;
  ok: boolean;
  error?: string;
};

export type CrmClientReportFollowupResult = {
  repliesDetected: FollowupResult[];
  reminders7d: FollowupResult[];
  reminders14d: FollowupResult[];
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeMessageId(value: string | null | undefined) {
  if (!value?.trim()) return null;
  return value.replace(/^<|>$/g, "").trim().toLowerCase();
}

function buildReportChatUrl(accessToken: string) {
  return `${CENTRAL_SITE_URL}/report-chat/${accessToken}`;
}

function appendNotes(existing: string, addition: string) {
  const current = existing.trim();
  if (!current) return addition;
  if (current.includes(addition)) return current;
  return `${current}\n\n${addition}`;
}

function messageDateMs(message: EmailMessage) {
  const parsed = Date.parse(message.date);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isInboundReplyToReport(
  message: EmailMessage,
  lead: CrmLead,
  reportSubject: string,
  reportSentAtMs: number,
) {
  if (message.direction !== "inbound") return false;
  if (normalizeEmail(message.fromEmail) !== normalizeEmail(lead.email)) return false;
  if (messageDateMs(message) <= reportSentAtMs) return false;

  const reportMessageId = normalizeMessageId(lead.clientReportMessageId);
  const inReplyTo = normalizeMessageId(message.inReplyTo);
  const references = message.references
    .map((entry) => normalizeMessageId(entry))
    .filter(Boolean) as string[];

  if (reportMessageId && (inReplyTo === reportMessageId || references.includes(reportMessageId))) {
    return true;
  }

  const normalizedSubject = message.subject.trim().toLowerCase();
  const normalizedReportSubject = reportSubject.trim().toLowerCase();
  const reportSubjectCore = normalizedReportSubject.replace(/^re:\s*/i, "");

  if (normalizedSubject.includes(reportSubjectCore)) return true;
  if (normalizedSubject.includes("executive report") && normalizedSubject.includes("unit311")) {
    return true;
  }

  return false;
}

function findReplyForLead(messages: EmailMessage[], lead: CrmLead) {
  if (!lead.clientReportSentAt || !lead.email.trim()) return null;

  const reportSubject = clientReportEmailSubject(lead.companyName);
  const reportSentAtMs = Date.parse(lead.clientReportSentAt);
  if (!Number.isFinite(reportSentAtMs)) return null;

  const matches = messages
    .filter((message) => isInboundReplyToReport(message, lead, reportSubject, reportSentAtMs))
    .sort((a, b) => messageDateMs(b) - messageDateMs(a));

  return matches[0] ?? null;
}

export async function detectClientReportReplies(
  leads: CrmLead[],
  messages?: EmailMessage[],
): Promise<FollowupResult[]> {
  const inbox = messages ?? (await fetchMailboxMessages("info", INBOX_FETCH_LIMIT));
  const results: FollowupResult[] = [];

  for (const lead of leads) {
    if (lead.clientReportRepliedAt || !lead.clientReportSentAt) continue;

    try {
      const reply = findReplyForLead(inbox, lead);
      if (!reply) continue;

      const repliedAt = new Date(messageDateMs(reply) || Date.now()).toISOString();
      await updateLead(
        lead.id,
        {
          clientReportRepliedAt: repliedAt,
          nextAction: "Continue executive report follow-up",
          notes: appendNotes(
            lead.notes,
            `Client replied to executive report email on ${formatLondonDateTime(repliedAt)} GMT.`,
          ),
        },
        { workspaceId: lead.workspaceId },
      );

      results.push({ leadId: lead.id, companyName: lead.companyName, ok: true });
    } catch (error) {
      results.push({
        leadId: lead.id,
        companyName: lead.companyName,
        ok: false,
        error: error instanceof Error ? error.message : "Reply detection failed",
      });
    }
  }

  return results;
}

async function sendReportReminder(
  lead: CrmLead,
  stage: "7d" | "14d",
): Promise<FollowupResult> {
  if (!lead.email.trim()) {
    return {
      leadId: lead.id,
      companyName: lead.companyName,
      ok: false,
      error: "Lead has no email address",
    };
  }

  const chatUrl = lead.clientChatAccessToken
    ? buildReportChatUrl(lead.clientChatAccessToken)
    : `${CENTRAL_SITE_URL}/signup`;
  const signupUrl = buildCrmSignupInviteUrl(lead.id);
  const originalSubject = clientReportEmailSubject(lead.companyName);
  const reminder =
    stage === "7d"
      ? buildClientReport7DayReminderEmail({
          contactName: lead.contactName,
          companyName: lead.companyName,
          chatUrl,
          signupUrl,
        })
      : buildClientReport14DayReminderEmail({
          contactName: lead.contactName,
          companyName: lead.companyName,
          chatUrl,
          signupUrl,
        });

  const threadingMessageId = lead.clientReportMessageId?.trim() || null;
  const references = threadingMessageId ? [threadingMessageId] : undefined;
  const replySubject = originalSubject.toLowerCase().startsWith("re:")
    ? originalSubject
    : `Re: ${originalSubject}`;

  try {
    await sendMailboxEmail({
      account: "info",
      to: lead.email.trim(),
      replyTo: CONTACT.infoEmail,
      subject: replySubject,
      html: reminder.html,
      text: reminder.text,
      inReplyTo: threadingMessageId,
      references,
    });

    const sentAt = new Date().toISOString();
    await updateLead(
      lead.id,
      {
        clientReportReminder7dSentAt:
          stage === "7d" ? sentAt : lead.clientReportReminder7dSentAt,
        clientReportReminder14dSentAt:
          stage === "14d" ? sentAt : lead.clientReportReminder14dSentAt,
        clientReportLastReminderSentAt: sentAt,
        nextAction: stage === "7d" ? "Await client report reply" : "Final report follow-up sent",
        notes: appendNotes(
          lead.notes,
          `Executive report ${stage === "7d" ? "7-day" : "14-day"} reminder emailed on ${formatLondonDateTime(sentAt)} GMT.`,
        ),
      },
      { workspaceId: lead.workspaceId },
    );

    return { leadId: lead.id, companyName: lead.companyName, ok: true };
  } catch (error) {
    return {
      leadId: lead.id,
      companyName: lead.companyName,
      ok: false,
      error: error instanceof Error ? error.message : "Reminder failed",
    };
  }
}

function isDueFor7DayReminder(lead: CrmLead, nowMs: number) {
  if (!lead.clientReportSentAt || lead.clientReportReminder7dSentAt || lead.clientReportRepliedAt) {
    return false;
  }

  const sentAtMs = Date.parse(lead.clientReportSentAt);
  if (!Number.isFinite(sentAtMs)) return false;
  return nowMs - sentAtMs >= SEVEN_DAYS_MS;
}

function isDueFor14DayReminder(lead: CrmLead, nowMs: number) {
  if (
    !lead.clientReportReminder7dSentAt ||
    lead.clientReportReminder14dSentAt ||
    lead.clientReportRepliedAt
  ) {
    return false;
  }

  const firstReminderMs = Date.parse(lead.clientReportReminder7dSentAt);
  if (!Number.isFinite(firstReminderMs)) return false;
  return nowMs - firstReminderMs >= FOURTEEN_DAYS_MS;
}

export async function sendDueClientReportReminders(
  leads: CrmLead[],
): Promise<{ reminders7d: FollowupResult[]; reminders14d: FollowupResult[] }> {
  const nowMs = Date.now();
  const reminders7d: FollowupResult[] = [];
  const reminders14d: FollowupResult[] = [];

  for (const lead of leads) {
    if (lead.clientReportRepliedAt) continue;

    if (isDueFor7DayReminder(lead, nowMs)) {
      reminders7d.push(await sendReportReminder(lead, "7d"));
      continue;
    }

    if (isDueFor14DayReminder(lead, nowMs)) {
      reminders14d.push(await sendReportReminder(lead, "14d"));
    }
  }

  return { reminders7d, reminders14d };
}

export async function runCrmClientReportFollowups(): Promise<CrmClientReportFollowupResult> {
  const leads = await listLeadsAwaitingReportFollowupAcrossWorkspaces();
  let inbox: EmailMessage[] = [];

  try {
    inbox = await fetchMailboxMessages("info", INBOX_FETCH_LIMIT);
  } catch (error) {
    console.error("[crm-client-report-followups] inbox fetch failed", error);
  }

  const repliesDetected = inbox.length > 0 ? await detectClientReportReplies(leads, inbox) : [];

  const refreshedLeads = await listLeadsAwaitingReportFollowupAcrossWorkspaces();
  const { reminders7d, reminders14d } = await sendDueClientReportReminders(refreshedLeads);

  return {
    repliesDetected,
    reminders7d,
    reminders14d,
  };
}
