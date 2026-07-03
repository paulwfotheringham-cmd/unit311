import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { formatLondonDateTime, firstNameFromFullName } from "@/lib/founder-booking/slots";

type FounderBookingEmailInput = {
  name: string;
  organization: string;
  email: string;
  startsAt: string;
  videoLink: string;
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

function meetingDetailsHtml(input: FounderBookingEmailInput) {
  const when = formatLondonDateTime(input.startsAt);
  return `
    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
      <strong>When:</strong> ${when} (UK time)<br/>
      <strong>Organisation:</strong> ${input.organization}<br/>
      <strong>Duration:</strong> 30 minutes
    </p>
    <p style="margin:0 0 20px;">
      <a href="${input.videoLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px;">
        Join your video session
      </a>
    </p>
    <p style="margin:0;font-size:13px;color:#64748b;">
      Video link: <a href="${input.videoLink}" style="color:#2563eb;">${input.videoLink}</a>
    </p>
  `;
}

export function buildFounderConfirmationEmail(input: FounderBookingEmailInput) {
  const firstName = firstNameFromFullName(input.name);
  const when = formatLondonDateTime(input.startsAt);
  const html = emailShell(
    "Your founder session is confirmed",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Thank you for booking a complimentary founder session with Unit311 Central. We&apos;re looking forward to
        learning more about ${input.organization} and exploring whether the platform is the right fit for your team.
      </p>
      ${meetingDetailsHtml(input)}
      <p style="margin:20px 0 0;font-size:14px;color:#475569;">
        We&apos;ll send a short reminder the day before your session. If you need to reschedule, simply reply to this email.
      </p>
    `,
  );

  return {
    subject: `Founder session confirmed — ${when}`,
    html,
    text: `Hi ${firstName},\n\nYour founder session is confirmed for ${when} (UK time).\n\nJoin your video session: ${input.videoLink}\n\nWe look forward to speaking with you.\n\nUnit311 Central`,
  };
}

export function buildFounderReminderEmail(input: FounderBookingEmailInput) {
  const firstName = firstNameFromFullName(input.name);
  const when = formatLondonDateTime(input.startsAt);
  const html = emailShell(
    "Reminder: your founder session is tomorrow",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Just a friendly reminder that your complimentary founder session with Unit311 Central is coming up tomorrow.
        We&apos;re looking forward to speaking with you about ${input.organization} and how the platform could support your operations.
      </p>
      ${meetingDetailsHtml(input)}
      <p style="margin:20px 0 0;font-size:14px;color:#475569;">
        If anything has changed, reply to this email and we&apos;ll help you find another time.
      </p>
    `,
  );

  return {
    subject: `Reminder: founder session tomorrow — ${when}`,
    html,
    text: `Hi ${firstName},\n\nReminder: your founder session is tomorrow at ${when} (UK time).\n\nJoin your video session: ${input.videoLink}\n\nSee you then,\nUnit311 Central`,
  };
}

export function buildFounderInternalNotificationEmail(input: FounderBookingEmailInput) {
  const when = formatLondonDateTime(input.startsAt);
  const html = emailShell(
    "New founder session booking",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        A new complimentary founder session has been booked on unit311central.com/book.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        <strong>Name:</strong> ${input.name}<br/>
        <strong>Organisation:</strong> ${input.organization}<br/>
        <strong>Email:</strong> <a href="mailto:${input.email}" style="color:#2563eb;">${input.email}</a><br/>
        <strong>When:</strong> ${when} (UK time)
      </p>
      ${meetingDetailsHtml(input)}
      <p style="margin:20px 0 0;font-size:14px;color:#475569;">
        This session has been added to the internal calendar in Unit311 Central.
      </p>
    `,
  );

  return {
    subject: `New founder session — ${input.name} (${input.organization})`,
    html,
    text: `New founder session booked.\n\n${input.name}\n${input.organization}\n${input.email}\n${when}\n\nVideo: ${input.videoLink}`,
  };
}
