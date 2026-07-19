import { NextRequest, NextResponse } from "next/server";

import { parseAccountId } from "@/lib/email/accounts";
import { emailErrorResponse } from "@/lib/email/api-utils";
import { fetchAttachmentContent } from "@/lib/email/imap";
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
  const messageId = request.nextUrl.searchParams.get("messageId");
  const partId = request.nextUrl.searchParams.get("partId");

  if (!account || !messageId || partId === null) {
    return NextResponse.json(
      { error: "account, messageId, and partId are required." },
      { status: 400 },
    );
  }

  try {
    await requirePlatformSession();
    await requireCurrentWorkspace();

    const attachment = await fetchAttachmentContent(account, messageId, partId);
    return new NextResponse(new Uint8Array(attachment.content), {
      headers: {
        "Content-Type": attachment.contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && authErrorStatus(error.message) === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return emailErrorResponse(error, "Failed to download attachment.");
  }
}
