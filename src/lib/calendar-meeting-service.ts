import { randomUUID } from "node:crypto";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import { extractAttendeesFromNotes } from "@/lib/calendar-invite-email";
import type { CalendarEvent } from "@/lib/calendar-data";
import {
  formatTranscriptPlainText,
  parseTranscriptDraft,
  type TranscriptLine,
} from "@/lib/executive-call-transcript-data";
import { clearWebrtcSignals } from "@/lib/executive-call-webrtc-service";
import { ensureExternalClientFolder } from "@/lib/external-files-service";
import { listInternalClients } from "@/lib/internal-clients-service";
import { uploadFile } from "@/lib/internal-files-service";
import { listLeads } from "@/lib/crm-leads-service";
import { getPlatformSession } from "@/lib/platform-session";
import type { PlatformSession } from "@/lib/platform-auth";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type CalendarMeetingSession = {
  eventId: string;
  workspaceId: string;
  title: string;
  clientName: string | null;
  startsAt: string;
  endsAt: string;
  notes: string | null;
  hostStarted: boolean;
  hostStartedAt: string | null;
  hostLeftAt: string | null;
  guestName: string | null;
  guestJoinedAt: string | null;
  guestLeftAt: string | null;
  transcriptSavedAt: string | null;
  transcriptFileId: string | null;
  folderOrganization: string | null;
};

export type CalendarMeetingPayload = {
  meeting: CalendarMeetingSession;
  viewer: {
    isHost: boolean;
    displayName: string | null;
  };
  transcript: TranscriptLine[];
  folderHint: {
    organization: string;
    source: "client" | "crm" | "managed" | "title";
  };
};

type SessionRow = {
  event_id: string;
  workspace_id: string;
  host_started_at: string | null;
  host_left_at: string | null;
  guest_name: string | null;
  guest_joined_at: string | null;
  guest_left_at: string | null;
  transcript_draft: unknown;
  transcript_file_id: string | null;
  transcript_saved_at: string | null;
  folder_organization: string | null;
};

type EventRow = {
  id: string;
  workspace_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  client_name: string | null;
  notes: string | null;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function isCalendarMeetingHost(session: PlatformSession | null) {
  return Boolean(session && session.userType === "internal");
}

function mapMeeting(event: EventRow, session: SessionRow | null): CalendarMeetingSession {
  return {
    eventId: event.id,
    workspaceId: event.workspace_id,
    title: event.title,
    clientName: event.client_name,
    startsAt: event.starts_at,
    endsAt: event.ends_at,
    notes: event.notes,
    hostStarted: Boolean(session?.host_started_at),
    hostStartedAt: session?.host_started_at ?? null,
    hostLeftAt: session?.host_left_at ?? null,
    guestName: session?.guest_name ?? null,
    guestJoinedAt: session?.guest_joined_at ?? null,
    guestLeftAt: session?.guest_left_at ?? null,
    transcriptSavedAt: session?.transcript_saved_at ?? null,
    transcriptFileId: session?.transcript_file_id ?? null,
    folderOrganization: session?.folder_organization ?? null,
  };
}

export async function getCalendarEventById(eventId: string): Promise<CalendarEvent & { workspaceId: string } | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("internal_calendar_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as EventRow & {
    event_type: string;
    location: string | null;
    created_at: string;
    updated_at: string;
  };
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    eventType:
      row.event_type === "meeting" || row.event_type === "onsite" ? row.event_type : "other",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    clientName: row.client_name,
    location: row.location,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadEventRow(eventId: string): Promise<EventRow | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("internal_calendar_events")
    .select("id, workspace_id, title, starts_at, ends_at, client_name, notes")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as EventRow | null) ?? null;
}

async function loadSessionRow(eventId: string): Promise<SessionRow | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("calendar_meeting_sessions")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SessionRow | null) ?? null;
}

async function ensureSessionRow(event: EventRow): Promise<SessionRow> {
  const existing = await loadSessionRow(event.id);
  if (existing) return existing;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("calendar_meeting_sessions")
    .upsert(
      {
        event_id: event.id,
        workspace_id: event.workspace_id,
        transcript_draft: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as SessionRow;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function resolveCalendarMeetingFolder(
  event: Pick<EventRow, "title" | "client_name" | "notes" | "workspace_id">,
): Promise<{ organization: string; source: "client" | "crm" | "managed" | "title" }> {
  const clientName = event.client_name?.trim();
  if (clientName) {
    return { organization: clientName, source: "client" };
  }

  const workspaceId = event.workspace_id;
  const attendees = extractAttendeesFromNotes(event.notes);

  try {
    const clients = await listInternalClients({ workspaceId });
    for (const email of attendees) {
      const byEmail = clients.find(
        (client) => (client.email || "").trim().toLowerCase() === email.toLowerCase(),
      );
      if (byEmail) return { organization: byEmail.companyName, source: "managed" };
    }
  } catch {
    // Ignore client lookup failures and continue to CRM.
  }

  try {
    const leads = await listLeads("All", { workspaceId });
    for (const email of attendees) {
      const byEmail = leads.find(
        (lead) => (lead.email || "").trim().toLowerCase() === email.toLowerCase(),
      );
      if (byEmail?.companyName.trim()) {
        return { organization: byEmail.companyName.trim(), source: "crm" };
      }
    }
    const titleKey = normalizeKey(event.title);
    const byTitle = leads.find((lead) => {
      const company = normalizeKey(lead.companyName);
      return company && (titleKey.includes(company) || company.includes(titleKey));
    });
    if (byTitle?.companyName.trim()) {
      return { organization: byTitle.companyName.trim(), source: "crm" };
    }
  } catch {
    // Ignore CRM lookup failures.
  }

  const fallback = event.title.trim() || "Calendar Meeting";
  return { organization: fallback, source: "title" };
}

export async function getCalendarMeetingSession(eventId: string): Promise<CalendarMeetingPayload | null> {
  const event = await loadEventRow(eventId);
  if (!event) return null;

  const session = await loadSessionRow(event.id);
  const platform = await getPlatformSession();
  const folderHint = await resolveCalendarMeetingFolder(event);

  return {
    meeting: mapMeeting(event, session),
    viewer: {
      isHost: isCalendarMeetingHost(platform),
      displayName: platform?.displayName?.trim() || platform?.username || null,
    },
    transcript: parseTranscriptDraft(session?.transcript_draft),
    folderHint,
  };
}

export async function startCalendarMeeting(eventId: string) {
  const platform = await getPlatformSession();
  if (!isCalendarMeetingHost(platform)) {
    throw new Error("Only a signed-in Unit311 host can start this meeting.");
  }

  const event = await loadEventRow(eventId);
  if (!event) throw new Error("Meeting not found.");

  const session = await ensureSessionRow(event);
  const now = new Date().toISOString();
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("calendar_meeting_sessions")
    .update({
      host_started_at: session.host_started_at ?? now,
      host_left_at: null,
      updated_at: now,
    })
    .eq("event_id", event.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await clearWebrtcSignals(event.id).catch(() => undefined);
  return mapMeeting(event, data as SessionRow);
}

export async function joinCalendarMeeting(eventId: string, guestName?: string) {
  const platform = await getPlatformSession();
  const event = await loadEventRow(eventId);
  if (!event) throw new Error("Meeting not found.");

  const session = await ensureSessionRow(event);
  if (session.host_left_at) throw new Error("This meeting has ended.");

  const now = new Date().toISOString();
  const supabase = requireSupabase();

  if (isCalendarMeetingHost(platform)) {
    const { data, error } = await supabase
      .from("calendar_meeting_sessions")
      .update({
        host_started_at: session.host_started_at ?? now,
        host_left_at: null,
        updated_at: now,
      })
      .eq("event_id", event.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapMeeting(event, data as SessionRow);
  }

  if (!session.host_started_at) {
    throw new Error("Waiting for the host to start the meeting.");
  }

  const name = guestName?.trim() || session.guest_name || "Guest";
  const { data, error } = await supabase
    .from("calendar_meeting_sessions")
    .update({
      guest_name: name,
      guest_joined_at: session.guest_joined_at ?? now,
      guest_left_at: null,
      updated_at: now,
    })
    .eq("event_id", event.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapMeeting(event, data as SessionRow);
}

export async function leaveCalendarMeeting(eventId: string, role: "host" | "guest") {
  const platform = await getPlatformSession();
  const event = await loadEventRow(eventId);
  if (!event) throw new Error("Meeting not found.");
  const session = await ensureSessionRow(event);
  const now = new Date().toISOString();
  const supabase = requireSupabase();

  if (role === "host") {
    if (!isCalendarMeetingHost(platform)) {
      throw new Error("Only the host can end this meeting.");
    }
    const { data, error } = await supabase
      .from("calendar_meeting_sessions")
      .update({
        host_left_at: now,
        updated_at: now,
      })
      .eq("event_id", event.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await clearWebrtcSignals(event.id).catch(() => undefined);
    return mapMeeting(event, data as SessionRow);
  }

  const { data, error } = await supabase
    .from("calendar_meeting_sessions")
    .update({
      guest_left_at: now,
      updated_at: now,
    })
    .eq("event_id", event.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapMeeting(event, data as SessionRow);
}

export async function appendCalendarMeetingTranscriptLine(
  eventId: string,
  line: { speaker: string; text: string },
) {
  const event = await loadEventRow(eventId);
  if (!event) throw new Error("Meeting not found.");
  const session = await ensureSessionRow(event);
  const text = line.text.trim();
  if (!text) throw new Error("Transcript text is required.");

  const nextLine: TranscriptLine = {
    id: randomUUID(),
    speaker: line.speaker.trim() || "Speaker",
    text,
    at: new Date().toISOString(),
  };
  const current = [...parseTranscriptDraft(session.transcript_draft), nextLine].slice(-500);
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("calendar_meeting_sessions")
    .update({
      transcript_draft: current,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", event.id)
    .select("transcript_draft")
    .single();
  if (error) throw new Error(error.message);
  return parseTranscriptDraft(data.transcript_draft);
}

function calendarTranscriptFileName(organization: string, startsAt: string) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(startsAt));
  const safeOrg = organization.replace(/[<>:"/\\|?*]+/g, "").trim() || "Client";
  return `Meeting Notes — ${safeOrg} — ${date}.docx`;
}

function toUploadFile(name: string, buffer: Buffer, mimeType: string) {
  const bytes = Uint8Array.from(buffer);
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], name, { type: mimeType });
}

async function buildTranscriptDocxBuffer(options: {
  organization: string;
  title: string;
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
            text: "Meeting completed. No transcript lines were recorded during this session.",
            at: options.endedAt ?? new Date().toISOString(),
          },
        ];

  const children = [
    new Paragraph({
      text: `Meeting Notes — ${options.organization}`,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Meeting: ${options.title}` })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Session: ${new Intl.DateTimeFormat("en-GB", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Europe/London",
          }).format(new Date(options.startsAt))} GMT`,
        }),
      ],
      spacing: { after: 240 },
    }),
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

  const doc = new Document({ sections: [{ children }] });
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

export async function saveCalendarMeetingTranscript(
  eventId: string,
  options?: { force?: boolean },
) {
  const platform = await getPlatformSession();
  if (!isCalendarMeetingHost(platform)) {
    throw new Error("Only the host can save meeting notes.");
  }

  const event = await loadEventRow(eventId);
  if (!event) throw new Error("Meeting not found.");
  const session = await ensureSessionRow(event);

  const folderHint = await resolveCalendarMeetingFolder(event);
  const organization = session.folder_organization?.trim() || folderHint.organization;

  if (!options?.force && session.transcript_saved_at && session.transcript_file_id) {
    return {
      fileId: session.transcript_file_id,
      fileName: calendarTranscriptFileName(organization, event.starts_at),
      lineCount: parseTranscriptDraft(session.transcript_draft).length,
      alreadySaved: true,
      organization,
      source: folderHint.source,
    };
  }

  const lines = parseTranscriptDraft(session.transcript_draft);
  const folder = await ensureExternalClientFolder(organization, {
    workspaceId: event.workspace_id,
  });
  const fileName = calendarTranscriptFileName(organization, event.starts_at);
  const txtName = fileName.replace(/\.docx$/i, ".txt");
  await deleteNamedFilesInFolder(folder.id, [fileName, txtName]);

  const docxBuffer = await buildTranscriptDocxBuffer({
    organization,
    title: event.title,
    startsAt: event.starts_at,
    lines,
    endedAt: session.host_left_at,
  });
  const plainText =
    lines.length > 0
      ? `Meeting Notes — ${organization}\nMeeting: ${event.title}\n\n${formatTranscriptPlainText(lines)}`
      : `Meeting Notes — ${organization}\nMeeting: ${event.title}\n\nMeeting completed. No transcript lines were recorded during this session.`;

  const docxFile = await uploadFile({
    file: toUploadFile(
      fileName,
      Buffer.from(docxBuffer),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    folderId: folder.id,
    categoryId: null,
  });

  await uploadFile({
    file: toUploadFile(txtName, Buffer.from(plainText, "utf8"), "text/plain"),
    folderId: folder.id,
    categoryId: null,
  });

  const savedAt = new Date().toISOString();
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("calendar_meeting_sessions")
    .update({
      transcript_file_id: docxFile.id,
      transcript_saved_at: savedAt,
      folder_organization: organization,
      updated_at: savedAt,
    })
    .eq("event_id", event.id);
  if (error) throw new Error(error.message);

  return {
    fileId: docxFile.id,
    fileName,
    lineCount: lines.length,
    alreadySaved: false,
    organization,
    source: folderHint.source,
  };
}
