import {
  createBlankExternalUserInput,
  mapExternalUser,
  type ExternalUser,
} from "@/lib/external-users-data";
import {
  ensurePlatformUsersLastLoginColumn,
  withPlatformUsersLastLoginColumn,
} from "@/lib/internal-db-migrations";
import { getInternalClient, listInternalClients } from "@/lib/internal-clients-service";
import {
  generatePlatformPassword,
  hashPlatformPasswordForUser,
  normalizePlatformUsername,
} from "@/lib/platform-auth";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

type DbPlatformUser = Parameters<typeof mapExternalUser>[0];

const PLATFORM_USER_COLUMNS =
  "id, username, display_name, user_type, redirect_path, client_name, client_id, is_active, last_login_at, created_at, updated_at";

function requirePlatformSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

async function companyNamesByClientId(clientIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(clientIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return new Map();

  const workspace = await requireCurrentWorkspace();
  const clients = await listInternalClients({ workspaceId: workspace.id });
  const map = new Map<string, string>();
  for (const client of clients) {
    if (unique.includes(client.id)) {
      map.set(client.id, client.companyName);
    }
  }
  return map;
}

async function resolveClientForWrite(clientId: string): Promise<{
  id: string;
  companyName: string;
}> {
  const trimmed = clientId.trim();
  if (!trimmed) {
    throw new Error("clientId is required.");
  }

  const workspace = await requireCurrentWorkspace();
  const client = await getInternalClient(trimmed, { workspaceId: workspace.id });
  if (!client) {
    throw new Error("Client not found in Client Directory.");
  }
  return { id: client.id, companyName: client.companyName };
}

export async function listExternalUsers(): Promise<ExternalUser[]> {
  await ensurePlatformUsersLastLoginColumn();
  return withPlatformUsersLastLoginColumn(async () => {
    const supabase = requirePlatformSupabase();
    const { data, error } = await supabase
      .from("platform_users")
      .select(PLATFORM_USER_COLUMNS)
      .eq("user_type", "external")
      .order("display_name", { ascending: true });

    if (error) {
      if (error.message.includes("client_id")) {
        throw new Error(
          "External Users schema is missing client_id. Apply migration 095_platform_users_client_id.sql.",
        );
      }
      throw new Error(error.message);
    }

    const rows = (data as DbPlatformUser[]) ?? [];
    const names = await companyNamesByClientId(
      rows.map((row) => row.client_id ?? "").filter(Boolean),
    );

    return rows.map((row) =>
      mapExternalUser(row, row.client_id ? names.get(row.client_id) ?? null : null),
    );
  });
}

export async function createExternalUser(input: {
  name: string;
  clientId: string;
  username: string;
  redirectPath?: string;
  password?: string;
}): Promise<{ user: ExternalUser; temporaryPassword: string }> {
  const client = await resolveClientForWrite(input.clientId);

  await ensurePlatformUsersLastLoginColumn();
  return withPlatformUsersLastLoginColumn(async () => {
    const supabase = requirePlatformSupabase();
    const blank = createBlankExternalUserInput();
    const username = normalizePlatformUsername(input.username);
    const password = input.password?.trim() || generatePlatformPassword();
    const passwordHash = hashPlatformPasswordForUser(username, password);

    const { data, error } = await supabase
      .from("platform_users")
      .insert({
        username,
        display_name: input.name.trim() || "New Client User",
        password_hash: passwordHash,
        user_type: "external",
        redirect_path: input.redirectPath?.trim() || blank.redirectPath,
        client_id: client.id,
        client_name: client.companyName,
        is_active: true,
      })
      .select(PLATFORM_USER_COLUMNS)
      .single();

    if (error) {
      if (error.message.includes("client_id")) {
        throw new Error(
          "External Users schema is missing client_id. Apply migration 095_platform_users_client_id.sql.",
        );
      }
      throw new Error(error.message);
    }
    return {
      user: mapExternalUser(data as DbPlatformUser, client.companyName),
      temporaryPassword: password,
    };
  });
}

export async function updateExternalUser(
  id: string,
  patch: Partial<{
    name: string;
    clientId: string | null;
    username: string;
    redirectPath: string;
    isActive: boolean;
  }>,
): Promise<ExternalUser> {
  await ensurePlatformUsersLastLoginColumn();
  return withPlatformUsersLastLoginColumn(async () => {
    const supabase = requirePlatformSupabase();
    const payload: Record<string, string | boolean | null> = {
      updated_at: new Date().toISOString(),
    };

    if (patch.name !== undefined) payload.display_name = patch.name.trim();
    if (patch.username !== undefined) {
      payload.username = normalizePlatformUsername(patch.username);
    }
    if (patch.redirectPath !== undefined) payload.redirect_path = patch.redirectPath.trim();
    if (patch.isActive !== undefined) payload.is_active = patch.isActive;

    let companyName: string | null = null;
    if (patch.clientId !== undefined) {
      if (!patch.clientId?.trim()) {
        throw new Error("clientId is required. Unlinking is not supported for new writes.");
      }
      const client = await resolveClientForWrite(patch.clientId);
      payload.client_id = client.id;
      payload.client_name = client.companyName;
      companyName = client.companyName;
    }

    const { data, error } = await supabase
      .from("platform_users")
      .update(payload)
      .eq("id", id)
      .eq("user_type", "external")
      .select(PLATFORM_USER_COLUMNS)
      .single();

    if (error) {
      if (error.message.includes("client_id")) {
        throw new Error(
          "External Users schema is missing client_id. Apply migration 095_platform_users_client_id.sql.",
        );
      }
      throw new Error(error.message);
    }

    const row = data as DbPlatformUser;
    if (!companyName && row.client_id) {
      const names = await companyNamesByClientId([row.client_id]);
      companyName = names.get(row.client_id) ?? null;
    }

    return mapExternalUser(row, companyName);
  });
}

export async function resetExternalUserPassword(id: string): Promise<{ temporaryPassword: string }> {
  const supabase = requirePlatformSupabase();
  const { data: existing, error: loadError } = await supabase
    .from("platform_users")
    .select("username")
    .eq("id", id)
    .eq("user_type", "external")
    .single();

  if (loadError || !existing) throw new Error(loadError?.message ?? "User not found");

  const password = generatePlatformPassword();
  const passwordHash = hashPlatformPasswordForUser(existing.username, password);

  const { error } = await supabase
    .from("platform_users")
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_type", "external");

  if (error) throw new Error(error.message);
  return { temporaryPassword: password };
}

export async function deleteExternalUser(id: string) {
  const supabase = requirePlatformSupabase();
  const { error } = await supabase
    .from("platform_users")
    .delete()
    .eq("id", id)
    .eq("user_type", "external");

  if (error) throw new Error(error.message);
}

export async function recordPlatformUserLogin(userId: string) {
  const supabase = requirePlatformSupabase();
  const { error } = await supabase
    .from("platform_users")
    .update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error && !error.message.includes("last_login_at")) {
    throw new Error(error.message);
  }
}
