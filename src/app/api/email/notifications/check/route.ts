import { NextResponse } from "next/server";

import { emailErrorResponse } from "@/lib/email/api-utils";
import { processInfoMailboxWhatsAppNotifications } from "@/lib/email/whatsapp-notifications";
import { ensureEmailInfrastructureTables } from "@/lib/internal-db-migrations";
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

/** Lightweight poll endpoint for background WhatsApp alert checks. */
export async function GET() {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    await ensureEmailInfrastructureTables();
    const result = await processInfoMailboxWhatsAppNotifications(undefined, scope);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && authErrorStatus(error.message) === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return emailErrorResponse(error, "WhatsApp notification check failed.");
  }
}
