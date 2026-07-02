import type { ChatMessage } from "@/lib/internal-messaging-data";
import { SUPPORT_CHANNEL_ROOM } from "@/lib/support-data";
import { listSupportTickets, updateSupportTicket } from "@/lib/support-tickets-service";
import { sendMessage } from "@/lib/internal-messaging-service";
import { formatAssigneeForClient, notifyClientTicketAssigned } from "@/lib/support-client-notify";

const ASSIGN_USER_RE = /^user\s*(\d+)\.?$/i;
const TICKET_ID_RE = /\b(SUP-\d{3,})\b/i;

function extractTicketId(content: string) {
  return content.match(TICKET_ID_RE)?.[1] ?? null;
}

function parseAssigneeFromMessage(content: string) {
  const match = content.trim().match(ASSIGN_USER_RE);
  if (!match) return null;
  return `User ${match[1]}`;
}

async function resolveTicketId(content: string) {
  const explicitId = extractTicketId(content);
  if (explicitId) return explicitId;

  const tickets = await listSupportTickets(false);
  const openUnassigned = tickets.find((ticket) => !ticket.archived && !ticket.userAssigned);
  return openUnassigned?.id ?? null;
}

export async function handleSupportChannelClaimMessage(message: ChatMessage) {
  if (message.room !== SUPPORT_CHANNEL_ROOM) return { handled: false as const };
  if (message.messageType === "system") return { handled: false as const };
  if (message.operatorId.startsWith("whatsapp:") || message.operatorId.startsWith("client:")) {
    return { handled: false as const };
  }

  const assignee = parseAssigneeFromMessage(message.content);
  if (!assignee) return { handled: false as const };

  const ticketId = await resolveTicketId(message.content);
  if (!ticketId) {
    return { handled: false as const, reason: "no_ticket" as const };
  }

  const ticket = await updateSupportTicket(ticketId, { userAssigned: assignee });
  const assigneeLabel = formatAssigneeForClient(assignee);

  await sendMessage({
    operatorId: "system",
    operatorName: "Unit311 Support",
    username: "system",
    content: `${assigneeLabel} assigned to ${ticket.id}.`,
    room: SUPPORT_CHANNEL_ROOM,
    messageType: "system",
  });

  const whatsappReply = await notifyClientTicketAssigned(ticket, assignee);

  return { handled: true as const, ticket, assignee, whatsappReply };
}
