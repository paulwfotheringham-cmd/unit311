import type { EmailAccount, EmailAccountId } from "@/lib/email/types";
import type { EmailWorkspaceScope } from "@/lib/email-workspace";

import { resolveAccountCredentials } from "@/lib/email/credentials-service";

export const ZOHO_IMAP_HOST = process.env.ZOHO_IMAP_HOST?.trim() || "imap.zoho.eu";
export const ZOHO_IMAP_PORT = Number(process.env.ZOHO_IMAP_PORT ?? 993);
export const ZOHO_SMTP_HOST = process.env.ZOHO_SMTP_HOST?.trim() || "smtp.zoho.eu";
export const ZOHO_SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT ?? 465);

const ACCOUNT_DEFINITIONS: readonly EmailAccount[] = [
  {
    id: "info",
    email: "info@unit311central.com",
    name: "Shared Inbox",
  },
  {
    id: "paul",
    email: "paul@unit311central.com",
    name: "Paul",
  },
];

export function getPublicEmailAccounts(): EmailAccount[] {
  return ACCOUNT_DEFINITIONS.map((account) => ({
    ...account,
    email: resolveAccountEmailFromEnv(account.id) ?? account.email,
  }));
}

export function getAccountDefinition(id: EmailAccountId): EmailAccount {
  const account = ACCOUNT_DEFINITIONS.find((entry) => entry.id === id);
  if (!account) throw new Error(`Unknown mailbox: ${id}`);
  return {
    ...account,
    email: resolveAccountEmailFromEnv(id) ?? account.email,
  };
}

function isPlainEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function resolveAccountEmailFromEnv(id: EmailAccountId): string | null {
  const candidates =
    id === "info"
      ? [process.env.ZOHO_INFO_EMAIL, process.env.ZOHO_EMAIL]
      : [process.env.ZOHO_PAUL_EMAIL, process.env.ZOHO_EMAIL];

  for (const raw of candidates) {
    const value = raw?.trim();
    if (value && isPlainEmail(value)) return value;
  }

  return null;
}

export async function getAccountCredentials(
  id: EmailAccountId,
  scope?: EmailWorkspaceScope,
): Promise<{ email: string; password: string }> {
  const credentials = await resolveAccountCredentials(id, scope);
  if (!credentials) {
    throw new Error(
      id === "info"
        ? "Zoho info mailbox is not configured. Set ZOHO_INFO_PASSWORD on the server or save credentials in the Email settings panel."
        : "Zoho paul mailbox is not configured. Set ZOHO_PAUL_PASSWORD on the server or save credentials in the Email settings panel.",
    );
  }

  return credentials;
}

export async function isAccountConfigured(
  id: EmailAccountId,
  scope?: EmailWorkspaceScope,
): Promise<boolean> {
  try {
    await getAccountCredentials(id, scope);
    return true;
  } catch {
    return false;
  }
}

export async function isAnyMailboxConfigured(scope?: EmailWorkspaceScope): Promise<boolean> {
  const [info, paul] = await Promise.all([
    isAccountConfigured("info", scope),
    isAccountConfigured("paul", scope),
  ]);
  return info || paul;
}

export function parseAccountId(value: string | null): EmailAccountId | null {
  if (value === "info" || value === "paul") return value;
  return null;
}

export function getMailboxLabel(accountId: EmailAccountId) {
  return getAccountDefinition(accountId).email;
}
