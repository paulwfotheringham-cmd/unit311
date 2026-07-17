import {
  createBlankUserInput,
  mapInternalOperator,
  normalizeUserRole,
  type ManagedUser,
  type UserRegion,
  type UserRole,
  type UserStatus,
} from "@/lib/user-management-data";
import {
  ensureInternalOperatorsTable,
  withInternalOperatorsTable,
} from "@/lib/internal-db-migrations";
import {
  generatePlatformPassword,
  hashPlatformPasswordForUser,
  normalizePlatformUsername,
} from "@/lib/platform-auth";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type DbOperator = Parameters<typeof mapInternalOperator>[0];

function requireOperatorsSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

function buildOperatorPayload(input: Partial<ManagedUser>) {
  const payload: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.operatorLabel !== undefined) payload.operator_label = input.operatorLabel.trim();
  if (input.fullName !== undefined) payload.full_name = input.fullName.trim();
  if (input.username !== undefined) payload.username = input.username.trim().toLowerCase();
  if (input.email !== undefined) payload.email = input.email.trim() || null;
  if (input.phone !== undefined) payload.phone = input.phone.trim() || null;
  if (input.role !== undefined) payload.role = normalizeUserRole(input.role);
  if (input.status !== undefined) payload.status = input.status;
  if (input.region !== undefined) payload.region = input.region;
  if (input.licenseId !== undefined) payload.license_id = input.licenseId.trim() || null;
  if (input.notes !== undefined) payload.notes = input.notes.trim() || null;

  return payload;
}

export async function listInternalOperators(): Promise<ManagedUser[]> {
  await ensureInternalOperatorsTable();
  return withInternalOperatorsTable(async () => {
    const supabase = requireOperatorsSupabase();
    const { data, error } = await supabase
      .from("internal_operators")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) throw new Error(error.message);
    return (data as DbOperator[]).map(mapInternalOperator);
  });
}

export async function createInternalOperator(
  input: Partial<ManagedUser> & { fullName: string; username: string; password?: string },
): Promise<{ user: ManagedUser; temporaryPassword: string }> {
  await ensureInternalOperatorsTable();
  return withInternalOperatorsTable(async () => {
    const supabase = requireOperatorsSupabase();
    const blank = createBlankUserInput();
    const id = `user-${crypto.randomUUID().slice(0, 8)}`;
    const username = normalizePlatformUsername(
      input.username?.trim() || input.email?.trim() || "",
    );
    if (!username) {
      throw new Error("Email address is required for internal users.");
    }
    const password = input.password?.trim() || generatePlatformPassword();
    const passwordHash = hashPlatformPasswordForUser(username, password);

    const { data, error } = await supabase
      .from("internal_operators")
      .insert({
        id,
        operator_label: input.operatorLabel?.trim() || blank.operatorLabel,
        full_name: input.fullName.trim(),
        username,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        role: normalizeUserRole(input.role ?? blank.role),
        status: input.status ?? blank.status,
        region: input.region ?? blank.region,
        license_id: input.licenseId?.trim() || null,
        notes: input.notes?.trim() || null,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const { error: platformError } = await supabase.from("platform_users").upsert(
      {
        username,
        display_name: input.fullName.trim(),
        email: input.email?.trim().toLowerCase() || username,
        password_hash: passwordHash,
        user_type: "internal",
        redirect_path: "/internaldashboard",
        client_name: null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "username" },
    );

    if (platformError) throw new Error(platformError.message);

    return {
      user: mapInternalOperator(data as DbOperator),
      temporaryPassword: password,
    };
  });
}

export async function updateInternalOperator(
  id: string,
  patch: Partial<{
    operatorLabel: string;
    fullName: string;
    username: string;
    email: string;
    phone: string;
    role: UserRole;
    status: UserStatus;
    region: UserRegion;
    licenseId: string;
    notes: string;
  }>,
): Promise<ManagedUser> {
  return withInternalOperatorsTable(async () => {
    const supabase = requireOperatorsSupabase();

    const normalizedPatch = { ...patch };
    if (normalizedPatch.email?.trim()) {
      normalizedPatch.username = normalizedPatch.email.trim().toLowerCase();
    }

    const { data: existing, error: existingError } = await supabase
      .from("internal_operators")
      .select("username, full_name")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      throw new Error(existingError?.message ?? "User not found");
    }

    const payload = buildOperatorPayload(normalizedPatch);

    const { data, error } = await supabase
      .from("internal_operators")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    const nextUsername =
      typeof payload.username === "string" ? payload.username : existing.username;
    const nextDisplayName =
      typeof payload.full_name === "string" ? payload.full_name : existing.full_name;

    if (nextUsername !== existing.username || nextDisplayName !== existing.full_name) {
      const { error: platformError } = await supabase
        .from("platform_users")
        .update({
          username: nextUsername,
          display_name: nextDisplayName,
          updated_at: new Date().toISOString(),
        })
        .eq("username", existing.username)
        .eq("user_type", "internal");

      if (platformError) throw new Error(platformError.message);
    }

    return mapInternalOperator(data as DbOperator);
  });
}

export async function setInternalOperatorPassword(
  id: string,
  password?: string,
): Promise<{ password: string }> {
  return withInternalOperatorsTable(async () => {
    const supabase = requireOperatorsSupabase();
    const { data: operator, error: loadError } = await supabase
      .from("internal_operators")
      .select("username, full_name")
      .eq("id", id)
      .single();

    if (loadError || !operator) {
      throw new Error(loadError?.message ?? "User not found");
    }

    const newPassword = password?.trim() || generatePlatformPassword();
    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const username = normalizePlatformUsername(operator.username);
    const passwordHash = hashPlatformPasswordForUser(username, newPassword);

    const { error } = await supabase.from("platform_users").upsert(
      {
        username,
        display_name: operator.full_name,
        email: username.includes("@") ? username : null,
        password_hash: passwordHash,
        user_type: "internal",
        redirect_path: "/internaldashboard",
        client_name: null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "username" },
    );

    if (error) throw new Error(error.message);
    return { password: newPassword };
  });
}

export async function deleteInternalOperator(id: string) {
  return withInternalOperatorsTable(async () => {
    const supabase = requireOperatorsSupabase();
    const { error } = await supabase.from("internal_operators").delete().eq("id", id);
    if (error) throw new Error(error.message);
  });
}
