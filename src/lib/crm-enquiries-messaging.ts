import { internalAppPath } from "@/lib/app-domains";
import { buildCrmEmailModuleHref } from "@/lib/crm-contact-data";
import {
  ENQUIRIES_CHANNEL_NAME,
  ENQUIRIES_MESSAGING_ROOM,
  mapMessageChannel,
  type MessageChannel,
} from "@/lib/internal-messaging-data";
import {
  getChannelByName,
  getChannelByRoom,
  sendMessage,
  updateChannelMembers,
} from "@/lib/internal-messaging-service";
import { listInternalOperators } from "@/lib/internal-operators-service";
import type { MessagingWorkspaceScope } from "@/lib/messaging-workspace";
import { resolveMessagingWorkspaceId } from "@/lib/messaging-workspace";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createInitialUsers } from "@/lib/user-management-data";

async function resolveAllOperatorIds() {
  const operators = await listInternalOperators().catch(() => createInitialUsers());
  const ids = operators.map((operator) => operator.id).filter(Boolean);
  return ids.length > 0 ? ids : createInitialUsers().map((operator) => operator.id);
}

/** Permanent shared channel for all Website Contact Form enquiries. */
export async function ensureEnquiriesChannel(
  scope?: MessagingWorkspaceScope,
): Promise<MessageChannel> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const workspaceId = await resolveMessagingWorkspaceId(scope);
  const workspaceScope = { workspaceId };
  const operatorIds = await resolveAllOperatorIds();
  const existing =
    (await getChannelByRoom(ENQUIRIES_MESSAGING_ROOM, workspaceScope).catch(() => null)) ??
    (await getChannelByName(ENQUIRIES_CHANNEL_NAME, workspaceScope).catch(() => null));

  if (existing) {
    const merged = Array.from(new Set([...existing.memberOperatorIds, ...operatorIds]));
    if (merged.length !== existing.memberOperatorIds.length) {
      return updateChannelMembers(existing.id, merged, workspaceScope).catch(() => existing);
    }
    return existing;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("internal_message_channels")
    .insert({
      workspace_id: workspaceId,
      room: ENQUIRIES_MESSAGING_ROOM,
      name: ENQUIRIES_CHANNEL_NAME,
      channel_type: "internal",
      client_key: null,
      created_by_operator_id: "system",
      created_by_operator_name: "System",
      member_operator_ids: operatorIds,
      member_client_usernames: [],
    })
    .select("*")
    .single();

  if (error) {
    const retry =
      (await getChannelByRoom(ENQUIRIES_MESSAGING_ROOM, workspaceScope).catch(() => null)) ??
      (await getChannelByName(ENQUIRIES_CHANNEL_NAME, workspaceScope).catch(() => null));
    if (retry) return retry;
    throw new Error(error.message);
  }

  const channel = mapMessageChannel(data);
  await sendMessage(
    {
      room: channel.room,
      operatorId: "system",
      operatorName: "System",
      username: "system",
      messageType: "system",
      content:
        "Channel created for website contact form enquiries. All internal users are members of this feed.",
    },
    workspaceScope,
  ).catch(() => undefined);

  return channel;
}

export async function postWebsiteEnquiryToEnquiriesChannel(
  input: {
    leadId: string;
    organisation: string;
    firstName: string;
    surname: string;
    role: string;
    email: string;
    subject: string;
  },
  scope?: MessagingWorkspaceScope,
) {
  const channel = await ensureEnquiriesChannel(scope);
  const contactName = [input.firstName, input.surname].filter(Boolean).join(" ").trim();
  const crmHref = `${internalAppPath("crm")}&leadId=${encodeURIComponent(input.leadId)}`;
  const replyHref = `${internalAppPath("info-email")}&composeTo=${encodeURIComponent(input.email)}`;

  await sendMessage(
    {
      room: channel.room,
      operatorId: "system",
      operatorName: "System",
      username: "system",
      messageType: "system",
      content: [
        "📩 New Website Enquiry",
        "",
        `Company:\n${input.organisation}`,
        "",
        `Contact:\n${contactName}`,
        "",
        `Role:\n${input.role || "—"}`,
        "",
        `Email:\n${input.email}`,
        "",
        `Subject:\n${input.subject || "—"}`,
        "",
        `Open CRM Lead: ${crmHref}`,
        `Reply: ${replyHref}`,
      ].join("\n"),
    },
    scope,
  );

  return channel.room;
}

export async function postEnquiryReplyToEnquiriesChannel(
  input: {
    organisation: string;
    leadId?: string | null;
    replyEmailMessageId?: string | null;
  },
  scope?: MessagingWorkspaceScope,
) {
  const channel = await ensureEnquiriesChannel(scope);
  const lines = [`Reply sent to ${input.organisation}`];
  if (input.leadId) {
    lines.push(
      `Open CRM Lead: ${internalAppPath("crm")}&leadId=${encodeURIComponent(input.leadId)}`,
    );
  }
  if (input.replyEmailMessageId) {
    const emailHref = buildCrmEmailModuleHref({
      emailMessageId: input.replyEmailMessageId,
    });
    lines.push(`Open email: ${emailHref}`);
  }

  await sendMessage(
    {
      room: channel.room,
      operatorId: "system",
      operatorName: "System",
      username: "system",
      messageType: "system",
      content: lines.join("\n"),
    },
    scope,
  );
}
