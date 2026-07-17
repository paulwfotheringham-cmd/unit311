import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { FOUNDER_SLOT_MINUTES } from "@/lib/founder-booking/slots";

export const DISCOVERY_SESSION_TITLE = "Discovery Session – Unit311 Central";
const ORGANIZER_EMAIL = "info@unit311central.com";

export type DiscoverySessionCalendarInput = {
  startsAt: string;
  endsAt: string;
  videoLink: string;
  organization: string;
  bookingId: string;
};

export function getDiscoverySessionEndsAt(startsAt: string): string {
  return new Date(
    new Date(startsAt).getTime() + FOUNDER_SLOT_MINUTES * 60_000,
  ).toISOString();
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

function buildDiscoverySessionDescription(input: DiscoverySessionCalendarInput): string {
  return `Discovery session with Unit311 Central for ${input.organization}.\n\nJoin: ${input.videoLink}`;
}

export function buildDiscoverySessionIcs(input: DiscoverySessionCalendarInput): string {
  const uid = `discovery-${input.bookingId}@unit311central.com`;
  const dtStamp = formatIcsUtc(new Date().toISOString());
  const dtStart = formatIcsUtc(input.startsAt);
  const dtEnd = formatIcsUtc(input.endsAt);
  const description = escapeIcsText(buildDiscoverySessionDescription(input));
  const summary = escapeIcsText(DISCOVERY_SESSION_TITLE);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Unit311 Central//Discovery Session//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "LOCATION:Online",
    `ORGANIZER;CN=Unit311 Central:mailto:${ORGANIZER_EMAIL}`,
    `URL:${input.videoLink}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

function formatGoogleCalendarDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildGoogleCalendarUrl(input: DiscoverySessionCalendarInput): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: DISCOVERY_SESSION_TITLE,
    dates: `${formatGoogleCalendarDate(input.startsAt)}/${formatGoogleCalendarDate(input.endsAt)}`,
    details: buildDiscoverySessionDescription(input),
    location: "Online",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildFounderSessionIcsDownloadUrl(meetingSlug: string): string {
  const slug = meetingSlug.trim().toLowerCase();
  return `${CENTRAL_SITE_URL}/api/book/founder-session/calendar/${encodeURIComponent(slug)}`;
}
