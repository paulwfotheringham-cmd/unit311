import {
  createBlankConnectionInput,
  geocodeConnection,
  mapCrmConnection,
  type CrmConnection,
} from "@/lib/connections-data";
import {
  localCreateConnection,
  localDeleteConnection,
  localListConnections,
  localUpdateConnection,
} from "@/lib/connections-local-store";
import { isMissingTableError } from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  resolveCrmWorkspaceId,
  type CrmWorkspaceScope,
} from "@/lib/crm-leads-service";

type DbConnection = Parameters<typeof mapCrmConnection>[0];

export type ConnectionsSource = "supabase" | "local";
export type ConnectionsWorkspaceScope = CrmWorkspaceScope;

function requireConnectionsSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

async function supabaseListConnections(workspaceId: string): Promise<CrmConnection[]> {
  const supabase = requireConnectionsSupabase();
  const { data, error } = await supabase
    .from("crm_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as DbConnection[]).map(mapCrmConnection);
}

async function supabaseCreateConnection(
  workspaceId: string,
  input: Partial<ReturnType<typeof createBlankConnectionInput>> & { name: string },
): Promise<CrmConnection> {
  const supabase = requireConnectionsSupabase();
  const city = input.city?.trim() || "Unknown";
  const country = input.country?.trim() || "Unknown";
  const [latitude, longitude] = geocodeConnection(city, country);

  const { data, error } = await supabase
    .from("crm_connections")
    .insert({
      workspace_id: workspaceId,
      name: input.name.trim(),
      role: input.role?.trim() || "Advisor",
      specialties: input.specialties?.trim() || null,
      background: input.background?.trim() || null,
      country_experience: input.countryExperience?.trim() || null,
      city,
      country,
      latitude: input.latitude ?? latitude,
      longitude: input.longitude ?? longitude,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCrmConnection(data as DbConnection);
}

async function supabaseUpdateConnection(
  workspaceId: string,
  id: string,
  patch: Partial<{
    name: string;
    role: string;
    specialties: string;
    background: string;
    countryExperience: string;
    city: string;
    country: string;
  }>,
): Promise<CrmConnection> {
  const supabase = requireConnectionsSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("crm_connections")
    .select("city, country")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Connection not found.");

  const payload: Record<string, string | number | null> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.role !== undefined) payload.role = patch.role.trim();
  if (patch.specialties !== undefined) payload.specialties = patch.specialties.trim() || null;
  if (patch.background !== undefined) payload.background = patch.background.trim() || null;
  if (patch.countryExperience !== undefined) {
    payload.country_experience = patch.countryExperience.trim() || null;
  }

  if (patch.city !== undefined || patch.country !== undefined) {
    const city = (patch.city ?? existing.city).trim();
    const country = (patch.country ?? existing.country).trim();
    const [latitude, longitude] = geocodeConnection(city, country);
    payload.city = city;
    payload.country = country;
    payload.latitude = latitude;
    payload.longitude = longitude;
  }

  const { data, error } = await supabase
    .from("crm_connections")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCrmConnection(data as DbConnection);
}

async function supabaseDeleteConnection(workspaceId: string, id: string) {
  const supabase = requireConnectionsSupabase();
  const { data: existing, error: fetchError } = await supabase
    .from("crm_connections")
    .select("id")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error("Connection not found.");

  const { error } = await supabase
    .from("crm_connections")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

function shouldUseLocalStore(error: unknown) {
  return isMissingTableError(error, "crm_connections");
}

async function withSupabaseOrLocal<T>(
  supabaseOp: () => Promise<T>,
  localOp: () => T,
): Promise<{ result: T; source: ConnectionsSource }> {
  if (!isSupabaseConfigured()) {
    return { result: localOp(), source: "local" };
  }

  try {
    const result = await supabaseOp();
    return { result, source: "supabase" };
  } catch (error) {
    if (shouldUseLocalStore(error)) {
      return { result: localOp(), source: "local" };
    }
    throw error;
  }
}

export async function listConnectionsWithSource(
  scope?: ConnectionsWorkspaceScope,
): Promise<{
  connections: CrmConnection[];
  source: ConnectionsSource;
}> {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  const { result, source } = await withSupabaseOrLocal(
    () => supabaseListConnections(workspaceId),
    localListConnections,
  );

  // Do not fall back to seeded Unit311 local connections when the workspace is empty.
  return { connections: result, source };
}

export async function listConnections(
  scope?: ConnectionsWorkspaceScope,
): Promise<CrmConnection[]> {
  const { connections } = await listConnectionsWithSource(scope);
  return connections;
}

export async function createConnectionWithSource(
  input: Partial<ReturnType<typeof createBlankConnectionInput>> & { name: string },
  scope?: ConnectionsWorkspaceScope,
): Promise<{ connection: CrmConnection; source: ConnectionsSource }> {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  const { result, source } = await withSupabaseOrLocal(
    () => supabaseCreateConnection(workspaceId, input),
    () => localCreateConnection(input),
  );
  return { connection: result, source };
}

export async function createConnection(
  input: Partial<ReturnType<typeof createBlankConnectionInput>> & { name: string },
  scope?: ConnectionsWorkspaceScope,
): Promise<CrmConnection> {
  const { connection } = await createConnectionWithSource(input, scope);
  return connection;
}

export async function updateConnectionWithSource(
  id: string,
  patch: Partial<{
    name: string;
    role: string;
    specialties: string;
    background: string;
    countryExperience: string;
    city: string;
    country: string;
  }>,
  scope?: ConnectionsWorkspaceScope,
): Promise<{ connection: CrmConnection; source: ConnectionsSource }> {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  const { result, source } = await withSupabaseOrLocal(
    () => supabaseUpdateConnection(workspaceId, id, patch),
    () => localUpdateConnection(id, patch),
  );
  return { connection: result, source };
}

export async function updateConnection(
  id: string,
  patch: Partial<{
    name: string;
    role: string;
    specialties: string;
    background: string;
    countryExperience: string;
    city: string;
    country: string;
  }>,
  scope?: ConnectionsWorkspaceScope,
): Promise<CrmConnection> {
  const { connection } = await updateConnectionWithSource(id, patch, scope);
  return connection;
}

export async function deleteConnectionWithSource(
  id: string,
  scope?: ConnectionsWorkspaceScope,
): Promise<{ source: ConnectionsSource }> {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  const { source } = await withSupabaseOrLocal(
    async () => {
      await supabaseDeleteConnection(workspaceId, id);
      return true;
    },
    () => {
      localDeleteConnection(id);
      return true;
    },
  );
  return { source };
}

export async function deleteConnection(id: string, scope?: ConnectionsWorkspaceScope) {
  await deleteConnectionWithSource(id, scope);
}
