import { randomUUID } from "node:crypto";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import {
  executiveTranscriptFileName,
  formatTranscriptPlainText,
  parseTranscriptDraft,
  type TranscriptLine,
} from "@/lib/executive-call-transcript-data";
import { ensureExternalClientFolder } from "@/lib/external-files-service";
import {
  getFounderSessionBookingBySlug,
  type FounderSessionBooking,
} from "@/lib/founder-booking/service";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";
import { uploadFile } from "@/lib/internal-files-service";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { withFounderSessionBookingsTable } from "@/lib/internal-db-migrations";

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

async function buildTranscriptDocxBuffer(options: {
  organization: string;
  name: string;
  startsAt: string;
  lines: TranscriptLine[];
  endedAt?: string | null;
}) {
  const noteLines =
    options.lines.length > 0
      ? options.lines
      : [
          {
            id: "meeting-summary",
            speaker: "Unit311 Central",
            text: "Meeting completed. No chat messages were recorded during this session.",
            at: options.endedAt ?? new Date().toISOString(),
          },
        ];

  const children = [
    new Paragraph({
      text: `Executive Call Notes — ${options.organization}`,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Participant: ${options.name}` })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Session: ${formatLondonDateTime(options.startsAt)} GMT` }),
      ],
      spacing: { after: 120 },
    }),
    ...(options.endedAt
      ? [
          new Paragraph({
            children: [
              new TextRun({
                text: `Completed: ${formatLondonDateTime(options.endedAt)} GMT`,
              }),
            ],
            spacing: { after: 240 },
          }),
        ]
      : []),
    ...noteLines.map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: `[${new Intl.DateTimeFormat("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }).format(new Date(line.at))}] ${line.speaker}: `,
              bold: true,
            }),
            new TextRun({ text: line.text }),
          ],
          spacing: { after: 120 },
        }),
    ),
  ];

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

async function deleteNamedFilesInFolder(folderId: string, names: string[]) {
  const supabase = requireSupabase();
  for (const name of names) {
    const { data, error } = await supabase
      .from("file_objects")
      .select("id")
      .eq("folder_id", folderId)
      .eq("name", name)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) continue;

    const { deleteFile } = await import("@/lib/internal-files-service");
    await deleteFile(data.id as string);
  }
}

export async function getExecutiveCallTranscriptDraft(slug: string) {
  const booking = await getFounderSessionBookingBySlug(slug);
  if (!booking) return null;
  return {
    bookingId: booking.id,
    lines: booking.transcriptDraft,
    transcriptSavedAt: booking.transcriptSavedAt,
    transcriptFileId: booking.transcriptFileId,
  };
}

export async function appendExecutiveCallTranscriptLine(
  slug: string,
  line: { speaker: string; text: string },
) {
  return withFounderSessionBookingsTable(async () => {
    const booking = await getFounderSessionBookingBySlug(slug);
    if (!booking) throw new Error("Meeting not found.");

    const text = line.text.trim();
    if (!text) throw new Error("Transcript text is required.");

    const nextLine: TranscriptLine = {
      id: randomUUID(),
      speaker: line.speaker.trim() || "Speaker",
      text,
      at: new Date().toISOString(),
    };

    const current = [...booking.transcriptDraft, nextLine].slice(-500);
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("founder_session_bookings")
      .update({ transcript_draft: current })
      .eq("id", booking.id)
      .select("transcript_draft")
      .single();

    if (error) throw new Error(error.message);
    return parseTranscriptDraft(data.transcript_draft);
  });
}

export async function saveExecutiveCallTranscriptForBooking(
  booking: FounderSessionBooking,
  options?: { folderOrganization?: string; force?: boolean },
) {
  const folderOrganization = options?.folderOrganization?.trim() || booking.organization;

  if (!options?.force && booking.transcriptSavedAt && booking.transcriptFileId) {
    return {
      fileId: booking.transcriptFileId,
      fileName: executiveTranscriptFileName(folderOrganization, booking.startsAt),
      lineCount: booking.transcriptDraft.length,
      alreadySaved: true,
    };
  }

  const lines = booking.transcriptDraft;
  const folder = await ensureExternalClientFolder(folderOrganization);
  const folderId = folder.id;

  const fileName = executiveTranscriptFileName(folderOrganization, booking.startsAt);
  const txtName = fileName.replace(/\.docx$/i, ".txt");
  await deleteNamedFilesInFolder(folderId, [fileName, txtName]);

  const docxBuffer = await buildTranscriptDocxBuffer({
    organization: folderOrganization,
    name: booking.name,
    startsAt: booking.startsAt,
    lines,
    endedAt: booking.hostLeftAt,
  });
  const plainText =
    lines.length > 0
      ? formatTranscriptPlainText(lines)
      : `Executive Call Notes — ${folderOrganization}\nParticipant: ${booking.name}\nSession: ${formatLondonDateTime(booking.startsAt)} GMT\n\nMeeting completed. No chat messages were recorded during this session.`;
  const txtBuffer = Buffer.from(plainText, "utf8");

  const docxFile = await uploadFile({
    file: toUploadFile(
      fileName,
      docxBuffer,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    folderId,
    categoryId: null,
  });

  await uploadFile({
    file: toUploadFile(txtName, txtBuffer, "text/plain"),
    folderId,
    categoryId: null,
  });

  const savedAt = new Date().toISOString();
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("founder_session_bookings")
    .update({
      external_folder_id: folderId,
      transcript_file_id: docxFile.id,
      transcript_saved_at: savedAt,
      status:
        booking.status === "scheduled" || booking.status === "postponed"
          ? "completed"
          : booking.status,
    })
    .eq("id", booking.id);

  if (error) throw new Error(error.message);

  return {
    fileId: docxFile.id,
    fileName,
    lineCount: lines.length,
    folderId,
    alreadySaved: false,
  };
}

export async function saveExecutiveCallTranscriptsForBookings(
  bookings: FounderSessionBooking[],
  options?: { folderOrganization?: string; force?: boolean },
) {
  const saved: Array<{ bookingId: string; fileName: string }> = [];
  const errors: string[] = [];

  for (const booking of bookings) {
    try {
      const result = await saveExecutiveCallTranscriptForBooking(booking, options);
      if (!result.alreadySaved) {
        saved.push({ bookingId: booking.id, fileName: result.fileName });
      }
    } catch (error) {
      errors.push(
        `${booking.organization}: ${error instanceof Error ? error.message : "Failed to save call notes"}`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return saved;
}

export async function saveExecutiveCallTranscriptsForCrmLead(
  crmLeadId: string,
  options?: { folderOrganization?: string; force?: boolean },
) {
  const { getFounderSessionBookingsForCrmLead } = await import("@/lib/founder-booking/service");
  const fullBookings = await getFounderSessionBookingsForCrmLead(crmLeadId);
  return saveExecutiveCallTranscriptsForBookings(fullBookings, options);
}

export async function saveExecutiveCallTranscript(slug: string) {
  return withFounderSessionBookingsTable(async () => {
    const booking = await getFounderSessionBookingBySlug(slug);
    if (!booking) throw new Error("Meeting not found.");
    return saveExecutiveCallTranscriptForBooking(booking);
  });
}
