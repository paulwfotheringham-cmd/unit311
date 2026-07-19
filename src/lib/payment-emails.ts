import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { PAYMENT_AMOUNT, PAYMENT_BANK_DETAILS } from "@/lib/payment-data";
import { emailLogoHtml } from "@/lib/email-logo";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildInvoiceEmail(input: {
  companyName: string;
  contactName: string;
  paymentUrl: string;
}) {
  const firstName = input.contactName.trim().split(/\s+/)[0] || "there";
  const bank = PAYMENT_BANK_DETAILS;
  const subject = `Your Unit311 Central invoice — ${PAYMENT_AMOUNT}`;

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
                    <h1 style="margin:0 0 16px;font-size:22px;color:#0b2d63;">Your subscription invoice</h1>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hi ${escapeHtml(firstName)},</p>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
                      Please find your invoice for <strong>${escapeHtml(input.companyName)}</strong> attached.
                      The amount due is <strong>${PAYMENT_AMOUNT}</strong>, payable immediately by bank transfer.
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Account name:</strong> ${escapeHtml(bank.accountName)}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Bank:</strong> ${escapeHtml(bank.bankName)}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Routing:</strong> ${escapeHtml(bank.routingNumber)}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Account number:</strong> ${escapeHtml(bank.accountNumber)}</p>
                    <p style="margin:0 0 16px;font-size:14px;color:#334155;"><strong>Reference:</strong> ${escapeHtml(input.companyName)}</p>
                    <p style="margin:0 0 24px;">
                      <a href="${escapeHtml(input.paymentUrl)}" style="display:inline-block;background:#0b2d63;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
                        Open payment page
                      </a>
                    </p>
                    <p style="margin:0;font-size:12px;color:#94a3b8;">
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
    `Your invoice for ${input.companyName} is attached. Amount due: ${PAYMENT_AMOUNT}.`,
    `Payment reference: ${input.companyName}`,
    "",
    `Open payment page: ${input.paymentUrl}`,
  ].join("\n");

  return { subject, html, text };
}

/** Sent after payment activation when the workspace is ready for login. */
export function buildCustomerWelcomeEmail(input: {
  displayName: string;
  companyName: string;
  workspaceUrl: string;
  loginEmail: string;
  loginUrl: string;
}) {
  const firstName = input.displayName.trim().split(/\s+/)[0] || "there";
  const subject = "Welcome to Unit311 Central — your workspace is ready";

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
                    <h1 style="margin:0 0 16px;font-size:22px;color:#0b2d63;">Welcome to Unit311 Central</h1>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">Hi ${escapeHtml(firstName)},</p>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
                      Your payment has been received and your workspace for
                      <strong>${escapeHtml(input.companyName)}</strong> is now active.
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Workspace URL:</strong></p>
                    <p style="margin:0 0 16px;font-size:15px;color:#0b2d63;font-weight:600;word-break:break-all;">
                      ${escapeHtml(input.workspaceUrl)}
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Login email:</strong></p>
                    <p style="margin:0 0 16px;font-size:15px;color:#0b2d63;font-weight:600;word-break:break-all;">
                      ${escapeHtml(input.loginEmail)}
                    </p>
                    <p style="margin:0 0 16px;font-size:15px;color:#334155;">
                      Sign in using the password you created during signup.
                    </p>
                    <p style="margin:0 0 24px;">
                      <a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#0b2d63;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">
                        Sign in
                      </a>
                    </p>
                    <p style="margin:0;font-size:12px;color:#94a3b8;">
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
    `Your payment has been received and your workspace for ${input.companyName} is now active.`,
    "",
    `Workspace URL: ${input.workspaceUrl}`,
    `Login email: ${input.loginEmail}`,
    "",
    "Sign in using the password you created during signup.",
    `Sign in: ${input.loginUrl}`,
  ].join("\n");

  return { subject, html, text };
}

