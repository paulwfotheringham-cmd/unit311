import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { EmailAccountId } from "@/lib/email/types";
import { resolveEmailWorkspaceId, type EmailWorkspaceScope } from "@/lib/email-workspace";

import { getAccountDefinition } from "@/lib/email/accounts";

type DbCredential = {
  account_id: string;
  email: string;
  password: string;
  updated_at: string;
};

type MemoryCredential = { email: string; password: string };

declare global {
  // Ambient `var` is required for globalThis augmentation.
  var __unit311EmailCredentials: Map<string, MemoryCredential> | undefined;
}

function memoryCredentialStore() {
  if (!globalThis.__unit311EmailCredentials) {
    globalThis.__unit311EmailCredentials = new Map();
  }
  return globalThis.__unit311EmailCredentials;
}

function memoryKey(workspaceId: string, id: EmailAccountId) {
  return `${workspaceId}:${id}`;
}

function readMemoryCredential(workspaceId: string, id: EmailAccountId): MemoryCredential | null {
  return memoryCredentialStore().get(memoryKey(workspaceId, id)) ?? null;
}

/** Env credentials are shared platform secrets (not tenant DB rows). */
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
  workspaceId: string,
): Promise<MemoryCredential | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("email_mailbox_credentials")
    .select("email, password")
    .eq("workspace_id", workspaceId)
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
  scope?: EmailWorkspaceScope,
): Promise<MemoryCredential | null> {
  const workspaceId = await resolveEmailWorkspaceId(scope);
  return (
    readEnvCredential(id) ??
    readMemoryCredential(workspaceId, id) ??
    (await readSupabaseCredential(id, workspaceId))
  );
}

export async function isAccountConfiguredAsync(
  id: EmailAccountId,
  scope?: EmailWorkspaceScope,
): Promise<boolean> {
  return Boolean(await resolveAccountCredentials(id, scope));
}

export async function getMailboxCredentialStatus(scope?: EmailWorkspaceScope) {
  const workspaceId = await resolveEmailWorkspaceId(scope);
  const [infoConfigured, paulConfigured] = await Promise.all([
    isAccountConfiguredAsync("info", { workspaceId }),
    isAccountConfiguredAsync("paul", { workspaceId }),
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
  scope?: EmailWorkspaceScope,
) {
  const trimmedPassword = password.trim();
  if (!trimmedPassword) {
    throw new Error("Password is required.");
  }

  const workspaceId = await resolveEmailWorkspaceId(scope);
  const accountEmail = email?.trim() || getAccountDefinition(id).email;

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("email_mailbox_credentials")
      .upsert(
        {
          workspace_id: workspaceId,
          account_id: id,
          email: accountEmail,
          password: trimmedPassword,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,account_id" },
      )
      .select("account_id, email, updated_at")
      .single();

    if (error) throw new Error(error.message);
    memoryCredentialStore().set(memoryKey(workspaceId, id), {
      email: accountEmail,
      password: trimmedPassword,
    });
    return data as Pick<DbCredential, "account_id" | "email" | "updated_at">;
  }

  memoryCredentialStore().set(memoryKey(workspaceId, id), {
    email: accountEmail,
    password: trimmedPassword,
  });
  return {
    account_id: id,
    email: accountEmail,
    updated_at: new Date().toISOString(),
  };
}
