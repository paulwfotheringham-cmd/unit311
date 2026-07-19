import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import {
  getAccountCredentials,
  ZOHO_SMTP_HOST,
  ZOHO_SMTP_PORT,
} from "@/lib/email/accounts";
import { fetchMailboxMessageById } from "@/lib/email/imap";
import {
  EmailServiceError,
  type EmailAccountId,
  type EmailReplyPayload,
  type EmailSendPayload,
} from "@/lib/email/types";

function createTransport(
  accountId: EmailAccountId,
  scope?: { workspaceId?: string | null },
) {
  return getAccountCredentials(accountId, scope).then((credentials) => ({
    credentials,
    transport: nodemailer.createTransport({
      host: ZOHO_SMTP_HOST,
      port: ZOHO_SMTP_PORT,
      secure: true,
      auth: {
        user: credentials.email,
        pass: credentials.password,
      },
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 30_000,
    } satisfies SMTPTransport.Options),
  }));
}

export async function verifyMailboxTransport(
  accountId: EmailAccountId,
  scope?: { workspaceId?: string | null },
) {
  const { credentials, transport } = await createTransport(accountId, scope);

  try {
    await transport.verify();
    return {
      ok: true as const,
      account: accountId,
      email: credentials.email,
      host: ZOHO_SMTP_HOST,
      port: ZOHO_SMTP_PORT,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP verification failed.";
    throw new EmailServiceError(message, "SEND_FAILED");
  } finally {
    transport.close();
  }
}

function parseRecipients(value: string | undefined) {
  if (!value?.trim()) return undefined;
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function sendMailboxEmail(payload: EmailSendPayload) {
  const { credentials, transport } = await createTransport(payload.account, {
    workspaceId: payload.workspaceId,
  });

  try {
    const info = await transport.sendMail({
      from: credentials.email,
      to: parseRecipients(payload.to),
      cc: parseRecipients(payload.cc),
      bcc: parseRecipients(payload.bcc),
      replyTo: parseRecipients(payload.replyTo)?.join(", "),
      subject: payload.subject,
      text: payload.text,
      html: payload.html ?? payload.text,
      inReplyTo: payload.inReplyTo ?? undefined,
      references:
        payload.references && payload.references.length > 0 ? payload.references : undefined,
      attachments: payload.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });

    return {
      messageId: info.messageId ?? null,
      accepted: info.accepted,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    throw new EmailServiceError(message, "SEND_FAILED");
  } finally {
    transport.close();
  }
}

function buildReplySubject(subject: string) {
  return subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;
}

export async function sendMailboxReply(payload: EmailReplyPayload) {
  const original = payload.context
    ? null
    : await fetchMailboxMessageById(payload.account, payload.messageId);

  const replyTo =
    payload.context?.to?.trim() ||
    original?.fromEmail ||
    original?.from ||
    "";
  if (!replyTo) {
    throw new EmailServiceError("Reply recipient is missing.", "SEND_FAILED");
  }

  const baseSubject = payload.context?.subject ?? original?.subject ?? "(No subject)";
  const subject = buildReplySubject(baseSubject);
  const text = payload.text ?? payload.html?.replace(/<[^>]+>/g, " ") ?? "";
  const html = payload.html ?? `<p>${text.replace(/\n/g, "<br/>")}</p>`;

  const threadingMessageId = payload.context?.messageId ?? original?.messageId ?? null;
  const threadingReferences = payload.context?.references ?? original?.references ?? [];
  const references = threadingMessageId
    ? [...threadingReferences, threadingMessageId].filter(Boolean)
    : threadingReferences;

  const { credentials, transport } = await createTransport(payload.account);

  try {
    const info = await transport.sendMail({
      from: credentials.email,
      to: replyTo,
      subject,
      text,
      html,
      inReplyTo: threadingMessageId ?? undefined,
      references: references.length > 0 ? references : undefined,
    });

    return {
      messageId: info.messageId ?? null,
      accepted: info.accepted,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send reply.";
    throw new EmailServiceError(message, "SEND_FAILED");
  } finally {
    transport.close();
  }
}
