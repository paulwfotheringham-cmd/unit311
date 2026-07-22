import fs from "node:fs";

import {
  buildCalendarMeetingIcs,
  buildCalendarMeetingUrl,
  buildGoogleCalendarInviteUrl,
  sendCalendarMeetingInvites,
} from "../src/lib/calendar-invite-email";
import {
  addMinutesToIso,
  combineDateTimeInTimezone,
} from "../src/lib/calendar-meeting-time";
import { getInternalNavBreadcrumb } from "../src/lib/internal-operations-data";

async function main() {
  const crumbs = getInternalNavBreadcrumb("clients-dashboard");
  console.log("breadcrumb:", crumbs.join(" / "));
  if (crumbs.join(" / ") !== "Business Central / Clients") {
    console.error("FAIL breadcrumb");
    process.exit(1);
  }
  console.log("PASS breadcrumb");

  const startsAt = combineDateTimeInTimezone("2026-07-25", "14:30", "Europe/London");
  const endsAt = addMinutesToIso(startsAt, 45);
  const eventId = "smoke-meeting-0001";
  const meetingUrl = buildCalendarMeetingUrl(eventId);

  const event = {
    id: eventId,
    title: "Unit311 Clients Dashboard smoke meeting",
    eventType: "meeting" as const,
    startsAt,
    endsAt,
    clientName: null,
    location: meetingUrl,
    notes: "Timezone: Europe/London\nAttendees: smoke@example.com",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ics = buildCalendarMeetingIcs({
    event,
    meetingUrl,
    organiserName: "Unit311 Central",
    organiserEmail: "info@unit311central.com",
    attendeeEmails: ["smoke@example.com"],
    timeZone: "Europe/London",
  });

  const googleUrl = buildGoogleCalendarInviteUrl({
    title: event.title,
    startsAt,
    endsAt,
    meetingUrl,
    description: "Smoke test",
  });

  const checks: Array<[string, boolean]> = [
    ["METHOD:REQUEST", ics.includes("METHOD:REQUEST")],
    ["DTSTART present", /DTSTART:\d{8}T\d{6}Z/.test(ics)],
    ["DTEND present", /DTEND:\d{8}T\d{6}Z/.test(ics)],
    ["LOCATION is meeting URL", ics.includes(meetingUrl)],
    ["URL present", ics.includes(`URL:${meetingUrl}`)],
    ["ATTENDEE present", ics.includes("ATTENDEE;")],
    ["Meeting URL host", meetingUrl.includes("/meet/video/")],
    ["Google Calendar link", googleUrl.includes("calendar.google.com")],
    ["Timezone conversion UTC", startsAt.endsWith("Z")],
  ];

  let failed = 0;
  for (const [label, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) failed += 1;
  }

  fs.mkdirSync(".tmp-calendar-invite-smoke", { recursive: true });
  fs.writeFileSync(".tmp-calendar-invite-smoke/unit311-meeting.ics", ics, "utf8");
  fs.writeFileSync(
    ".tmp-calendar-invite-smoke/meta.json",
    JSON.stringify({ startsAt, endsAt, meetingUrl, googleUrl }, null, 2),
  );
  console.log("Wrote ICS to .tmp-calendar-invite-smoke/unit311-meeting.ics");

  if (process.env.SEND_TEST_INVITE === "1") {
    const to = process.env.TEST_INVITE_TO?.trim();
    if (!to) {
      console.error("SEND_TEST_INVITE=1 requires TEST_INVITE_TO");
      process.exit(1);
    }
    const result = await sendCalendarMeetingInvites({
      event,
      attendeeEmails: [to],
      organiserName: "Unit311 Central",
      organiserEmail: "info@unit311central.com",
      workspaceId: process.env.TEST_WORKSPACE_ID || null,
      timeZone: "Europe/London",
    });
    console.log("Invite send result:", result);
    if (result.sent < 1) {
      failed += 1;
      console.error("FAIL  real invite send");
    } else {
      console.log("PASS  real invite send");
    }
  }

  if (failed > 0) process.exit(1);
  console.log("OK: calendar meeting invite smoke checks passed");
}

void main();
