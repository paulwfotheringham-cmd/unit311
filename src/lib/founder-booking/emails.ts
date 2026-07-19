import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import {
  buildFounderSessionIcsDownloadUrl,
  buildGoogleCalendarUrl,
  getDiscoverySessionEndsAt,
} from "@/lib/founder-booking/calendar";
import { formatLondonDateTime, firstNameFromFullName } from "@/lib/founder-booking/slots";
import {
  formatDateTimeInTimezone,
  getFounderBookingTimezone,
} from "@/lib/founder-booking/timezones";

type FounderBookingEmailInput = {
  name: string;
  organization: string;
  role?: string;
  email: string;
  startsAt: string;
  endsAt?: string;
  videoLink: string;
  clientTimezone?: string;
  meetingSlug?: string;
  bookingId?: string;
};

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

function formatGmtWhen(startsAt: string) {
  return `${formatLondonDateTime(startsAt)} (GMT)`;
}

function formatClientWhen(input: FounderBookingEmailInput) {
  if (!input.clientTimezone) return null;
  const timezone = getFounderBookingTimezone(input.clientTimezone);
  return `${formatDateTimeInTimezone(input.startsAt, timezone.id)} (${timezone.label})`;
}

function clientMeetingTimesHtml(input: FounderBookingEmailInput) {
  const clientWhen = formatClientWhen(input);
  const gmtWhen = formatGmtWhen(input.startsAt);

  if (clientWhen) {
    return `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        <strong>Your time:</strong> ${clientWhen}<br/>
        <strong>GMT:</strong> ${gmtWhen}
      </p>
    `;
  }

  return `
    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
      <strong>When:</strong> ${gmtWhen}
    </p>
  `;
}

function internalMeetingTimeHtml(startsAt: string) {
  return `
    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
      <strong>When (GMT):</strong> ${formatGmtWhen(startsAt)}
    </p>
  `;
}

function emailSecondaryButton(href: string, label: string) {
  return `
    <a href="${href}" style="display:inline-block;border:1px solid #2563eb;color:#2563eb;background:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 16px;border-radius:10px;">
      ${label}
    </a>
  `;
}

function calendarActionsHtml(input: FounderBookingEmailInput) {
  if (!input.meetingSlug || !input.bookingId) return "";

  const endsAt = input.endsAt ?? getDiscoverySessionEndsAt(input.startsAt);
  const icsUrl = buildFounderSessionIcsDownloadUrl(input.meetingSlug);
  const googleCalendarUrl = buildGoogleCalendarUrl({
    startsAt: input.startsAt,
    endsAt,
    videoLink: input.videoLink,
    organization: input.organization,
    bookingId: input.bookingId,
  });

  return `
    <div style="margin:24px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#0b2d63;">
        Add this meeting to your calendar
      </p>
      <p style="margin:0 0 10px;">
        ${emailSecondaryButton(icsUrl, "Outlook / Apple Calendar")}
      </p>
      <p style="margin:0;">
        ${emailSecondaryButton(googleCalendarUrl, "Google Calendar")}
      </p>
    </div>
  `;
}

function meetingDetailsHtml(
  input: FounderBookingEmailInput,
  internal = false,
  includeCalendarActions = false,
) {
  return `
    ${internal ? internalMeetingTimeHtml(input.startsAt) : clientMeetingTimesHtml(input)}
    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
      <strong>Organisation:</strong> ${input.organization}<br/>
      <strong>Duration:</strong> 30 minutes
    </p>
    <p style="margin:0 0 20px;">
      <a href="${input.videoLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px;">
        Join discovery call
      </a>
    </p>
    ${includeCalendarActions ? calendarActionsHtml(input) : ""}
    <p style="margin:${includeCalendarActions ? "20px" : "0"} 0 0;font-size:13px;color:#64748b;">
      Meeting link: <a href="${input.videoLink}" style="color:#2563eb;">${input.videoLink}</a>
    </p>
  `;
}

export function buildFounderConfirmationEmail(input: FounderBookingEmailInput) {
  const firstName = firstNameFromFullName(input.name);
  const gmtWhen = formatGmtWhen(input.startsAt);
  const clientWhen = formatClientWhen(input);
  const endsAt = input.endsAt ?? getDiscoverySessionEndsAt(input.startsAt);
  const icsUrl = input.meetingSlug ? buildFounderSessionIcsDownloadUrl(input.meetingSlug) : null;
  const googleCalendarUrl =
    input.bookingId && input.meetingSlug
      ? buildGoogleCalendarUrl({
          startsAt: input.startsAt,
          endsAt,
          videoLink: input.videoLink,
          organization: input.organization,
          bookingId: input.bookingId,
        })
      : null;

  const html = emailShell(
    "Your executive strategy session is confirmed",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Thank you for booking a free executive strategy session with Unit311 Central. We&apos;re looking forward to
        learning more about ${input.organization} and exploring whether the platform is the right fit for your team.
      </p>
      ${meetingDetailsHtml(input, false, true)}
      <p style="margin:20px 0 0;font-size:14px;color:#475569;">
        We&apos;ll send reminder emails one week before your session and again one hour before it starts.
        If you need to reschedule, simply reply to this email.
      </p>
    `,
  );

  const whenText = clientWhen
    ? `${clientWhen}\nGMT: ${gmtWhen}`
    : gmtWhen;

  const calendarText =
    icsUrl && googleCalendarUrl
      ? `\n\nAdd this meeting to your calendar:\nOutlook / Apple Calendar: ${icsUrl}\nGoogle Calendar: ${googleCalendarUrl}`
      : "";

  return {
    subject: `Executive strategy session confirmed — ${gmtWhen}`,
    html,
    text: `Hi ${firstName},\n\nYour executive strategy session is confirmed for:\n${whenText}\n\nJoin discovery call: ${input.videoLink}${calendarText}\n\nWe look forward to speaking with you.\n\nUnit311 Central`,
  };
}

export function buildFounderWeekReminderEmail(input: FounderBookingEmailInput) {
  const firstName = firstNameFromFullName(input.name);
  const gmtWhen = formatGmtWhen(input.startsAt);
  const clientWhen = formatClientWhen(input);
  const html = emailShell(
    "Reminder: your executive strategy session is in one week",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        This is a reminder that your executive strategy session with Unit311 Central is scheduled in one week.
      </p>
      ${meetingDetailsHtml(input)}
    `,
  );

  const whenText = clientWhen ? `${clientWhen}\nGMT: ${gmtWhen}` : gmtWhen;

  return {
    subject: `Reminder: executive strategy session in one week — ${gmtWhen}`,
    html,
    text: `Hi ${firstName},\n\nReminder: your executive strategy session is in one week.\n${whenText}\n\nJoin: ${input.videoLink}\n\nUnit311 Central`,
  };
}

export function buildFounderHourReminderEmail(input: FounderBookingEmailInput) {
  const firstName = firstNameFromFullName(input.name);
  const gmtWhen = formatGmtWhen(input.startsAt);
  const clientWhen = formatClientWhen(input);
  const html = emailShell(
    "Reminder: your executive strategy session starts in one hour",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Your executive strategy session with Unit311 Central starts in about one hour.
      </p>
      ${meetingDetailsHtml(input)}
    `,
  );

  const whenText = clientWhen ? `${clientWhen}\nGMT: ${gmtWhen}` : gmtWhen;

  return {
    subject: `Reminder: executive strategy session in one hour — ${gmtWhen}`,
    html,
    text: `Hi ${firstName},\n\nYour executive strategy session starts in about one hour.\n${whenText}\n\nJoin: ${input.videoLink}\n\nUnit311 Central`,
  };
}

export function buildFounderReminderEmail(input: FounderBookingEmailInput) {
  const firstName = firstNameFromFullName(input.name);
  const gmtWhen = formatGmtWhen(input.startsAt);
  const clientWhen = formatClientWhen(input);
  const html = emailShell(
    "Reminder: your executive strategy session is tomorrow",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Just a friendly reminder that your executive strategy session with Unit311 Central is coming up tomorrow.
        We&apos;re looking forward to speaking with you about ${input.organization} and how the platform could support your operations.
      </p>
      ${meetingDetailsHtml(input)}
      <p style="margin:20px 0 0;font-size:14px;color:#475569;">
        If anything has changed, reply to this email and we&apos;ll help you find another time.
      </p>
    `,
  );

  const whenText = clientWhen
    ? `${clientWhen}\nGMT: ${gmtWhen}`
    : gmtWhen;

  return {
    subject: `Reminder: executive strategy session tomorrow — ${gmtWhen}`,
    html,
    text: `Hi ${firstName},\n\nReminder: your executive strategy session is tomorrow at:\n${whenText}\n\nJoin your video session: ${input.videoLink}\n\nSee you then,\nUnit311 Central`,
  };
}

export function buildFounderStartMeetingEmail(input: FounderBookingEmailInput) {
  const firstName = firstNameFromFullName(input.name);
  const gmtWhen = formatGmtWhen(input.startsAt);
  const clientWhen = formatClientWhen(input);
  const html = emailShell(
    "Your executive strategy session is ready to start",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Your executive strategy session with Unit311 Central is ready. Use the link below to join your private
        meeting room for ${input.organization}.
      </p>
      ${meetingDetailsHtml(input)}
      <p style="margin:20px 0 0;font-size:14px;color:#475569;">
        We look forward to speaking with you.
      </p>
    `,
  );

  const whenText = clientWhen ? `${clientWhen}\nGMT: ${gmtWhen}` : gmtWhen;

  return {
    subject: `Your executive call is ready — ${input.organization}`,
    html,
    text: `Hi ${firstName},\n\nYour executive strategy session is ready.\n\nWhen: ${whenText}\n\nJoin your executive call: ${input.videoLink}\n\nWe look forward to speaking with you.\n\nUnit311 Central`,
  };
}

export function buildFounderPostMeetingThankYouEmail(input: FounderBookingEmailInput) {
  const firstName = firstNameFromFullName(input.name);
  const html = emailShell(
    "Thank you for your executive strategy session",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Thank you for taking the time to speak with us today about ${input.organization}.
        We appreciate your participation in the executive strategy session.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Your report is on the way. Our team is preparing a summary based on today&apos;s discussion
        and will be in contact with you soon with next steps.
      </p>
      <p style="margin:0;font-size:14px;color:#475569;">
        If you have any questions in the meantime, reply to this email and we&apos;ll come back to you promptly.
      </p>
    `,
  );

  return {
    subject: `Thank you — your report is on the way`,
    html,
    text: `Hi ${firstName},\n\nThank you for your participation in today's executive strategy session with Unit311 Central.\n\nYour report is on the way. We will be in contact soon.\n\nUnit311 Central`,
  };
}

export function buildFounderInternalNotificationEmail(input: FounderBookingEmailInput) {
  const gmtWhen = formatGmtWhen(input.startsAt);
  const clientTimezoneLabel = input.clientTimezone
    ? getFounderBookingTimezone(input.clientTimezone).label
    : null;

  const html = emailShell(
    "New executive strategy session booking",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        A new executive strategy session has been booked on unit311central.com/book.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        <strong>Name:</strong> ${input.name}<br/>
        <strong>Organisation:</strong> ${input.organization}<br/>
        ${input.role ? `<strong>Role:</strong> ${input.role}<br/>` : ""}
        <strong>Email:</strong> <a href="mailto:${input.email}" style="color:#2563eb;">${input.email}</a><br/>
        ${clientTimezoneLabel ? `<strong>Client timezone:</strong> ${clientTimezoneLabel}<br/>` : ""}
      </p>
      ${meetingDetailsHtml(input, true)}
      <p style="margin:20px 0 0;font-size:14px;color:#475569;">
        This session has been added to the internal calendar in Unit311 Central.
      </p>
    `,
  );

  return {
    subject: `New executive strategy session — ${input.name} (${input.organization})`,
    html,
    text: `New executive strategy session booked.\n\n${input.name}\n${input.organization}${input.role ? `\n${input.role}` : ""}\n${input.email}\n${gmtWhen}\n\nVideo: ${input.videoLink}`,
  };
}
