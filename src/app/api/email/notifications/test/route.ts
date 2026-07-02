import { NextResponse } from "next/server";

import { emailErrorResponse } from "@/lib/email/api-utils";
import { sendMailboxEmail } from "@/lib/email/smtp";
import { isAccountConfigured } from "@/lib/email/accounts";
import {
  processInfoMailboxWhatsAppNotifications,
  sendWhatsAppTestNotification,
} from "@/lib/email/whatsapp-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const timestamp = new Date().toISOString();
    const subject = `Unit311 WhatsApp alert test ${timestamp.slice(11, 19)} UTC`;
    const sendAccount = (await isAccountConfigured("paul")) ? "paul" : "info";

    const emailResult = await sendMailboxEmail({
      account: sendAccount,
      to: "hello@unit311.com",
      subject,
      text: [
        "This is an automated test message for the info@ WhatsApp notification flow.",
        "",
        `Sent at: ${timestamp}`,
      ].join("\n"),
      html: `<p>This is an automated test message for the info@ WhatsApp notification flow.</p><p><strong>Sent at:</strong> ${timestamp}</p>`,
    });

    const notifyResult = await processInfoMailboxWhatsAppNotifications();
    const whatsappTest = await sendWhatsAppTestNotification().catch((error) => ({
      ok: false as const,
      error: error instanceof Error ? error.message : "WhatsApp test failed.",
    }));

    return NextResponse.json({
      ok: true,
      email: emailResult,
      notifications: notifyResult,
      whatsappTest,
      subject,
    });
  } catch (error) {
    return emailErrorResponse(error, "Notification test failed.");
  }
}
