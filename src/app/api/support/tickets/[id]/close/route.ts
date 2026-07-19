import { NextRequest, NextResponse } from "next/server";

import { formatSupportTicketClosedMessage } from "@/lib/whatsapp/client";
import { getSupportTicket, updateSupportTicket } from "@/lib/support-tickets-service";
import { notifyClientTicketClosed } from "@/lib/support-client-notify";
import { withSupportTicketsTable } from "@/lib/internal-db-migrations";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function authErrorStatus(message: string) {
  return message.includes("Authentication required") || message.includes("Workspace context")
    ? 401
    : 500;
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { preview?: boolean };
    const preview = body.preview === true;

    const result = await withSupportTicketsTable(async () => {
      const existing = await getSupportTicket(id, scope);
      if (!existing) throw new Error("Support ticket not found.");
      if (existing.closed) throw new Error("This ticket is already closed.");

      const clientMessage = formatSupportTicketClosedMessage(id);

      if (preview) {
        const ticket = await updateSupportTicket(id, { closed: true }, scope);
        return { ticket, clientMessage, whatsappSent: false };
      }

      const whatsappReply = await notifyClientTicketClosed(existing);
      const ticket = await updateSupportTicket(id, { closed: true }, scope);

      return {
        ticket,
        clientMessage,
        whatsappSent: Boolean(whatsappReply?.ok),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to close ticket";
    const status = authErrorStatus(message) === 401 ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
