import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { sendMailboxEmail } from "@/lib/email/smtp";
import type { CalendarEvent } from "@/lib/calendar-data";

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

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

/**
 * Send meeting invitation emails to internal and external attendees.
 */
export async function sendCalendarMeetingInvites(input: {
  event: CalendarEvent;
  attendeeEmails: string[];
  organiserName?: string | null;
  organiserEmail?: string | null;
  workspaceId?: string | null;
}): Promise<{ sent: number; failed: string[] }> {
  const emails = normalizeAttendeeEmails(input.attendeeEmails);
  if (emails.length === 0) return { sent: 0, failed: [] };

  const joinUrl =
    input.event.location && /^https?:\/\//i.test(input.event.location)
      ? input.event.location
      : `${CENTRAL_SITE_URL}/internaldashboard?view=calendar`;

  const organiser = input.organiserName?.trim() || "Unit311 Central";
  const when = `${formatWhen(input.event.startsAt)} – ${formatWhen(input.event.endsAt)}`;
  const description = input.event.notes?.replace(/\n?Attendees:\s*.+$/im, "").trim() || "No additional description.";

  const failed: string[] = [];
  let sent = 0;

  for (const to of emails) {
    try {
      await sendMailboxEmail({
        account: "info",
        workspaceId: input.workspaceId ?? null,
        to,
        subject: `Meeting invitation: ${input.event.title}`,
        text: [
          `You are invited to a meeting on Unit311 Central.`,
          ``,
          `Title: ${input.event.title}`,
          `Organiser: ${organiser}${input.organiserEmail ? ` <${input.organiserEmail}>` : ""}`,
          `When: ${when}`,
          `Description: ${description}`,
          ``,
          `Join meeting: ${joinUrl}`,
        ].join("\n"),
        html: `
          <div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;line-height:1.5">
            <h2 style="margin:0 0 12px;font-size:18px">Meeting invitation</h2>
            <p style="margin:0 0 8px"><strong>${escapeHtml(input.event.title)}</strong></p>
            <p style="margin:0 0 4px"><strong>Organiser:</strong> ${escapeHtml(organiser)}</p>
            <p style="margin:0 0 4px"><strong>Date &amp; time:</strong> ${escapeHtml(when)}</p>
            <p style="margin:0 0 16px"><strong>Description:</strong> ${escapeHtml(description)}</p>
            <p style="margin:0">
              <a href="${joinUrl}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">
                Join meeting
              </a>
            </p>
          </div>
        `,
      });
      sent += 1;
    } catch {
      failed.push(to);
    }
  }

  return { sent, failed };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
