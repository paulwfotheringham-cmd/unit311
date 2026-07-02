import type { EmailAccount, EmailAccountId } from "@/lib/email/types";

import { resolveAccountCredentials } from "@/lib/email/credentials-service";

export const ZOHO_IMAP_HOST = process.env.ZOHO_IMAP_HOST?.trim() || "imappro.zoho.eu";
export const ZOHO_IMAP_PORT = Number(process.env.ZOHO_IMAP_PORT ?? 993);
export const ZOHO_SMTP_HOST = process.env.ZOHO_SMTP_HOST?.trim() || "smtppro.zoho.eu";
export const ZOHO_SMTP_PORT = Number(process.env.ZOHO_SMTP_PORT ?? 465);

const ACCOUNT_DEFINITIONS: readonly EmailAccount[] = [
  {
    id: "info",
    email: "hello@unit311.com",
    name: "Unit311 Shared Inbox",
  },
  {
    id: "paul",
    email: "paul.fotheringham@unit311.com",
    name: "Unit311 Admin",
  },
  {
    id: "dc-info",
    email: "info@unit311.com",
    name: "Unit311 Inbox",
  },
  {
    id: "dc-paul",
    email: "paul@unit311.com",
    name: "Unit311 Paul",
  },
];

function defaultAccountEmail(id: EmailAccountId): string {
  return getAccountDefinition(id).email;
}

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

function resolveAccountEmailFromEnv(id: EmailAccountId): string | null {
  if (id === "info") {
    return (
      process.env.ZOHO_INFO_EMAIL?.trim() ||
      process.env.ZOHO_EMAIL?.trim() ||
      null
    );
  }

  if (id === "dc-info") {
    return (
      process.env.ZOHO_DC_INFO_EMAIL?.trim() ||
      process.env.ZOHO_DRONECATALYST_INFO_EMAIL?.trim() ||
      null
    );
  }

  if (id === "dc-paul") {
    return (
      process.env.ZOHO_DC_PAUL_EMAIL?.trim() ||
      process.env.ZOHO_DRONECATALYST_PAUL_EMAIL?.trim() ||
      null
    );
  }

  return (
    process.env.ZOHO_PAUL_EMAIL?.trim() ||
    process.env.ZOHO_EMAIL?.trim() ||
    null
  );
}

export async function getAccountCredentials(
  id: EmailAccountId,
): Promise<{ email: string; password: string }> {
  const credentials = await resolveAccountCredentials(id);
  if (!credentials) {
    throw new Error(
      id === "info"
        ? "Zoho Unit311 info mailbox is not configured. Set ZOHO_INFO_PASSWORD on the server or save credentials in the Email settings panel."
        : id === "dc-info"
          ? "Unit311 info mailbox is not configured. Set ZOHO_DC_INFO_PASSWORD on the server or save credentials in the Email settings panel."
          : id === "dc-paul"
            ? "Unit311 paul mailbox is not configured. Set ZOHO_DC_PAUL_PASSWORD on the server or save credentials in the Email settings panel."
            : "Zoho paul mailbox is not configured. Set ZOHO_PAUL_PASSWORD on the server or save credentials in the Email settings panel.",
    );
  }

  return credentials;
}

export async function isAccountConfigured(id: EmailAccountId): Promise<boolean> {
  try {
    await getAccountCredentials(id);
    return true;
  } catch {
    return false;
  }
}

export async function isAnyMailboxConfigured(): Promise<boolean> {
  const [info, paul, dcInfo, dcPaul] = await Promise.all([
    isAccountConfigured("info"),
    isAccountConfigured("paul"),
    isAccountConfigured("dc-info"),
    isAccountConfigured("dc-paul"),
  ]);
  return info || paul || dcInfo || dcPaul;
}

export function parseAccountId(value: string | null): EmailAccountId | null {
  if (
    value === "info" ||
    value === "paul" ||
    value === "dc-info" ||
    value === "dc-paul"
  ) {
    return value;
  }
  return null;
}

export function getMailboxLabel(accountId: EmailAccountId) {
  return getAccountDefinition(accountId).email;
}
