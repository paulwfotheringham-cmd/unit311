import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { EmailAccountId } from "@/lib/email/types";

import { getAccountDefinition } from "@/lib/email/accounts";

type DbCredential = {
  account_id: string;
  email: string;
  password: string;
  updated_at: string;
};

type MemoryCredential = { email: string; password: string };

declare global {
  // eslint-disable-next-line no-var
  var __unit311EmailCredentials: Map<EmailAccountId, MemoryCredential> | undefined;
}

function memoryCredentialStore() {
  if (!globalThis.__unit311EmailCredentials) {
    globalThis.__unit311EmailCredentials = new Map();
  }
  return globalThis.__unit311EmailCredentials;
}

function readMemoryCredential(id: EmailAccountId): MemoryCredential | null {
  return memoryCredentialStore().get(id) ?? null;
}

function readEnvCredential(id: EmailAccountId): MemoryCredential | null {
  const account = getAccountDefinition(id);
  const password =
    id === "info"
      ? process.env.ZOHO_INFO_PASSWORD?.trim() ||
        process.env.ZOHO_DRONECATALYST_INFO_PASSWORD?.trim() ||
        process.env.ZOHO_DRONECATALYST_PASSWORD?.trim() ||
        process.env.ZOHO_PASSWORD?.trim() ||
        process.env.ZOHO_APP_PASSWORD?.trim()
      : process.env.ZOHO_PAUL_PASSWORD?.trim() ||
        process.env.ZOHO_DRONECATALYST_PAUL_PASSWORD?.trim() ||
        process.env.ZOHO_DRONECATALYST_PASSWORD?.trim() ||
        process.env.ZOHO_PASSWORD?.trim() ||
        process.env.ZOHO_APP_PASSWORD?.trim();

  if (!password) return null;
  return { email: account.email, password };
}

async function readSupabaseCredential(
  id: EmailAccountId,
): Promise<MemoryCredential | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("email_mailbox_credentials")
    .select("email, password")
    .eq("account_id", id)
    .maybeSingle();

  if (error || !data?.password) return null;

  const row = data as Pick<DbCredential, "email" | "password">;
  return {
    email: row.email.trim() || getAccountDefinition(id).email,
    password: row.password.trim(),
  };
}

export async function resolveAccountCredentials(
  id: EmailAccountId,
): Promise<MemoryCredential | null> {
  return (
    readEnvCredential(id) ??
    readMemoryCredential(id) ??
    (await readSupabaseCredential(id))
  );
}

export async function isAccountConfiguredAsync(id: EmailAccountId): Promise<boolean> {
  return Boolean(await resolveAccountCredentials(id));
}

export async function getMailboxCredentialStatus() {
  const [infoConfigured, paulConfigured] = await Promise.all([
    isAccountConfiguredAsync("info"),
    isAccountConfiguredAsync("paul"),
  ]);

  const storage = isSupabaseConfigured()
    ? ("supabase" as const)
    : memoryCredentialStore().size > 0
      ? ("memory" as const)
      : ("environment" as const);

  return {
    info: infoConfigured,
    paul: paulConfigured,
    storage,
  };
}

export async function saveMailboxCredentials(
  id: EmailAccountId,
  password: string,
  email?: string,
) {
  const trimmedPassword = password.trim();
  if (!trimmedPassword) {
    throw new Error("Password is required.");
  }

  const accountEmail = email?.trim() || getAccountDefinition(id).email;

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("email_mailbox_credentials")
      .upsert(
        {
          account_id: id,
          email: accountEmail,
          password: trimmedPassword,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id" },
      )
      .select("account_id, email, updated_at")
      .single();

    if (error) throw new Error(error.message);
    memoryCredentialStore().set(id, { email: accountEmail, password: trimmedPassword });
    return data as Pick<DbCredential, "account_id" | "email" | "updated_at">;
  }

  memoryCredentialStore().set(id, { email: accountEmail, password: trimmedPassword });
  return {
    account_id: id,
    email: accountEmail,
    updated_at: new Date().toISOString(),
  };
}
