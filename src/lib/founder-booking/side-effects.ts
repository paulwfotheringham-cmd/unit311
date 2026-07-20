import { internalAppPath } from "@/lib/app-domains";
import { createLead } from "@/lib/crm-leads-service";
import { ensureExternalClientFolder } from "@/lib/external-files-service";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";
import type { FounderSessionBooking } from "@/lib/founder-booking/service";
import { createActionItem } from "@/lib/internal-action-items-service";
import { sendMessage, getChannelByName } from "@/lib/internal-messaging-service";
import {
  formatFounderBookingWhatsAppMessage,
  sendFounderBookingWhatsAppMessage,
} from "@/lib/email/whatsapp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveWorkspaceBinding } from "@/lib/workspace-context";

const EXECUTIVE_DISCOVERY_CHANNEL_NAME =
  process.env.EXECUTIVE_DISCOVERY_CHANNEL_NAME?.trim() || "Executive Discovery Meetings";

type BookingSideEffectInput = {
  booking: FounderSessionBooking;
  name: string;
  organization: string;
  role: string;
  email: string;
  startsAt: string;
  videoLink: string;
};

export type FounderBookingSideEffectResult = {
  crmLeadId: string | null;
  externalFolderId: string | null;
  messagingRoom: string | null;
  whatsappSent: boolean;
  actionItemId: string | null;
  errors: string[];
};

async function updateBookingLinks(
  bookingId: string,
  patch: { crmLeadId?: string | null; externalFolderId?: string | null },
) {
  const supabase = createSupabaseServerClient();
  const payload: Record<string, string | null> = {};
  if (patch.crmLeadId !== undefined) payload.crm_lead_id = patch.crmLeadId;
  if (patch.externalFolderId !== undefined) payload.external_folder_id = patch.externalFolderId;

  if (Object.keys(payload).length === 0) return;

  await supabase.from("founder_session_bookings").update(payload).eq("id", bookingId);
}

export async function runFounderBookingSideEffects(
  input: BookingSideEffectInput,
): Promise<FounderBookingSideEffectResult> {
  const result: FounderBookingSideEffectResult = {
    crmLeadId: null,
    externalFolderId: null,
    messagingRoom: null,
    whatsappSent: false,
    actionItemId: null,
    errors: [],
  };

  const gmtWhen = formatLondonDateTime(input.startsAt);
  const meetingDashboardHref = internalAppPath("crm-meetings");
  const crmDashboardHref = internalAppPath("crm");
  const internal = await resolveWorkspaceBinding({ fallbackInternal: true });

  try {
    if (!internal) {
      throw new Error("Internal workspace is required to create a CRM lead.");
    }
    const lead = await createLead(
      {
        companyName: input.organization,
        contactName: input.name,
        email: input.email,
        status: "Warm",
        source: "Website",
        nextAction: "Executive strategy session booked",
        nextActionDate: input.startsAt.slice(0, 10),
        notes: `Booked via /book on ${new Date().toISOString()}\nRole: ${input.role}\nMeeting: ${input.videoLink}`,
      },
      { workspaceId: internal.id },
    );
    result.crmLeadId = lead.id;
    await updateBookingLinks(input.booking.id, { crmLeadId: lead.id });
  } catch (error) {
    result.errors.push(
      `CRM lead: ${error instanceof Error ? error.message : "Failed to create CRM lead"}`,
    );
  }

  try {
    if (!internal) {
      throw new Error(`Messaging channel "${EXECUTIVE_DISCOVERY_CHANNEL_NAME}" was not found.`);
    }
    const channel = await getChannelByName(EXECUTIVE_DISCOVERY_CHANNEL_NAME, {
      workspaceId: internal.id,
    });
    if (!channel) {
      throw new Error(`Messaging channel "${EXECUTIVE_DISCOVERY_CHANNEL_NAME}" was not found.`);
    }

    await sendMessage(
      {
        room: channel.room,
        operatorId: "system",
        operatorName: "System",
        username: "system",
        messageType: "system",
        content: [
          "New executive strategy session booked",
          `${input.name} · ${input.organization}`,
          input.role ? `Role: ${input.role}` : null,
          `${input.email}`,
          `When (GMT): ${gmtWhen}`,
          `Meeting room: ${input.videoLink}`,
        ].filter(Boolean).join("\n"),
      },
      { workspaceId: internal.id },
    );
    result.messagingRoom = channel.room;
  } catch (error) {
    result.errors.push(
      `Messaging: ${error instanceof Error ? error.message : "Failed to post channel message"}`,
    );
  }

  try {
    const message = formatFounderBookingWhatsAppMessage({
      name: input.name,
      organization: input.organization,
      role: input.role,
      email: input.email,
      startsAtGmt: gmtWhen,
      videoLink: input.videoLink,
    });
    await sendFounderBookingWhatsAppMessage(message);
    result.whatsappSent = true;
  } catch (error) {
    result.errors.push(
      `WhatsApp: ${error instanceof Error ? error.message : "Failed to send WhatsApp notification"}`,
    );
  }

  try {
    if (!internal) {
      throw new Error("Internal workspace is required for external folder creation.");
    }
    const folder = await ensureExternalClientFolder(input.organization, {
      workspaceId: internal.id,
    });
    result.externalFolderId = folder.id;
    await updateBookingLinks(input.booking.id, { externalFolderId: folder.id });
  } catch (error) {
    result.errors.push(
      `External folder: ${error instanceof Error ? error.message : "Failed to create folder"}`,
    );
  }

  try {
    const action = await createActionItem({
      priority: "high",
      task: `Executive session booked — ${input.organization} (${input.name})`,
      assignedTo: "Team",
      dueLabel: gmtWhen,
      dueAt: input.startsAt,
      href: meetingDashboardHref,
      crmLeadId: result.crmLeadId,
      bookingId: input.booking.id,
    });
    result.actionItemId = action.id;

    if (result.crmLeadId) {
      await createActionItem({
        priority: "medium",
        task: `Review CRM lead — ${input.organization}`,
        assignedTo: "Team",
        dueLabel: gmtWhen,
        dueAt: input.startsAt,
        href: crmDashboardHref,
        crmLeadId: result.crmLeadId,
        bookingId: input.booking.id,
      });
    }
  } catch (error) {
    result.errors.push(
      `Dashboard alert: ${error instanceof Error ? error.message : "Failed to create action item"}`,
    );
  }

  return result;
}
