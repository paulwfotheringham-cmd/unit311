import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { emailLogoHtml } from "@/lib/email-logo";

export type EmailVerificationEmailInput = {
  displayName: string;
  verifyUrl: string;
  expiresInHours: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

export function buildEmailVerificationEmail(input: EmailVerificationEmailInput) {
  const firstName = input.displayName.trim().split(/\s+/)[0] || "there";
  const subject = "Verify your Unit311 Central email";

  const html = emailShell(
    "Verify your email",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${escapeHtml(firstName)},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Thanks for creating your Unit311 Central account. Please verify your email address to continue to payment setup.
        This link expires in ${input.expiresInHours} hours.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(input.verifyUrl)}" style="display:inline-block;background:#0b2d63;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
          Verify email
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#94a3b8;word-break:break-all;">
        Link not working? Copy and paste this URL into your browser:<br/>
        <a href="${escapeHtml(input.verifyUrl)}" style="color:#2563eb;">${escapeHtml(input.verifyUrl)}</a>
      </p>
    `,
  );

  const text = [
    `Hi ${firstName},`,
    "",
    "Thanks for creating your Unit311 Central account.",
    "Verify your email to continue to payment setup:",
    input.verifyUrl,
    "",
    `This link expires in ${input.expiresInHours} hours.`,
  ].join("\n");

  return { subject, html, text };
}

export function buildPaymentConfiguringEmail(input: {
  displayName: string;
  companyName: string;
  platformUrl: string;
}) {
  const firstName = input.displayName.trim().split(/\s+/)[0] || "there";
  const subject = "Thank you for your payment — your platform is being configured";

  const html = emailShell(
    "Payment received",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${escapeHtml(firstName)},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Thank you for your payment. We have received it successfully and your Unit311Central platform
        for <strong>${escapeHtml(input.companyName)}</strong> is now being configured.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Your dedicated workspace will be available at:
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#0b2d63;font-weight:600;word-break:break-all;">
        ${escapeHtml(input.platformUrl)}
      </p>
      <p style="margin:0;font-size:14px;color:#64748b;">
        We will email you again when your platform is ready with a link to sign in.
      </p>
    `,
  );

  const text = [
    `Hi ${firstName},`,
    "",
    "Thank you for your payment. We have received it successfully.",
    `Your Unit311Central platform for ${input.companyName} is now being configured.`,
    "",
    `Your dedicated workspace URL: ${input.platformUrl}`,
    "",
    "We will email you again when your platform is ready with a link to sign in.",
  ].join("\n");

  return { subject, html, text };
}

export function buildPlatformReadyEmail(input: {
  displayName: string;
  companyName: string;
  loginUrl: string;
  dashboardUrl: string;
  platformUrl: string;
}) {
  const firstName = input.displayName.trim().split(/\s+/)[0] || "there";
  const subject = "Your Unit311Central platform is ready";

  const html = emailShell(
    "Platform ready",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${escapeHtml(firstName)},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Great news — your Unit311Central platform for
        <strong>${escapeHtml(input.companyName)}</strong> is ready.
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Sign in at your dedicated workspace:
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#0b2d63;font-weight:600;word-break:break-all;">
        ${escapeHtml(input.platformUrl)}
      </p>
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#0b2d63;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
          Sign in to your platform
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#94a3b8;word-break:break-all;">
        After signing in you will be taken to your dashboard:<br/>
        <a href="${escapeHtml(input.dashboardUrl)}" style="color:#2563eb;">${escapeHtml(input.dashboardUrl)}</a>
      </p>
    `,
  );

  const text = [
    `Hi ${firstName},`,
    "",
    `Your Unit311Central platform for ${input.companyName} is ready.`,
    "",
    `Workspace: ${input.platformUrl}`,
    `Sign in: ${input.loginUrl}`,
    `Dashboard: ${input.dashboardUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export function buildPaymentAcceptedEmail(input: {
  displayName: string;
  questionsUrl: string;
}) {
  const firstName = input.displayName.trim().split(/\s+/)[0] || "there";
  const subject = "Payment received — continue your Unit311 setup";

  const html = emailShell(
    "Payment accepted",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        Hi ${escapeHtml(firstName)},
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        We have received your payment. You can now complete your onboarding questions to configure your workspace.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(input.questionsUrl)}" style="display:inline-block;background:#0b2d63;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
          Continue setup
        </a>
      </p>
    `,
  );

  const text = [
    `Hi ${firstName},`,
    "",
    "We have received your payment.",
    "Continue your onboarding here:",
    input.questionsUrl,
  ].join("\n");

  return { subject, html, text };
}

export function buildPaymentSubmittedAdminEmail(input: {
  companyName: string;
  contactName: string;
  email: string;
}) {
  const subject = `Payment submitted — ${input.companyName}`;

  const html = emailShell(
    "New payment submission",
    `
      <p style="margin:0 0 16px;font-size:15px;color:#334155;">
        A new bank transfer payment has been submitted and is awaiting verification.
      </p>
      <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;color:#334155;">
        <li><strong>Company:</strong> ${escapeHtml(input.companyName)}</li>
        <li><strong>Contact:</strong> ${escapeHtml(input.contactName)}</li>
        <li><strong>Email:</strong> ${escapeHtml(input.email)}</li>
      </ul>
      <p style="margin:0;font-size:14px;color:#64748b;">
        Review the transfer receipt in the client record and mark payment as received once confirmed.
      </p>
    `,
  );

  const text = [
    "New payment submission awaiting verification.",
    `Company: ${input.companyName}`,
    `Contact: ${input.contactName}`,
    `Email: ${input.email}`,
  ].join("\n");

  return { subject, html, text };
}
