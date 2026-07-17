import { randomUUID } from "node:crypto";

import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { buildCrmSignupInviteUrl } from "@/lib/crm-signup-invite";
import type { CrmLead } from "@/lib/crm-data";
import {
  buildAdminReportNotificationEmail,
  buildClientReportEmail,
} from "@/lib/crm-client-report-emails";
import { buildCrmClientReportPdf, clientReportFileName } from "@/lib/crm-client-report-pdf";
import {
  buildCrmClientReportPptx,
  clientReportPptxFileName,
} from "@/lib/crm-client-report-pptx";
import { ensureCrmClientReportSchema } from "@/lib/crm-client-report-schema";
import { loadClientReportLogoForLead } from "@/lib/crm-company-logo-service";
import { getDiscoveryQuestionnaire } from "@/lib/crm-discovery-questions-service";
import { getLeadById, getLeadByReportChatToken, updateLead } from "@/lib/crm-leads-service";
import { sendMailboxEmail } from "@/lib/email/smtp";
import { ensureExternalClientFolder } from "@/lib/external-files-service";
import { resolveBookingsForCrmLead } from "@/lib/founder-booking/service";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";
import { createActionItem } from "@/lib/internal-action-items-service";
import { downloadFileBuffer, uploadFile } from "@/lib/internal-files-service";
import {
  createChannel,
  getChannelByRoom,
  sendMessage,
  updateChannelMembers,
} from "@/lib/internal-messaging-service";
import { listInternalOperators } from "@/lib/internal-operators-service";
import { CONTACT } from "@/lib/site";

const REPORT_CHAT_OPERATOR_LIMIT = 3;

function toUploadFile(name: string, buffer: Buffer, mimeType: string) {
  const bytes = Uint8Array.from(buffer);
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], name, { type: mimeType });
}

function buildClientChatKey(lead: CrmLead) {
  return lead.clientChatKey?.trim() || `report-${lead.id.replace(/-/g, "").slice(0, 12)}`;
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

async function resolveReportChatOperatorIds() {
  const operators = await listInternalOperators().catch(() => []);
  return operators
    .filter((operator) => operator.status === "Active")
    .slice(0, REPORT_CHAT_OPERATOR_LIMIT)
    .map((operator) => operator.id);
}

async function ensureReportMessagingChannel(lead: CrmLead, operatorIds: string[]) {
  const clientChatKey = buildClientChatKey(lead);
  const members = Array.from(new Set(operatorIds.filter(Boolean)));
  const scope = leadWorkspaceScope(lead);

  if (lead.clientChatRoom) {
    const existing = await getChannelByRoom(lead.clientChatRoom, scope);
    if (existing) {
      if (members.length > 0) {
        await updateChannelMembers(existing.id, members, scope).catch(() => existing);
      }
      return { channel: existing, clientChatKey };
    }
  }

  const channel = await createChannel(
    {
      name: `${lead.companyName.trim() || "Client"} — Report`,
      channelType: "client",
      clientKey: clientChatKey,
      createdByOperatorId: members[0] ?? "system",
      createdByOperatorName: "System",
      memberOperatorIds: members.length > 0 ? members : ["system"],
      memberClientUsernames: [clientChatKey],
      description: `Client report discussion for ${lead.companyName}`,
    },
    scope,
  );

  return { channel, clientChatKey };
}

async function loadLeadReportContext(leadId: string) {
  const lead = await getLeadById(leadId);
  if (!lead) {
    throw new Error("Lead not found.");
  }

  const [questionnaire, logo] = await Promise.all([
    getDiscoveryQuestionnaire(leadId),
    loadClientReportLogoForLead(lead),
  ]);
  return { lead, questionnaire, logo };
}

function leadWorkspaceScope(lead: CrmLead) {
  return lead.workspaceId ? { workspaceId: lead.workspaceId } : undefined;
}

export type GenerateCrmClientReportPptxResult = {
  leadId: string;
  pptFileName: string;
  pptFileId: string;
  folderId: string;
  alertCreated: boolean;
};

export type GenerateAndSendCrmClientReportResult = {
  leadId: string;
  fileName: string;
  chatUrl: string;
  clientEmailed: boolean;
  adminEmailed: boolean;
  messagingUpdated: boolean;
  alertCreated: boolean;
  meetingsLinked: number;
};

/** Auto-run after discovery questions are saved — PowerPoint draft only. */
export async function generateCrmClientReportPptxDraft(
  leadId: string,
): Promise<GenerateCrmClientReportPptxResult> {
  await ensureCrmClientReportSchema().catch(() => false);
  const { lead, questionnaire, logo } = await loadLeadReportContext(leadId);

  const pptxBytes = await buildCrmClientReportPptx(lead, questionnaire, logo);
  const pptFileName = clientReportPptxFileName(lead.companyName);
  const folderId = (await ensureExternalClientFolder(lead.companyName)).id;
  const generatedAt = new Date().toISOString();

  const uploadedPpt = await uploadFile({
    file: toUploadFile(
      pptFileName,
      Buffer.from(pptxBytes),
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ),
    folderId,
    categoryId: null,
  });

  await updateLead(
    leadId,
    {
      clientReportPptFileId: uploadedPpt.id,
      clientReportPptFileName: pptFileName,
      clientReportGeneratedAt: generatedAt,
      clientReportFileId: null,
      clientReportFileName: null,
      clientReportSentAt: null,
      nextAction: "Review PowerPoint report draft",
      notes: appendNotes(
        lead.notes,
        `Discovery report PowerPoint generated on ${formatLondonDateTime(generatedAt)} GMT.`,
      ),
    },
    leadWorkspaceScope(lead),
  );

  let alertCreated = false;
  try {
    await createActionItem({
      priority: "high",
      task: `Review PowerPoint report — ${lead.companyName} (${lead.contactName})`,
      assignedTo: "Team",
      dueLabel: formatLondonDateTime(generatedAt),
      href: "/internaldashboard?view=crm",
      crmLeadId: lead.id,
    });
    alertCreated = true;
  } catch {
    // Non-blocking if action items table is unavailable.
  }

  return {
    leadId,
    pptFileName,
    pptFileId: uploadedPpt.id,
    folderId,
    alertCreated,
  };
}

/** Generate PDF from questionnaire, email client, create guest chat, update CRM + meetings. */
export async function generateAndSendCrmClientReportPdf(
  leadId: string,
): Promise<GenerateAndSendCrmClientReportResult> {
  const { lead, questionnaire, logo } = await loadLeadReportContext(leadId);

  if (!lead.clientReportPptFileId) {
    throw new Error("Generate the PowerPoint draft first by saving discovery questions.");
  }

  if (lead.clientReportSentAt) {
    throw new Error("This client report has already been sent.");
  }

  if (!lead.email.trim()) {
    throw new Error("Add a client email on the lead record before generating the PDF.");
  }

  const pdfBytes = await buildCrmClientReportPdf(lead, questionnaire, logo);
  const pdfFileName = clientReportFileName(lead.companyName);
  const folderId = (await ensureExternalClientFolder(lead.companyName)).id;

  const uploadedPdf = await uploadFile({
    file: toUploadFile(pdfFileName, Buffer.from(pdfBytes), "application/pdf"),
    folderId,
    categoryId: null,
  });

  await updateLead(
    leadId,
    {
      clientReportFileId: uploadedPdf.id,
      clientReportFileName: pdfFileName,
    },
    leadWorkspaceScope(lead),
  );

  const savedPdf = await downloadFileBuffer(uploadedPdf.id);
  const fileName = pdfFileName || savedPdf.name;

  const operatorIds = await resolveReportChatOperatorIds();
  const accessToken = lead.clientChatAccessToken?.trim() || randomUUID();
  const { channel, clientChatKey } = await ensureReportMessagingChannel(lead, operatorIds);
  const chatUrl = buildReportChatUrl(accessToken);
  const signupUrl = buildCrmSignupInviteUrl(lead.id);

  const clientMessage = buildClientReportEmail({
    contactName: lead.contactName,
    companyName: lead.companyName,
    chatUrl,
    signupUrl,
  });

  let clientEmailed = false;
  let clientReportMessageId: string | null = null;
  try {
    const sendResult = await sendMailboxEmail({
      account: "info",
      to: lead.email.trim(),
      replyTo: CONTACT.infoEmail,
      subject: clientMessage.subject,
      html: clientMessage.html,
      text: clientMessage.text,
      attachments: [
        {
          filename: fileName,
          content: savedPdf.buffer,
          contentType: "application/pdf",
        },
      ],
    });
    clientReportMessageId = sendResult.messageId;
    clientEmailed = true;
  } catch (error) {
    throw new Error(
      `Failed to email client: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  let adminEmailed = false;
  try {
    const adminMessage = buildAdminReportNotificationEmail({
      companyName: lead.companyName,
      contactName: lead.contactName,
      contactEmail: lead.email.trim(),
      fileName,
      chatUrl,
    });
    await sendMailboxEmail({
      account: "info",
      to: CONTACT.infoEmail,
      subject: adminMessage.subject,
      html: adminMessage.html,
      text: adminMessage.text,
      attachments: [
        {
          filename: fileName,
          content: savedPdf.buffer,
          contentType: "application/pdf",
        },
      ],
    });
    adminEmailed = true;
  } catch {
    // Non-blocking for internal copy.
  }

  let messagingUpdated = false;
  try {
    await sendMessage(
      {
        operatorId: "system",
        operatorName: "System",
        username: "system",
        room: channel.room,
        messageType: "system",
        content: [
          `Client report sent for ${lead.companyName}.`,
          `PDF emailed to ${lead.contactName} (${lead.email.trim()}).`,
          `Saved files: ${fileName}${lead.clientReportPptFileName ? `, ${lead.clientReportPptFileName}` : ""}`,
          `Guest chat (no login): ${chatUrl}`,
        ].join("\n"),
      },
      leadWorkspaceScope(lead),
    );
    messagingUpdated = true;
  } catch {
    // Non-blocking if messaging is unavailable.
  }

  const sentAt = new Date().toISOString();
  const linkedMeetings = await resolveBookingsForCrmLead(lead).catch(() => []);

  let alertCreated = false;
  try {
    await createActionItem({
      priority: "medium",
      task: `Report sent — ${lead.companyName} (${lead.contactName})`,
      assignedTo: "Team",
      dueLabel: formatLondonDateTime(sentAt),
      href: "/internaldashboard?view=messaging",
      crmLeadId: lead.id,
    });
    alertCreated = true;
  } catch {
    // Non-blocking if action items table is unavailable.
  }

  await updateLead(
    leadId,
    {
      clientReportSentAt: sentAt,
      clientReportMessageId,
      clientReportRepliedAt: null,
      clientReportReminder7dSentAt: null,
      clientReportReminder14dSentAt: null,
      clientReportLastReminderSentAt: null,
      clientChatRoom: channel.room,
      clientChatKey,
      clientChatAccessToken: accessToken,
      nextAction: "Follow up on executive report",
      notes: appendNotes(
        lead.notes,
        [
          `Executive report PDF emailed to ${lead.email.trim()} on ${formatLondonDateTime(sentAt)} GMT.`,
          `Guest chat: ${chatUrl}`,
          linkedMeetings.length > 0
            ? `Linked executive session${linkedMeetings.length === 1 ? "" : "s"}: ${linkedMeetings.length}.`
            : null,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    },
    leadWorkspaceScope(lead),
  );

  return {
    leadId,
    fileName,
    chatUrl,
    clientEmailed,
    adminEmailed,
    messagingUpdated,
    alertCreated,
    meetingsLinked: linkedMeetings.length,
  };
}

/** @deprecated Use generateCrmClientReportPptxDraft + generateAndSendCrmClientReportPdf */
export async function generateCrmClientReport(leadId: string) {
  const ppt = await generateCrmClientReportPptxDraft(leadId);
  return {
    leadId,
    pdfFileName: "",
    pptFileName: ppt.pptFileName,
    pdfFileId: "",
    pptFileId: ppt.pptFileId,
    folderId: ppt.folderId,
    adminNotified: false,
    alertCreated: ppt.alertCreated,
  };
}

/** @deprecated Use generateAndSendCrmClientReportPdf */
export async function approveCrmClientReport(leadId: string) {
  const result = await generateAndSendCrmClientReportPdf(leadId);
  return {
    leadId: result.leadId,
    fileName: result.fileName,
    chatUrl: result.chatUrl,
    clientEmailed: result.clientEmailed,
    adminEmailed: result.adminEmailed,
    messagingUpdated: result.messagingUpdated,
    alertCreated: result.alertCreated,
  };
}

export async function getReportChatSession(accessToken: string) {
  const lead = await getLeadByReportChatToken(accessToken);
  if (!lead?.clientChatRoom) {
    return null;
  }

  return {
    companyName: lead.companyName,
    contactName: lead.contactName,
    room: lead.clientChatRoom,
    clientChatKey: buildClientChatKey(lead),
    workspaceId: lead.workspaceId ?? null,
  };
}

export async function sendReportChatGuestMessage(accessToken: string, content: string) {
  const session = await getReportChatSession(accessToken);
  if (!session) {
    throw new Error("Chat session not found.");
  }

  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Message cannot be empty.");
  }

  return sendMessage(
    {
      operatorId: `guest:${session.clientChatKey}`,
      operatorName: session.contactName.trim() || session.companyName.trim() || "Client",
      username: session.clientChatKey,
      content: trimmed,
      room: session.room,
      messageType: "text",
    },
    session.workspaceId ? { workspaceId: session.workspaceId } : undefined,
  );
}

export async function openClientReportPptxDownload(leadId: string) {
  const lead = await getLeadById(leadId);
  if (!lead?.clientReportPptFileId) {
    throw new Error("PowerPoint draft not found. Save discovery questions first.");
  }

  const saved = await downloadFileBuffer(lead.clientReportPptFileId);
  return {
    fileId: lead.clientReportPptFileId,
    fileName: lead.clientReportPptFileName ?? saved.name,
    buffer: saved.buffer,
    mimeType: saved.mimeType,
  };
}
