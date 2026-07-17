import { NextRequest, NextResponse } from "next/server";

import { parseAccountId } from "@/lib/email/accounts";
import { emailErrorResponse } from "@/lib/email/api-utils";
import { fetchMailboxMessages } from "@/lib/email/imap";
import { processInfoMailboxWhatsAppNotifications } from "@/lib/email/whatsapp-notifications";
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

export async function GET(request: NextRequest) {
  const account = parseAccountId(request.nextUrl.searchParams.get("account"));
  if (!account) {
    return NextResponse.json({ error: "Valid account query parameter is required." }, { status: 400 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const messages = await fetchMailboxMessages(account);
    if (account === "info") {
      void processInfoMailboxWhatsAppNotifications(messages, scope).catch((error) => {
        console.error("[email/whatsapp] notification check failed", error);
      });
    }
    return NextResponse.json(messages);
  } catch (error) {
    if (error instanceof Error && authErrorStatus(error.message) === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return emailErrorResponse(error, "Failed to load mailbox messages.");
  }
}
