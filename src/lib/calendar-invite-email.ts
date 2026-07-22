import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import type { CalendarEvent } from "@/lib/calendar-data";
import { extractTimezoneFromNotes } from "@/lib/calendar-meeting-time";
import { sendMailboxEmail } from "@/lib/email/smtp";
import {
  formatDateTimeInTimezone,
  getFounderBookingTimezone,
  getTimezoneAbbreviation,
} from "@/lib/founder-booking/timezones";

function parseEmails(raw: string | string[] | undefined): string[] {
  const text = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  return text
    .split(/[,;\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry));
}

export function normalizeAttendeeEmails(raw: string | string[] | undefined) {
  return [...new Set(parseEmails(raw))];
}

export function appendAttendeesToNotes(notes: string | null | undefined, emails: string[]) {
  const base = (notes ?? "").replace(/\n?Attendees:\s*.+$/im, "").trim();
  if (emails.length === 0) return base || null;
  const line = `Attendees: ${emails.join(", ")}`;
  return base ? `${base}\n${line}` : line;
}

export function extractAttendeesFromNotes(notes: string | null | undefined): string[] {
  const match = notes?.match(/Attendees:\s*(.+)$/im);
  return normalizeAttendeeEmails(match?.[1]);
}

export function stripAttendeesFromNotes(notes: string | null | undefined): string {
  return (notes ?? "").replace(/\n?Attendees:\s*.+$/im, "").trim();
}

export function buildCalendarMeetingUrl(meetingId: string) {
  return `${CENTRAL_SITE_URL}/meet/video/${encodeURIComponent(meetingId)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\n");
}

function foldIcsLine(line: string): string {
  const maxLength = 75;
  if (line.length <= maxLength) return line;

  const parts = [line.slice(0, maxLength)];
  let index = maxLength;

  while (index < line.length) {
    parts.push(` ${line.slice(index, index + maxLength - 1)}`);
    index += maxLength - 1;
  }

  return parts.join("\r\n");
}

function resolveMeetingTimezone(event: CalendarEvent, timezone?: string | null) {
  const fromNotes = extractTimezoneFromNotes(event.notes);
  return getFounderBookingTimezone(timezone || fromNotes || "Europe/London").id;
}

function formatMeetingWhen(iso: string, timeZone: string) {
  return formatDateTimeInTimezone(iso, timeZone);
}

function emailLogoHtml() {
  return `
    <div style="margin-bottom:24px;">
      <span style="font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:700;color:#0b2d63;letter-spacing:-0.03em;">
        Unit<span style="color:#2563eb;">311</span>
      </span>
      <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;letter-spacing:0.12em;text-transform:uppercase;">
        Unit311 Central
      </div>
    </div>
  `;
}

function emailShell(title: string, bodyHtml: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <body style="margin:0;padding:0;background:#f8fafc;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6;">
                    ${emailLogoHtml()}
                    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0b2d63;">${title}</h1>
                    ${bodyHtml}
                    <p style="margin:28px 0 0;font-size:12px;color:#94a3b8;">
                      Unit311 Central · <a href="${CENTRAL_SITE_URL}" style="color:#2563eb;text-decoration:none;">unit311central.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function formatGoogleCalendarDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildCalendarMeetingIcs(input: {
  event: CalendarEvent;
  meetingUrl: string;
  organiserName: string;
  organiserEmail: string;
  attendeeEmails: string[];
  timeZone: string;
}): string {
  const uid = `meeting-${input.event.id}@unit311central.com`;
  const dtStamp = formatIcsUtc(new Date().toISOString());
  const dtStart = formatIcsUtc(input.event.startsAt);
  const dtEnd = formatIcsUtc(input.event.endsAt);
  const description = escapeIcsText(
    [
      stripAttendeesFromNotes(input.event.notes) || "Unit311 Central meeting",
      "",
      `Join: ${input.meetingUrl}`,
      `Timezone: ${getTimezoneAbbreviation(input.timeZone)} (${input.timeZone})`,
    ].join("\n"),
  );
  const summary = escapeIcsText(input.event.title);
  const location = escapeIcsText(input.meetingUrl);
  const organiserCn = escapeIcsText(input.organiserName);

  const attendeeLines = input.attendeeEmails.map(
    (email) =>
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`,
  );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Unit311 Central//Meeting Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN=${organiserCn}:mailto:${input.organiserEmail}`,
    ...attendeeLines,
    `URL:${input.meetingUrl}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function buildGoogleCalendarInviteUrl(input: {
  title: string;
  startsAt: string;
  endsAt: string;
  meetingUrl: string;
  description?: string | null;
}): string {
  const details = [
    input.description?.trim() || "Unit311 Central meeting",
    "",
    `Join: ${input.meetingUrl}`,
  ].join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${formatGoogleCalendarDate(input.startsAt)}/${formatGoogleCalendarDate(input.endsAt)}`,
    details,
    location: input.meetingUrl,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Send meeting invitation emails to internal and external attendees.
 * Includes ICS (Outlook / Apple / Android) plus a Google Calendar deep link.
 */
export async function sendCalendarMeetingInvites(input: {
  event: CalendarEvent;
  attendeeEmails: string[];
  organiserName?: string | null;
  organiserEmail?: string | null;
  workspaceId?: string | null;
  timeZone?: string | null;
}): Promise<{
  sent: number;
  failed: string[];
  meetingUrl: string;
  errors: Record<string, string>;
}> {
  const emails = normalizeAttendeeEmails(input.attendeeEmails);
  const meetingUrl =
    input.event.location && /^https?:\/\//i.test(input.event.location)
      ? input.event.location
      : buildCalendarMeetingUrl(input.event.id);

  if (emails.length === 0) {
    return { sent: 0, failed: [], meetingUrl, errors: {} };
  }

  const timeZone = resolveMeetingTimezone(input.event, input.timeZone);
  const timezoneMeta = getFounderBookingTimezone(timeZone);
  const organiser = input.organiserName?.trim() || "Unit311 Central";
  const organiserEmail = input.organiserEmail?.trim() || "info@unit311central.com";
  const description =
    stripAttendeesFromNotes(stripTimezoneLine(input.event.notes)) || "No additional description.";
  const startsLabel = formatMeetingWhen(input.event.startsAt, timeZone);
  const endsLabel = formatMeetingWhen(input.event.endsAt, timeZone);
  const googleCalendarUrl = buildGoogleCalendarInviteUrl({
    title: input.event.title,
    startsAt: input.event.startsAt,
    endsAt: input.event.endsAt,
    meetingUrl,
    description,
  });

  const ics = buildCalendarMeetingIcs({
    event: input.event,
    meetingUrl,
    organiserName: organiser,
    organiserEmail,
    attendeeEmails: emails,
    timeZone,
  });

  const failed: string[] = [];
  const errors: Record<string, string> = {};
  let sent = 0;

  for (const to of emails) {
    try {
      const html = emailShell(
        "Meeting invitation",
        `
          <p style="margin:0 0 16px;font-size:15px;color:#334155;">
            You are invited to a meeting on Unit311 Central.
          </p>
          <p style="margin:0 0 8px;font-size:15px;color:#334155;">
            <strong>Meeting:</strong> ${escapeHtml(input.event.title)}
          </p>
          <p style="margin:0 0 8px;font-size:15px;color:#334155;">
            <strong>Date &amp; time:</strong> ${escapeHtml(startsLabel)} – ${escapeHtml(endsLabel)}
          </p>
          <p style="margin:0 0 8px;font-size:15px;color:#334155;">
            <strong>Timezone:</strong> ${escapeHtml(timezoneMeta.label)} (${escapeHtml(timezoneMeta.abbreviation)})
          </p>
          <p style="margin:0 0 8px;font-size:15px;color:#334155;">
            <strong>Organiser:</strong> ${escapeHtml(organiser)}${organiserEmail ? ` &lt;${escapeHtml(organiserEmail)}&gt;` : ""}
          </p>
          <p style="margin:0 0 16px;font-size:15px;color:#334155;">
            <strong>Description:</strong> ${escapeHtml(description)}
          </p>
          <p style="margin:0 0 20px;">
            <a href="${meetingUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px;">
              Join meeting
            </a>
          </p>
          <p style="margin:0 0 20px;font-size:13px;color:#64748b;">
            Meeting link: <a href="${meetingUrl}" style="color:#2563eb;">${escapeHtml(meetingUrl)}</a>
          </p>
          <div style="margin:24px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#0b2d63;">
              Add this meeting to your calendar
            </p>
            <p style="margin:0 0 10px;font-size:14px;color:#475569;">
              An ICS calendar invite is attached for Outlook, Apple Calendar, Google Calendar, and Android.
            </p>
            <p style="margin:0;">
              <a href="${googleCalendarUrl}" style="display:inline-block;border:1px solid #2563eb;color:#2563eb;background:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 16px;border-radius:10px;">
                Google Calendar
              </a>
            </p>
          </div>
        `,
      );

      const text = [
        `You are invited to a meeting on Unit311 Central.`,
        ``,
        `Meeting: ${input.event.title}`,
        `Date & time: ${startsLabel} – ${endsLabel}`,
        `Timezone: ${timezoneMeta.label} (${timezoneMeta.abbreviation})`,
        `Organiser: ${organiser}${organiserEmail ? ` <${organiserEmail}>` : ""}`,
        `Description: ${description}`,
        ``,
        `Join meeting: ${meetingUrl}`,
        ``,
        `An ICS calendar invite is attached for Outlook, Apple Calendar, Google Calendar, and Android.`,
        `Google Calendar: ${googleCalendarUrl}`,
      ].join("\n");

      await sendMailboxEmail({
        account: "info",
        workspaceId: input.workspaceId ?? null,
        to,
        subject: `Meeting invitation: ${input.event.title}`,
        text,
        html,
        attachments: [
          {
            filename: "unit311-meeting.ics",
            content: ics,
            contentType: "text/calendar; method=REQUEST; charset=UTF-8",
          },
        ],
      });
      sent += 1;
    } catch (error) {
      failed.push(to);
      errors[to] = error instanceof Error ? error.message : "Unknown invite send error";
    }
  }

  return { sent, failed, meetingUrl, errors };
}

function stripTimezoneLine(notes: string | null | undefined) {
  return (notes ?? "").replace(/\n?Timezone:\s*.+$/im, "").trim();
}
