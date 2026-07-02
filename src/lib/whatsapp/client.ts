import { WhatsAppServiceError } from "@/lib/whatsapp/types";

export const DEFAULT_WHATSAPP_NOTIFY_PHONE = "34657106176";

export function normalizeWhatsAppPhone(value: string | undefined | null) {
  const digits = (value ?? DEFAULT_WHATSAPP_NOTIFY_PHONE).replace(/\D/g, "");
  if (!digits) return DEFAULT_WHATSAPP_NOTIFY_PHONE;
  return digits;
}

export function getWhatsAppNotifyPhone() {
  return normalizeWhatsAppPhone(process.env.WHATSAPP_NOTIFY_PHONE);
}

export function isTextMeBotConfigured() {
  return Boolean(process.env.TEXTMEBOT_API_KEY?.trim());
}

export function isWhatsAppConfigured() {
  return Boolean(process.env.CALLMEBOT_API_KEY?.trim() || process.env.TEXTMEBOT_API_KEY?.trim());
}

export function formatSupportTicketOpenedMessage(ticketId: string, organisation: string, name: string) {
  return [
    "Unit311 Support ticket opened",
    `ID: ${ticketId}`,
    `Client: ${organisation}`,
    `Contact: ${name}`,
  ].join("\n");
}

export function formatSupportTicketCreatedMessage(ticketId: string) {
  return `Support ticket ${ticketId} created.`;
}

export function formatSupportTicketSubmittedMessage(ticketId: string) {
  return `Ticket submitted. Your ticket number is ${ticketId}.`;
}

export function formatSupportTicketClientAssignedMessage(ticketId: string, assigneeLabel: string) {
  return `Support ticket ${ticketId} created. ${assigneeLabel} assigned. Please wait for further communications`;
}

export function formatSupportTicketBatchCompleteMessage(
  ticketId: string,
  name: string,
  organisation: string,
  priorityLabel: string,
) {
  return [
    `Ticket submitted. Your ticket number is ${ticketId}.`,
    `${organisation} · ${name}`,
    `Priority: ${priorityLabel}`,
  ].join("\n");
}

export function formatSupportTicketAssignmentPromptMessage() {
  return "Which user should be assigned to?";
}

export function formatSupportTicketAssignedMessage(assigneeLabel: string) {
  return `${assigneeLabel.replace(/\s+/g, "")} assigned`;
}

export function formatWhatsAppReceiveHelpMessage(siteUrl: string) {
  return [
    "Unit311 Support intake",
    "Typing to CallMeBot does not reach our server.",
    "Message your TextMeBot-linked support number instead, or open:",
    `${siteUrl}/whatsapp/support`,
  ].join("\n");
}

export function formatSupportTicketClaimedMessage(username: string, ticketId: string) {
  return `User ${username} is working on it (${ticketId})`;
}

export function formatSupportTicketClosedMessage(ticketId: string) {
  return `Ticket ${ticketId} is now closed.`;
}

async function sendViaTextMeBot(text: string, recipient: string) {
  const apiKey = process.env.TEXTMEBOT_API_KEY?.trim();
  if (!apiKey) {
    throw new WhatsAppServiceError("TextMeBot is not configured.", "NOT_CONFIGURED");
  }

  const phone = normalizeWhatsAppPhone(recipient);
  const url = new URL("https://api.textmebot.com/send.php");
  url.searchParams.set("recipient", phone);
  url.searchParams.set("text", text);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const body = (await response.text()).trim();

  if (!response.ok) {
    throw new WhatsAppServiceError(body || `TextMeBot request failed (${response.status}).`, "SEND_FAILED");
  }

  if (/error/i.test(body)) {
    throw new WhatsAppServiceError(body, "SEND_FAILED");
  }

  return { ok: true as const, phone, response: body || "Message sent." };
}

async function sendViaCallMeBot(text: string, recipient: string) {
  const apiKey = process.env.CALLMEBOT_API_KEY?.trim();
  if (!apiKey) {
    throw new WhatsAppServiceError("CallMeBot is not configured.", "NOT_CONFIGURED");
  }

  const phone = normalizeWhatsAppPhone(recipient);
  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone);
  url.searchParams.set("text", text);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const body = (await response.text()).trim();

  if (!response.ok) {
    throw new WhatsAppServiceError(body || `WhatsApp request failed (${response.status}).`, "SEND_FAILED");
  }

  if (/error/i.test(body)) {
    throw new WhatsAppServiceError(body, "SEND_FAILED");
  }

  return { ok: true as const, phone, response: body || "Message sent." };
}

export async function sendWhatsAppMessage(text: string, recipient?: string | null) {
  const targetPhone = normalizeWhatsAppPhone(recipient ?? getWhatsAppNotifyPhone());

  if (!isWhatsAppConfigured()) {
    throw new WhatsAppServiceError(
      "WhatsApp is not configured. Set TEXTMEBOT_API_KEY or CALLMEBOT_API_KEY on the server.",
      "NOT_CONFIGURED",
    );
  }

  const callMeBotKey = process.env.CALLMEBOT_API_KEY?.trim();
  const errors: string[] = [];

  // CallMeBot is more reliable for ticket replies to the operator phone.
  if (callMeBotKey) {
    try {
      return await sendViaCallMeBot(text, targetPhone);
    } catch (error) {
      const message = error instanceof Error ? error.message : "CallMeBot send failed";
      errors.push(message);
    }
  }

  if (isTextMeBotConfigured()) {
    try {
      return await sendViaTextMeBot(text, targetPhone);
    } catch (error) {
      const message = error instanceof Error ? error.message : "TextMeBot send failed";
      errors.push(message);
    }
  }

  throw new WhatsAppServiceError(errors.join(" | ") || "Failed to send WhatsApp message.", "SEND_FAILED");
}
