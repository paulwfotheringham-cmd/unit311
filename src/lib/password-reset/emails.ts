import { CENTRAL_SITE_URL } from "@/lib/app-domains";

export type PasswordResetEmailInput = {
  displayName: string;
  resetUrl: string;
  expiresInMinutes: number;
};

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

export function buildPasswordResetEmail(input: PasswordResetEmailInput) {
  const firstName = input.displayName.trim().split(/\s+/)[0] || "there";
  const subject = "Reset your Unit311 password";

  const html = emailShell(
    "Reset your password",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${escapeHtml(firstName)},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        We received a request to reset the password for your Unit311 account. Use the button below to choose a new password.
        This link expires in ${input.expiresInMinutes} minutes.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#0b2d63;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
          Reset password
        </a>
      </p>
      <p style="margin:0 0 16px;font-size:13px;color:#64748b;">
        If you did not request this, you can ignore this email. Your password will not change until you use the link above.
      </p>
      <p style="margin:0;font-size:12px;color:#94a3b8;word-break:break-all;">
        Link not working? Copy and paste this URL into your browser:<br/>
        <a href="${escapeHtml(input.resetUrl)}" style="color:#2563eb;">${escapeHtml(input.resetUrl)}</a>
      </p>
    `,
  );

  const text = [
    `Hi ${firstName},`,
    "",
    "We received a request to reset the password for your Unit311 account.",
    `Open this link within ${input.expiresInMinutes} minutes to choose a new password:`,
    input.resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  return { subject, html, text };
}
