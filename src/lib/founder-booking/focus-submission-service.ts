import type { BookThankYouSelections } from "@/lib/book-thank-you-data";
import {
  buildPreMeetingFocusPdfNote,
  formatBookThankYouSelectionsNotes,
} from "@/lib/book-thank-you-data";
import { bookThankYouPdfFileName, buildBookThankYouFocusPdf } from "@/lib/book-thank-you-pdf";
import { getLeadByIdForCapability, updateLead } from "@/lib/crm-leads-service";
import { ensureExternalClientFolder } from "@/lib/external-files-service";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";
import {
  getFounderSessionBookingById,
  type FounderSessionBooking,
} from "@/lib/founder-booking/service";
import { formatDateTimeInTimezone, getFounderBookingTimezone } from "@/lib/founder-booking/timezones";
import { uploadFile } from "@/lib/internal-files-service";
import {
  ensureFounderSessionFocusOverviewColumns,
  withFounderSessionFocusOverviewColumns,
} from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { resolveWorkspaceBinding } from "@/lib/workspace-context";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function toUploadFile(name: string, buffer: Buffer, mimeType: string) {
  const bytes = Uint8Array.from(buffer);
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], name, { type: mimeType });
}

function appendNotes(existing: string | null | undefined, addition: string) {
  const current = existing?.trim() ?? "";
  if (!current) return addition;
  if (current.includes(addition)) return current;
  return `${current}\n\n${addition}`;
}

async function updateCrmLeadWithFocusAreas(
  booking: FounderSessionBooking,
  selections: BookThankYouSelections,
  pdfFileId: string,
) {
  const crmLeadId = await resolveCrmLeadIdForBooking(booking);
  if (!crmLeadId) return;

  const lead = await getLeadByIdForCapability(crmLeadId);
  if (!lead) return;

  const focusNotes = [
    formatBookThankYouSelectionsNotes(selections),
    buildPreMeetingFocusPdfNote(pdfFileId),
  ].join("\n");

  await updateLead(
    crmLeadId,
    {
      notes: appendNotes(lead.notes, focusNotes),
      discoveryNotes: appendNotes(lead.discoveryNotes, focusNotes),
      nextAction: "Review pre-meeting focus areas",
    },
    { workspaceId: lead.workspaceId },
  );

  if (!booking.crmLeadId) {
    await linkBookingToCrmLead(booking.id, crmLeadId);
  }
}

async function resolveCrmLeadIdForBooking(booking: FounderSessionBooking) {
  if (booking.crmLeadId) return booking.crmLeadId;

  const supabase = requireSupabase();
  const normalizedEmail = booking.email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const internal = await resolveWorkspaceBinding({ fallbackInternal: true });
  let query = supabase
    .from("crm_leads")
    .select("id")
    .ilike("email", normalizedEmail)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (internal) {
    query = query.eq("workspace_id", internal.id);
  }
  const { data, error } = await query.maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.id as string | undefined) ?? null;
}

async function linkBookingToCrmLead(bookingId: string, crmLeadId: string) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("founder_session_bookings")
    .update({ crm_lead_id: crmLeadId })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);
}

async function findLatestFocusPdfFileId(folderId: string | null) {
  if (!folderId) return null;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("file_objects")
    .select("id")
    .eq("folder_id", folderId)
    .ilike("name", "Session Focus Areas%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data?.id as string | undefined) ?? null;
}

export type SubmitFounderSessionFocusResult = {
  bookingId: string;
  crmLeadId: string | null;
  pdfFileId: string;
  pdfFileName: string;
  folderId: string;
  submittedAt: string;
};

function isMissingFocusOverviewColumnError(message: string) {
  return (
    message.includes("focus_selections") ||
    message.includes("focus_overview_pdf_file_id") ||
    message.includes("focus_selections_submitted_at")
  );
}

async function persistFocusSubmission(
  bookingId: string,
  booking: FounderSessionBooking,
  selections: BookThankYouSelections,
  uploadedPdfId: string,
  folderId: string,
  submittedAt: string,
) {
  await ensureFounderSessionFocusOverviewColumns().catch(() => undefined);

  const supabase = requireSupabase();
  const payload = {
    focus_selections: selections,
    focus_overview_pdf_file_id: uploadedPdfId,
    focus_selections_submitted_at: submittedAt,
    external_folder_id: folderId,
  };

  try {
    await withFounderSessionFocusOverviewColumns(async () => {
      const { error } = await supabase
        .from("founder_session_bookings")
        .update(payload)
        .eq("id", bookingId);
      if (error) throw new Error(error.message);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!isMissingFocusOverviewColumnError(message)) {
      throw error instanceof Error ? error : new Error(message);
    }

    const { error: folderError } = await supabase
      .from("founder_session_bookings")
      .update({ external_folder_id: folderId })
      .eq("id", bookingId);

    if (folderError && !isMissingFocusOverviewColumnError(folderError.message)) {
      throw new Error(folderError.message);
    }
  }
}

export async function submitFounderSessionFocusSelections(
  bookingId: string,
  selections: BookThankYouSelections,
): Promise<SubmitFounderSessionFocusResult> {
  const booking = await getFounderSessionBookingById(bookingId);
  if (!booking) {
    throw new Error("Booking not found.");
  }

  const timezoneMeta = getFounderBookingTimezone(booking.clientTimezone ?? "Europe/London");
  const sessionWhenGmt = `${formatLondonDateTime(booking.startsAt)} GMT`;
  const sessionWhenClient = booking.clientTimezone
    ? formatDateTimeInTimezone(booking.startsAt, timezoneMeta.id)
    : null;

  const pdfBytes = await buildBookThankYouFocusPdf({
    contactName: booking.name,
    organization: booking.organization,
    email: booking.email,
    sessionWhenGmt,
    sessionWhenClient,
    meetingLink: booking.videoLink,
    selections,
  });

  const pdfFileName = bookThankYouPdfFileName(booking.organization);
  const folderId =
    booking.externalFolderId ?? (await ensureExternalClientFolder(booking.organization)).id;

  const uploadedPdf = await uploadFile({
    file: toUploadFile(pdfFileName, Buffer.from(pdfBytes), "application/pdf"),
    folderId,
    categoryId: null,
  });

  const submittedAt = new Date().toISOString();

  try {
    await persistFocusSubmission(
      bookingId,
      booking,
      selections,
      uploadedPdf.id,
      folderId,
      submittedAt,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!isMissingFocusOverviewColumnError(message)) {
      throw error instanceof Error ? error : new Error(message);
    }
  }

  await updateCrmLeadWithFocusAreas(booking, selections, uploadedPdf.id);

  return {
    bookingId,
    crmLeadId: booking.crmLeadId,
    pdfFileId: uploadedPdf.id,
    pdfFileName,
    folderId,
    submittedAt,
  };
}

export async function resolveFounderSessionFocusOverviewPdfFileId(
  booking: FounderSessionBooking,
): Promise<string | null> {
  if (booking.focusOverviewPdfFileId) {
    return booking.focusOverviewPdfFileId;
  }

  if (booking.crmLeadId) {
    const lead = await getLeadByIdForCapability(booking.crmLeadId);
    if (lead) {
      const { parsePreMeetingFocusPdfFileId } = await import("@/lib/book-thank-you-data");
      const fromLead =
        parsePreMeetingFocusPdfFileId(lead.notes) ??
        parsePreMeetingFocusPdfFileId(lead.discoveryNotes);
      if (fromLead) return fromLead;
    }
  } else {
    const crmLeadId = await resolveCrmLeadIdForBooking(booking);
    if (crmLeadId) {
      const lead = await getLeadByIdForCapability(crmLeadId);
      if (lead) {
        const { parsePreMeetingFocusPdfFileId } = await import("@/lib/book-thank-you-data");
        const fromLead =
          parsePreMeetingFocusPdfFileId(lead.notes) ??
          parsePreMeetingFocusPdfFileId(lead.discoveryNotes);
        if (fromLead) return fromLead;
      }
    }
  }

  return findLatestFocusPdfFileId(booking.externalFolderId);
}
