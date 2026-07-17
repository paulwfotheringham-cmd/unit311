import { NextResponse } from "next/server";

import { emailErrorResponse } from "@/lib/email/api-utils";
import { sendMailboxEmail } from "@/lib/email/smtp";
import { isAccountConfigured } from "@/lib/email/accounts";
import {
  processInfoMailboxWhatsAppNotifications,
  sendWhatsAppTestNotification,
} from "@/lib/email/whatsapp-notifications";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authErrorStatus(message: string) {
  return message.includes("Authentication required") || message.includes("Workspace context")
    ? 401
    : 500;
}

export async function POST() {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const timestamp = new Date().toISOString();
    const subject = `Unit311 WhatsApp alert test ${timestamp.slice(11, 19)} UTC`;
    const sendAccount = (await isAccountConfigured("info")) ? "info" : "paul";

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

    const notifyResult = await processInfoMailboxWhatsAppNotifications(undefined, scope);
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
    if (error instanceof Error && authErrorStatus(error.message) === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return emailErrorResponse(error, "Notification test failed.");
  }
}
