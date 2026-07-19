import type { SupportTicket } from "@/lib/support-data";
import { createSupportTicket, updateSupportTicket } from "@/lib/support-tickets-service";
import {
  postAssignmentPromptToSupportChannel,
  postTicketToSupportChannel,
} from "@/lib/support-channel";
import {
  clearWhatsAppSupportSession,
  getWhatsAppSupportSession,
  upsertWhatsAppSupportSession,
  type WhatsAppSupportSessionStep,
} from "@/lib/support-whatsapp-session";
import {
  CLIENT_INTAKE_PROMPTS,
  isOpenTicketCommand,
  nextPromptForStep,
  parseClientPriorityAnswer,
} from "@/lib/support-intake-prompts";
import type { SupportWorkspaceScope } from "@/lib/support-workspace";
import { isWhatsAppConfigured, normalizeWhatsAppPhone, sendWhatsAppMessage } from "@/lib/whatsapp/client";

export type WhatsAppIntakeOptions = SupportWorkspaceScope & {
  phone?: string | null;
  suppressWhatsApp?: boolean;
};

export type WhatsAppIntakeResult =
  | {
      mode: "step";
      step: WhatsAppSupportSessionStep;
      ticket: SupportTicket;
      reply: string;
      whatsappAck?: unknown;
    }
  | { mode: "submitted"; ticket: SupportTicket; reply: string; [key: string]: unknown }
  | { mode: "ignored"; reason: string; reply?: string };

function preserveClientAnswer(text: string) {
  return text.trim();
}

function requireClientAnswer(text: string, label: string) {
  const answer = preserveClientAnswer(text);
  if (!answer) {
    throw new Error(`Please enter your ${label}.`);
  }
  return answer;
}

function normalizeClientPhone(phone?: string | null) {
  if (!phone?.trim()) return null;
  return normalizeWhatsAppPhone(phone);
}

function scopeFromOptions(options: WhatsAppIntakeOptions): SupportWorkspaceScope {
  return { workspaceId: options.workspaceId };
}

export function isSupportTicketWhatsAppCommand(text: string) {
  return isOpenTicketCommand(text);
}

async function maybeSendClientReply(
  text: string,
  phone?: string | null,
  suppressWhatsApp = false,
) {
  if (suppressWhatsApp || !isWhatsAppConfigured()) return null;
  try {
    return await sendWhatsAppMessage(text, phone ?? undefined);
  } catch (error) {
    console.error("[support/intake] WhatsApp send failed", error);
    return null;
  }
}

async function attachClientPhone(
  ticket: SupportTicket,
  phone: string | null | undefined,
  scope: SupportWorkspaceScope,
) {
  const clientPhone = normalizeClientPhone(phone);
  if (!clientPhone) return ticket;
  return updateSupportTicket(ticket.id, { clientPhone }, scope);
}

async function completeTicketIntake(
  ticket: SupportTicket,
  phone: string | null | undefined,
  suppressWhatsApp: boolean,
  scope: SupportWorkspaceScope,
) {
  ticket = await attachClientPhone(ticket, phone, scope);
  const channelMessage = await postTicketToSupportChannel(ticket, scope);
  const assignmentPrompt = await postAssignmentPromptToSupportChannel(ticket.id, scope);
  await clearWhatsAppSupportSession(phone, scope);
  const reply = CLIENT_INTAKE_PROMPTS.received;
  const whatsappAck = await maybeSendClientReply(reply, ticket.clientPhone ?? phone, suppressWhatsApp);

  return {
    channelMessage,
    assignmentPrompt,
    reply,
    whatsappAck,
  };
}

async function processOpenNewTicket(
  phone: string | null | undefined,
  suppressWhatsApp: boolean,
  scope: SupportWorkspaceScope,
) {
  const ticket = await createSupportTicket(
    {
      name: "(collecting)",
      organisation: "",
      priority: "low",
      description: "",
      clientPhone: normalizeClientPhone(phone),
    },
    scope,
  );

  await upsertWhatsAppSupportSession(
    {
      phone,
      ticketId: ticket.id,
      step: "awaiting_name",
    },
    scope,
  );

  const reply = CLIENT_INTAKE_PROMPTS.name;
  const whatsappAck = await maybeSendClientReply(reply, phone, suppressWhatsApp);

  return {
    mode: "step" as const,
    step: "awaiting_name" as const,
    ticket,
    reply,
    whatsappAck,
  };
}

async function processSessionStep(
  text: string,
  phone: string | null | undefined,
  suppressWhatsApp: boolean,
  scope: SupportWorkspaceScope,
): Promise<WhatsAppIntakeResult | null> {
  const session = await getWhatsAppSupportSession(phone, scope);
  if (!session) return null;

  if (session.step === "awaiting_assignment") {
    await clearWhatsAppSupportSession(phone, scope);
    return { mode: "ignored", reason: "already_submitted" };
  }

  const trimmed = preserveClientAnswer(text);

  if (session.step === "awaiting_name") {
    const name = requireClientAnswer(trimmed, "name");
    const ticket = await updateSupportTicket(session.ticketId, { name }, scope);
    await upsertWhatsAppSupportSession(
      {
        phone,
        ticketId: ticket.id,
        step: "awaiting_organisation",
      },
      scope,
    );
    const reply = CLIENT_INTAKE_PROMPTS.organisation;
    const whatsappAck = await maybeSendClientReply(reply, phone, suppressWhatsApp);
    return {
      mode: "step",
      step: "awaiting_organisation",
      ticket,
      reply,
      whatsappAck,
    };
  }

  if (session.step === "awaiting_organisation") {
    const organisation = requireClientAnswer(trimmed, "organisation name");
    const ticket = await updateSupportTicket(session.ticketId, { organisation }, scope);
    await upsertWhatsAppSupportSession(
      {
        phone,
        ticketId: ticket.id,
        step: "awaiting_priority",
      },
      scope,
    );
    const reply = CLIENT_INTAKE_PROMPTS.priority;
    const whatsappAck = await maybeSendClientReply(reply, phone, suppressWhatsApp);
    return {
      mode: "step",
      step: "awaiting_priority",
      ticket,
      reply,
      whatsappAck,
    };
  }

  if (session.step === "awaiting_priority") {
    const priorityAnswer = requireClientAnswer(trimmed, "priority");
    const priority = parseClientPriorityAnswer(priorityAnswer) ?? "medium";

    const ticket = await updateSupportTicket(
      session.ticketId,
      {
        priority,
        clientPriorityLabel: priorityAnswer,
      },
      scope,
    );
    await upsertWhatsAppSupportSession(
      {
        phone,
        ticketId: ticket.id,
        step: "awaiting_description",
      },
      scope,
    );
    const reply = CLIENT_INTAKE_PROMPTS.description;
    const whatsappAck = await maybeSendClientReply(reply, phone, suppressWhatsApp);
    return {
      mode: "step",
      step: "awaiting_description",
      ticket,
      reply,
      whatsappAck,
    };
  }

  if (session.step === "awaiting_description") {
    const description = requireClientAnswer(trimmed, "problem description");
    const ticket = await updateSupportTicket(session.ticketId, { description }, scope);
    const completion = await completeTicketIntake(ticket, phone, suppressWhatsApp, scope);
    return {
      mode: "submitted",
      ticket,
      ...completion,
    };
  }

  return null;
}

export async function processSupportTicketFromWhatsApp(
  text: string,
  options: WhatsAppIntakeOptions = {},
): Promise<WhatsAppIntakeResult> {
  const phone = options.phone ?? null;
  const scope = scopeFromOptions(options);
  const trimmed = text.trim();
  if (!trimmed) {
    return { mode: "ignored", reason: "empty_message" };
  }

  const normalized = preserveClientAnswer(trimmed).replace(/\s+/g, " ");
  const suppressWhatsApp = options.suppressWhatsApp ?? false;

  if (isOpenTicketCommand(normalized)) {
    return processOpenNewTicket(phone, suppressWhatsApp, scope);
  }

  const sessionResult = await processSessionStep(normalized, phone, suppressWhatsApp, scope);
  if (sessionResult) {
    return sessionResult;
  }

  const session = await getWhatsAppSupportSession(phone, scope);
  if (session) {
    const hint = nextPromptForStep(session.step);
    throw new Error(hint ? `Please answer: ${hint}` : "Unexpected message for the current ticket step.");
  }

  return {
    mode: "ignored",
    reason: "not_a_ticket_command",
    reply: 'Start the flow by typing "Open new ticket".',
  };
}
