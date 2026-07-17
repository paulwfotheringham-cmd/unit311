import { CENTRAL_SITE_URL } from "@/lib/app-domains";

export type ContactEnquiryInput = {
  firstName: string;
  surname: string;
  organisation: string;
  role: string;
  email: string;
  subject: string;
  message: string;
};

function fullName(input: ContactEnquiryInput) {
  return [input.firstName, input.surname].filter(Boolean).join(" ").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function enquiryDetailsHtml(input: ContactEnquiryInput) {
  const subjectLine = input.subject
    ? `<strong>Subject:</strong> ${escapeHtml(input.subject)}<br/>`
    : "";
  const roleLine = input.role
    ? `<strong>Role:</strong> ${escapeHtml(input.role)}<br/>`
    : "";

  return `
    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
      <strong>Name:</strong> ${escapeHtml(fullName(input))}<br/>
      <strong>Organisation:</strong> ${escapeHtml(input.organisation)}<br/>
      ${roleLine}
      <strong>Email:</strong> <a href="mailto:${escapeHtml(input.email)}" style="color:#2563eb;">${escapeHtml(input.email)}</a><br/>
      ${subjectLine}
    </p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
        Message
      </p>
      <p style="margin:0;font-size:15px;color:#334155;white-space:pre-wrap;">${escapeHtml(input.message)}</p>
    </div>
  `;
}

export function buildContactConfirmationEmail(input: ContactEnquiryInput) {
  const greeting = escapeHtml(input.firstName || "there");
  const bookUrl = `${CENTRAL_SITE_URL}/book`;
  const html = emailShell(
    "Thank you for contacting Unit311 Central",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${greeting},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Thank you for contacting Unit311 Central.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        We have received your enquiry and will review it as soon as possible.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        If appropriate, a member of our team will contact you shortly.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        If you would prefer to arrange an Executive Strategy Session immediately, you can book one at:
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        <a href="${bookUrl}" style="color:#2563eb;text-decoration:none;">${bookUrl}</a>
      </p>
      <p style="margin:0;font-size:15px;color:#334155;">
        Kind regards,<br/>
        Unit311 Central
      </p>
    `,
  );

  return {
    subject: "Thank you for contacting Unit311 Central",
    html,
    text: [
      `Hi ${input.firstName},`,
      "",
      "Thank you for contacting Unit311 Central.",
      "",
      "We have received your enquiry and will review it as soon as possible.",
      "",
      "If appropriate, a member of our team will contact you shortly.",
      "",
      "If you would prefer to arrange an Executive Strategy Session immediately, you can book one at:",
      "",
      bookUrl,
      "",
      "Kind regards,",
      "",
      "Unit311 Central",
    ].join("\n"),
  };
}

export function buildContactInternalNotificationEmail(input: ContactEnquiryInput) {
  const name = fullName(input);
  const html = emailShell(
    "New contact form enquiry",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        A new enquiry was submitted on unit311central.com/contact.
      </p>
      ${enquiryDetailsHtml(input)}
      <p style="margin:0;font-size:14px;color:#475569;">
        Reply directly to this email to respond to ${escapeHtml(name)}.
      </p>
    `,
  );

  return {
    subject: `New contact enquiry — ${name} (${input.subject.trim() || "General enquiry"})`,
    html,
    text: `New contact form enquiry from unit311central.com/contact.\n\nName: ${name}\nOrganisation: ${input.organisation}\n${input.role ? `Role: ${input.role}\n` : ""}Email: ${input.email}\n${input.subject ? `Subject: ${input.subject}\n` : ""}\nMessage:\n${input.message}`,
  };
}
