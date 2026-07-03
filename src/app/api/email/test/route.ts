import { NextRequest, NextResponse } from "next/server";

import { isAccountConfigured, parseAccountId } from "@/lib/email/accounts";
import { emailErrorResponse } from "@/lib/email/api-utils";
import { fetchMailboxMessages } from "@/lib/email/imap";
import { sendMailboxEmail, verifyMailboxTransport } from "@/lib/email/smtp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const account = parseAccountId(request.nextUrl.searchParams.get("account")) ?? "info";

    if (!(await isAccountConfigured(account))) {
      return NextResponse.json(
        { ok: false, error: `Mailbox "${account}" is not configured.` },
        { status: 400 },
      );
    }

    const smtp = await verifyMailboxTransport(account);

    let imap: { ok: boolean; account: string; messageCountSample?: number; error?: string };
    try {
      const messages = await fetchMailboxMessages(account, 1);
      imap = { ok: true, account, messageCountSample: messages.length };
    } catch (imapError) {
      imap = {
        ok: false,
        account,
        error: imapError instanceof Error ? imapError.message : "IMAP connection failed.",
      };
    }

    return NextResponse.json({
      ok: smtp.ok,
      smtp,
      imap,
    });
  } catch (error) {
    return emailErrorResponse(error, "Email connection test failed.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      account?: string;
      to?: string;
      subject?: string;
    };

    const account = parseAccountId(body.account ?? null) ?? "info";
    const to = body.to?.trim() || "info@unit311central.com";

    if (!(await isAccountConfigured(account))) {
      return NextResponse.json(
        { ok: false, error: `Mailbox "${account}" is not configured.` },
        { status: 400 },
      );
    }

    await verifyMailboxTransport(account);

    const timestamp = new Date().toISOString();
    const subject = body.subject?.trim() || `Unit311 Central SMTP test ${timestamp.slice(11, 19)} UTC`;

    const result = await sendMailboxEmail({
      account,
      to,
      subject,
      text: [
        "This is an automated SMTP test from Unit311 Central.",
        "",
        `Sent at: ${timestamp}`,
        `Mailbox: ${account}`,
      ].join("\n"),
      html: `<p>This is an automated SMTP test from <strong>Unit311 Central</strong>.</p><p><strong>Sent at:</strong> ${timestamp}</p>`,
    });

    return NextResponse.json({
      ok: true,
      account,
      to,
      subject,
      messageId: result.messageId,
      accepted: result.accepted,
    });
  } catch (error) {
    return emailErrorResponse(error, "Email test send failed.");
  }
}
