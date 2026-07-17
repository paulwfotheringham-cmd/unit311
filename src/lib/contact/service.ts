import {
  buildContactConfirmationEmail,
  buildContactInternalNotificationEmail,
  type ContactEnquiryInput,
} from "@/lib/contact/emails";
import { recordWebsiteContactEnquiry } from "@/lib/crm-contact-service";
import { getAccountDefinition } from "@/lib/email/accounts";
import { sendMailboxEmail } from "@/lib/email/smtp";
import { EmailServiceError } from "@/lib/email/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveWorkspaceBinding } from "@/lib/workspace-context";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeInput(input: {
  firstName?: string;
  surname?: string;
  organisation?: string;
  role?: string;
  email?: string;
  subject?: string;
  message?: string;
  /** @deprecated legacy field */
  name?: string;
  /** @deprecated legacy field */
  company?: string;
}): ContactEnquiryInput {
  const firstName =
    input.firstName?.trim() || (input.name?.trim().split(/\s+/)[0] ?? "");
  const surname =
    input.surname?.trim() ||
    (input.name?.trim().split(/\s+/).slice(1).join(" ") ?? "");
  const organisation = input.organisation?.trim() || input.company?.trim() || "";
  const role = input.role?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const subject = input.subject?.trim() ?? "";
  const message = input.message?.trim() ?? "";

  if (!firstName) throw new Error("First name is required.");
  if (!surname) throw new Error("Surname is required.");
  if (!organisation) throw new Error("Organisation is required.");
  if (!email) throw new Error("Email is required.");
  if (!EMAIL_PATTERN.test(email)) throw new Error("Please enter a valid email address.");
  if (!message) throw new Error("Message is required.");
  if (firstName.length > 80) throw new Error("First name is too long.");
  if (surname.length > 80) throw new Error("Surname is too long.");
  if (organisation.length > 160) throw new Error("Organisation is too long.");
  if (role.length > 120) throw new Error("Role is too long.");
  if (subject.length > 200) throw new Error("Subject is too long.");
  if (message.length > 8000) throw new Error("Message is too long.");

  return { firstName, surname, organisation, role, email, subject, message };
}

async function sendWithRetry(
  payload: Parameters<typeof sendMailboxEmail>[0],
  attempts = 2,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await sendMailboxEmail(payload);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export async function sendContactEnquiry(rawInput: {
  firstName?: string;
  surname?: string;
  organisation?: string;
  role?: string;
  email?: string;
  subject?: string;
  message?: string;
  name?: string;
  company?: string;
}) {
  const input = normalizeInput(rawInput);
  const confirmation = buildContactConfirmationEmail(input);
  const internal = buildContactInternalNotificationEmail(input);
  const infoEmail = getAccountDefinition("info").email;

  try {
    const internalResult = await sendWithRetry({
      account: "info",
      to: infoEmail,
      replyTo: input.email,
      subject: internal.subject,
      html: internal.html,
      text: internal.text,
    });

    // Acknowledgement email to the sender — stored in the Email module Sent mailbox via SMTP.
    const confirmationResult = await sendWithRetry({
      account: "info",
      to: input.email,
      subject: confirmation.subject,
      html: confirmation.html,
      text: confirmation.text,
    });

    let crmLeadId: string | null = null;
    let ambiguousMatch = false;
    if (isSupabaseConfigured()) {
      try {
        const internal = await resolveWorkspaceBinding({ fallbackInternal: true });
        if (!internal) {
          throw new Error("Internal workspace is required for CRM contact sync.");
        }
        const crm = await recordWebsiteContactEnquiry({
          ...input,
          notificationEmailMessageId: internalResult.messageId,
          confirmationEmailMessageId: confirmationResult.messageId,
          workspaceId: internal.id,
        });
        crmLeadId = crm.lead.id;
        ambiguousMatch = crm.ambiguousMatch;
      } catch (crmError) {
        console.error("[contact] CRM sync failed", {
          email: input.email,
          error: crmError instanceof Error ? crmError.message : crmError,
        });
      }
    }

    return {
      confirmationMessageId: confirmationResult.messageId,
      internalMessageId: internalResult.messageId,
      crmLeadId,
      ambiguousMatch,
    };
  } catch (error) {
    console.error("[contact] send failed", {
      email: input.email,
      error: error instanceof Error ? error.message : error,
    });

    if (error instanceof EmailServiceError) {
      throw new Error(
        error.code === "NOT_CONFIGURED" || error.message.includes("not configured")
          ? "Email is not configured yet. Please email us directly at info@unit311central.com."
          : "We couldn't send your enquiry right now. Please try again or email info@unit311central.com.",
      );
    }
    throw error instanceof Error
      ? error
      : new Error("We couldn't send your enquiry right now. Please try again.");
  }
}
