import { EmailServiceError } from "@/lib/email/types";

export const DEFAULT_WHATSAPP_NOTIFY_PHONE = "34657106176";
export const FOUNDER_BOOKING_WHATSAPP_PHONE = "34613014937";

export function normalizeWhatsAppPhone(value: string | undefined | null) {
  const digits = (value ?? DEFAULT_WHATSAPP_NOTIFY_PHONE).replace(/\D/g, "");
  if (!digits) return DEFAULT_WHATSAPP_NOTIFY_PHONE;
  return digits;
}

export function getWhatsAppNotifyPhone() {
  return normalizeWhatsAppPhone(process.env.WHATSAPP_NOTIFY_PHONE);
}

export function isWhatsAppConfigured() {
  return Boolean(process.env.CALLMEBOT_API_KEY?.trim());
}

export function formatNewEmailWhatsAppMessage(fromName: string, subject: string) {
  return [
    "New email to hello@unit311.com",
    `From: ${fromName.trim() || "Unknown"}`,
    `Subject: ${subject.trim() || "(No subject)"}`,
  ].join("\n");
}

export function formatClientChannelWhatsAppMessage(
  channelName: string,
  createdAt: string,
  content: string,
) {
  const firstLine = content.trim().split(/\r?\n/)[0]?.trim() || "(No message)";
  const when = new Date(createdAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return [
    "Westport client message",
    `Channel: ${channelName.trim() || "Shared channel"}`,
    when,
    firstLine,
  ].join("\n");
}

export function getFounderBookingWhatsAppPhone() {
  return normalizeWhatsAppPhone(
    process.env.FOUNDER_BOOKING_WHATSAPP_PHONE ?? FOUNDER_BOOKING_WHATSAPP_PHONE,
  );
}

export function formatFounderBookingWhatsAppMessage(input: {
  name: string;
  organization: string;
  role?: string;
  email: string;
  startsAtGmt: string;
  videoLink: string;
}) {
  return [
    "Unit311 Central — new executive session booked",
    `${input.name} · ${input.organization}`,
    input.role ? `Role: ${input.role}` : null,
    input.email,
    `When (GMT): ${input.startsAtGmt}`,
    input.videoLink,
  ].filter(Boolean).join("\n");
}

export async function sendWhatsAppMessage(text: string, phone?: string) {
  const apiKey = process.env.CALLMEBOT_API_KEY?.trim();
  if (!apiKey) {
    throw new EmailServiceError(
      "WhatsApp is not configured. Set CALLMEBOT_API_KEY on the server.",
      "NOT_CONFIGURED",
    );
  }

  const targetPhone = normalizeWhatsAppPhone(phone ?? getWhatsAppNotifyPhone());
  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", targetPhone);
  url.searchParams.set("text", text);
  url.searchParams.set("apikey", apiKey);

  try {
    const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    const body = (await response.text()).trim();

    if (!response.ok) {
      throw new EmailServiceError(
        body || `WhatsApp request failed (${response.status}).`,
        "SEND_FAILED",
      );
    }

    if (/error/i.test(body)) {
      throw new EmailServiceError(body, "SEND_FAILED");
    }

    return { ok: true as const, phone: targetPhone, response: body || "Message sent." };
  } catch (error) {
    if (error instanceof EmailServiceError) throw error;
    const message = error instanceof Error ? error.message : "Failed to send WhatsApp message.";
    throw new EmailServiceError(message, "SEND_FAILED");
  }
}

export async function sendFounderBookingWhatsAppMessage(text: string) {
  return sendWhatsAppMessage(text, getFounderBookingWhatsAppPhone());
}
