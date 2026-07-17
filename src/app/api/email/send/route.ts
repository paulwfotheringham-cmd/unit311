import { NextRequest, NextResponse } from "next/server";

import { parseAccountId } from "@/lib/email/accounts";
import { emailErrorResponse } from "@/lib/email/api-utils";
import { sendMailboxEmail } from "@/lib/email/smtp";
import type { EmailAccountId } from "@/lib/email/types";
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

export async function POST(request: NextRequest) {
  try {
    await requirePlatformSession();
    await requireCurrentWorkspace();

    const body = (await request.json()) as {
      account?: EmailAccountId;
      to?: string;
      cc?: string;
      bcc?: string;
      subject?: string;
      html?: string;
      text?: string;
    };

    const account = parseAccountId(body.account ?? null);
    if (!account) {
      return NextResponse.json({ error: "Valid account is required." }, { status: 400 });
    }
    if (!body.to?.trim()) {
      return NextResponse.json({ error: "Recipient is required." }, { status: 400 });
    }
    if (!body.subject?.trim()) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    const result = await sendMailboxEmail({
      account,
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      html: body.html,
      text: body.text,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && authErrorStatus(error.message) === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return emailErrorResponse(error, "Failed to send email.");
  }
}
