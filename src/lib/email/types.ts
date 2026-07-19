export type EmailAccountId = "info" | "paul" | "admin";

export type EmailAccount = {
  id: EmailAccountId;
  email: string;
  name: string;
};

export type EmailAttachmentMeta = {
  filename: string;
  contentType: string;
  size: number;
  partId: string;
};

export type EmailMessage = {
  id: string;
  uid: number;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  to: string[];
  cc: string[];
  bcc: string[];
  date: string;
  snippet: string;
  body: string;
  html: string;
  unread: boolean;
  attachments: EmailAttachmentMeta[];
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  direction: "inbound" | "outbound";
};

export type EmailThreadStatus = "unread" | "open" | "replied" | "closed";

export type EmailSendAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
};

export type EmailSendPayload = {
  account: EmailAccountId;
  to: string;
  cc?: string;
  bcc?: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailSendAttachment[];
  inReplyTo?: string | null;
  references?: string[];
  /** Explicit tenant for DB/memory mailbox credentials (public/system callers). */
  workspaceId?: string | null;
};

export type EmailReplyContext = {
  to: string;
  subject: string;
  messageId?: string | null;
  references?: string[];
};

export type EmailReplyPayload = {
  account: EmailAccountId;
  messageId: string;
  html?: string;
  text?: string;
  /** When provided, SMTP send skips IMAP re-fetch (required when inbox read is unavailable). */
  context?: EmailReplyContext;
};

export class EmailServiceError extends Error {
  readonly code: "NOT_CONFIGURED" | "CONNECTION_FAILED" | "NOT_FOUND" | "SEND_FAILED";

  constructor(
    message: string,
    code: "NOT_CONFIGURED" | "CONNECTION_FAILED" | "NOT_FOUND" | "SEND_FAILED",
  ) {
    super(message);
    this.name = "EmailServiceError";
    this.code = code;
  }
}
