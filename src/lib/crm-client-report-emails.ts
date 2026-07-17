import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { emailLogoHtml } from "@/lib/email-logo";
import { CONTACT } from "@/lib/site";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildClientReportEmail(input: {
  contactName: string;
  companyName: string;
  chatUrl: string;
  signupUrl: string;
}) {
  const firstName = input.contactName.trim().split(/\s+/)[0] || "there";
  const subject = `Your Unit311 Central executive report — ${input.companyName}`;

  const html = `
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
                    <h1 style="margin:0 0 16px;font-size:22px;color:#0b2d63;">Here is your report</h1>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hi ${escapeHtml(firstName)},</p>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
                      Thank you for your executive strategy session with Unit311 Central.
                      Your report for <strong>${escapeHtml(input.companyName)}</strong> is attached to this email.
                    </p>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
                      If you would like to continue the conversation with our team, you can chat with us directly — no login required:
                    </p>
                    <p style="margin:0 0 24px;">
                      <a href="${escapeHtml(input.chatUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
                        Open team chat
                      </a>
                    </p>
                    <h2 style="margin:0 0 12px;font-size:18px;line-height:1.4;color:#0b2d63;">Ready to move forward?</h2>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
                      If you&apos;re happy with your Intro &amp; Demo Session and would like to become a Unit311 Central customer, click below to enter your details and complete payment. Once payment has been received, we&apos;ll create your account and prepare your platform for you.
                    </p>
                    <p style="margin:0 0 24px;">
                      <a href="${escapeHtml(input.signupUrl)}" style="display:inline-block;background:#0b2d63;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
                        Continue to Payment
                      </a>
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;color:#334155;">
                      Prefer email? Contact us at
                      <a href="mailto:${escapeHtml(CONTACT.infoEmail)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(CONTACT.infoEmail)}</a>.
                    </p>
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

  const text = [
    `Hi ${firstName},`,
    "",
    `Here is your executive report for ${input.companyName}. The PDF is attached.`,
    "",
    `Continue the conversation (no login): ${input.chatUrl}`,
    "",
    "Ready to move forward?",
    "If you're happy with your Intro & Demo Session and would like to become a Unit311 Central customer, click below to enter your details and complete payment. Once payment has been received, we'll create your account and prepare your platform for you.",
    `Continue to Payment: ${input.signupUrl}`,
    `Contact us: ${CONTACT.infoEmail}`,
  ].join("\n");

  return { subject, html, text };
}

export function buildAdminReportNotificationEmail(input: {
  companyName: string;
  contactName: string;
  contactEmail: string;
  fileName: string;
  chatUrl: string;
}) {
  const subject = `Client report sent — ${input.companyName}`;

  const html = `
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
                    <h1 style="margin:0 0 16px;font-size:22px;color:#0b2d63;">Client report generated</h1>
                    <p style="margin:0 0 12px;font-size:15px;color:#334155;">
                      <strong>${escapeHtml(input.companyName)}</strong> · ${escapeHtml(input.contactName)}
                    </p>
                    <p style="margin:0 0 12px;font-size:14px;color:#334155;">Emailed to: ${escapeHtml(input.contactEmail)}</p>
                    <p style="margin:0 0 12px;font-size:14px;color:#334155;">File: ${escapeHtml(input.fileName)}</p>
                    <p style="margin:0 0 24px;font-size:14px;color:#334155;">
                      Guest chat link:
                      <a href="${escapeHtml(input.chatUrl)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(input.chatUrl)}</a>
                    </p>
                    <p style="margin:0;font-size:12px;color:#94a3b8;">
                      Unit311 Central internal notification
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

  const text = [
    `Client report sent for ${input.companyName}.`,
    `Contact: ${input.contactName} <${input.contactEmail}>`,
    `File: ${input.fileName}`,
    `Guest chat: ${input.chatUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export function buildAdminReportDraftReadyEmail(input: {
  companyName: string;
  contactName: string;
  pdfFileName: string;
  pptFileName: string;
  crmUrl: string;
}) {
  const subject = `Review client report — ${input.companyName}`;

  const html = `
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
                    <h1 style="margin:0 0 16px;font-size:22px;color:#0b2d63;">Client report draft ready</h1>
                    <p style="margin:0 0 12px;font-size:15px;color:#334155;">
                      <strong>${escapeHtml(input.companyName)}</strong> · ${escapeHtml(input.contactName)}
                    </p>
                    <p style="margin:0 0 12px;font-size:14px;color:#334155;">
                      PDF and PowerPoint copies were saved to the client external folder:
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;color:#334155;">${escapeHtml(input.pdfFileName)}</p>
                    <p style="margin:0 0 16px;font-size:14px;color:#334155;">${escapeHtml(input.pptFileName)}</p>
                    <p style="margin:0 0 24px;font-size:14px;color:#334155;">
                      Review the PowerPoint in CRM, then click <strong>Generate PDF</strong> to email the client.
                    </p>
                    <p style="margin:0 0 24px;">
                      <a href="${escapeHtml(input.crmUrl)}" style="display:inline-block;background:#0b2d63;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
                        Open CRM lead
                      </a>
                    </p>
                    <p style="margin:0;font-size:12px;color:#94a3b8;">
                      Unit311 Central internal notification
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

  const text = [
    `Client report draft ready for ${input.companyName}.`,
    `Review ${input.pdfFileName} and ${input.pptFileName} in the client folder.`,
    `Approve in CRM before the client is emailed.`,
    `Open CRM: ${input.crmUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export function clientReportEmailSubject(companyName: string) {
  return `Your Unit311 Central executive report — ${companyName.trim()}`;
}

function buildClientReportReminderEmail(input: {
  contactName: string;
  companyName: string;
  chatUrl: string;
  signupUrl: string;
  stage: "7d" | "14d";
}) {
  const firstName = input.contactName.trim().split(/\s+/)[0] || "there";
  const subject =
    input.stage === "7d"
      ? `Reminder — your Unit311 Central executive report (${input.companyName})`
      : `Following up — your Unit311 Central executive report (${input.companyName})`;

  const intro =
    input.stage === "7d"
      ? "We sent your executive report last week and wanted to check whether you had any questions."
      : "We have not heard back yet and wanted to follow up one more time on your executive report.";

  const html = `
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
                    <h1 style="margin:0 0 16px;font-size:22px;color:#0b2d63;">Quick follow-up</h1>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hi ${escapeHtml(firstName)},</p>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">${intro}</p>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
                      Please reply to this email or use our guest chat to continue the conversation about
                      <strong>${escapeHtml(input.companyName)}</strong>.
                    </p>
                    <p style="margin:0 0 24px;">
                      <a href="${escapeHtml(input.chatUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
                        Open team chat
                      </a>
                    </p>
                    <h2 style="margin:0 0 12px;font-size:18px;line-height:1.4;color:#0b2d63;">Ready to move forward?</h2>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
                      If you&apos;re happy with your Intro &amp; Demo Session and would like to become a Unit311 Central customer, click below to enter your details and complete payment. Once payment has been received, we&apos;ll create your account and prepare your platform for you.
                    </p>
                    <p style="margin:0 0 24px;">
                      <a href="${escapeHtml(input.signupUrl)}" style="display:inline-block;background:#0b2d63;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
                        Continue to Payment
                      </a>
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;color:#334155;">
                      Reply to us at
                      <a href="mailto:${escapeHtml(CONTACT.infoEmail)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(CONTACT.infoEmail)}</a>.
                    </p>
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

  const text = [
    `Hi ${firstName},`,
    "",
    intro,
    "",
    `Reply to ${CONTACT.infoEmail} or open the guest chat: ${input.chatUrl}`,
    "",
    "Ready to move forward?",
    "If you're happy with your Intro & Demo Session and would like to become a Unit311 Central customer, click below to enter your details and complete payment. Once payment has been received, we'll create your account and prepare your platform for you.",
    `Continue to Payment: ${input.signupUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export function buildClientReport7DayReminderEmail(input: {
  contactName: string;
  companyName: string;
  chatUrl: string;
  signupUrl: string;
}) {
  return buildClientReportReminderEmail({ ...input, stage: "7d" });
}

export function buildClientReport14DayReminderEmail(input: {
  contactName: string;
  companyName: string;
  chatUrl: string;
  signupUrl: string;
}) {
  return buildClientReportReminderEmail({ ...input, stage: "14d" });
}
