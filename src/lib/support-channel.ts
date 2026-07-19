import { SUPPORT_CHANNEL_ROOM } from "@/lib/support-data";
import { sendMessage } from "@/lib/internal-messaging-service";
import type { SupportTicket } from "@/lib/support-data";
import { SUPPORT_PRIORITY_LABELS } from "@/lib/support-data";
import type { MessagingWorkspaceScope } from "@/lib/messaging-workspace";

export { SUPPORT_CHANNEL_ROOM };

export function formatSupportChannelTicketMessage(ticket: SupportTicket) {
  const priorityLabel = ticket.clientPriorityLabel?.trim() || SUPPORT_PRIORITY_LABELS[ticket.priority];
  return [
    `New support ticket ${ticket.id}`,
    `${ticket.organisation} · ${ticket.name}`,
    `Priority: ${priorityLabel}`,
    ticket.description,
  ].join("\n");
}

export async function postTicketToSupportChannel(
  ticket: SupportTicket,
  scope?: MessagingWorkspaceScope,
) {
  return sendMessage(
    {
      operatorId: "whatsapp:client",
      operatorName: ticket.name,
      username: "whatsapp",
      content: formatSupportChannelTicketMessage(ticket),
      room: SUPPORT_CHANNEL_ROOM,
      messageType: "text",
    },
    scope,
  );
}

export async function postAssignmentPromptToSupportChannel(
  ticketId: string,
  scope?: MessagingWorkspaceScope,
) {
  return sendMessage(
    {
      operatorId: "system",
      operatorName: "Unit311 Support",
      username: "system",
      content: `What user do you want to assign? (${ticketId})`,
      room: SUPPORT_CHANNEL_ROOM,
      messageType: "system",
    },
    scope,
  );
}
