import { NextRequest, NextResponse } from "next/server";

import { SUPPORT_CHANNEL_ROOM } from "@/lib/support-data";
import { sendMessage } from "@/lib/internal-messaging-service";
import { formatAssigneeForClient } from "@/lib/support-client-notify";
import {
  formatSupportFlowClientAssignedMessage,
  formatSupportFlowOperatorAssignedMessage,
} from "@/lib/support-flow-messages";
import { getSupportTicket, updateSupportTicket } from "@/lib/support-tickets-service";
import { withSupportTicketsTable } from "@/lib/internal-db-migrations";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveWorkspaceBinding } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

const ASSIGN_USER_RE = /^user\s*(\d+)\.?$/i;

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const workspace = await resolveWorkspaceBinding({ fallbackInternal: true });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace context is required." }, { status: 401 });
    }
    const scope = { workspaceId: workspace.id };

    const body = (await request.json()) as {
      ticketId?: string;
      content?: string;
      operatorId?: string;
      operatorName?: string;
      username?: string;
    };

    const ticketId = body.ticketId?.trim();
    const content = body.content?.trim() ?? "";
    const operatorId = body.operatorId?.trim();
    const operatorName = body.operatorName?.trim();
    const username = body.username?.trim();

    if (!ticketId || !operatorId || !operatorName || !username) {
      return NextResponse.json({ error: "Ticket and operator identity are required." }, { status: 400 });
    }

    const match = content.match(ASSIGN_USER_RE);
    if (!match) {
      return NextResponse.json(
        { error: 'Type "User 1" (or User 2, etc.) to assign the ticket.' },
        { status: 400 },
      );
    }

    const assignee = `User ${match[1]}`;

    const result = await withSupportTicketsTable(async () => {
      const existing = await getSupportTicket(ticketId, scope);
      if (!existing) {
        throw new Error("Support ticket not found.");
      }

      if (existing.userAssigned?.trim()) {
        throw new Error(`${existing.id} is already assigned to ${existing.userAssigned}.`);
      }

      await sendMessage(
        {
          operatorId,
          operatorName,
          username,
          content,
          room: SUPPORT_CHANNEL_ROOM,
          messageType: "text",
        },
        scope,
      );

      const ticket = await updateSupportTicket(ticketId, { userAssigned: assignee }, scope);
      const assigneeLabel = formatAssigneeForClient(assignee);

      await sendMessage(
        {
          operatorId: "system",
          operatorName: "Unit311 Support",
          username: "system",
          content: `${assigneeLabel} assigned to ${ticket.id}.`,
          room: SUPPORT_CHANNEL_ROOM,
          messageType: "system",
        },
        scope,
      );

      return {
        ticket,
        clientMessage: formatSupportFlowClientAssignedMessage(ticket.id, assignee),
        operatorMessage: formatSupportFlowOperatorAssignedMessage(ticket.id, assignee),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign support ticket";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
