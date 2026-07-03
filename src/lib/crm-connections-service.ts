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
import {
  isMissingTableError,
  withCrmConnectionsTable,
} from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type DbConnection = Parameters<typeof mapCrmConnection>[0];

export type ConnectionsSource = "supabase" | "local";

function requireConnectionsSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

async function supabaseListConnections(): Promise<CrmConnection[]> {
  const supabase = requireConnectionsSupabase();
  const { data, error } = await supabase
    .from("crm_connections")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as DbConnection[]).map(mapCrmConnection);
}

async function supabaseCreateConnection(
  input: Partial<ReturnType<typeof createBlankConnectionInput>> & { name: string },
): Promise<CrmConnection> {
  const supabase = requireConnectionsSupabase();
  const city = input.city?.trim() || "Unknown";
  const country = input.country?.trim() || "Unknown";
  const [latitude, longitude] = geocodeConnection(city, country);

  const { data, error } = await supabase
    .from("crm_connections")
    .insert({
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
    const { data: existing, error: fetchError } = await supabase
      .from("crm_connections")
      .select("city, country")
      .eq("id", id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

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
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapCrmConnection(data as DbConnection);
}

async function supabaseDeleteConnection(id: string) {
  const supabase = requireConnectionsSupabase();
  const { error } = await supabase.from("crm_connections").delete().eq("id", id);
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
    const result = await withCrmConnectionsTable(supabaseOp);
    return { result, source: "supabase" };
  } catch (error) {
    if (shouldUseLocalStore(error)) {
      return { result: localOp(), source: "local" };
    }
    throw error;
  }
}

export async function listConnectionsWithSource(): Promise<{
  connections: CrmConnection[];
  source: ConnectionsSource;
}> {
  const { result, source } = await withSupabaseOrLocal(
    supabaseListConnections,
    localListConnections,
  );

  if (source === "supabase" && result.length === 0) {
    return { connections: localListConnections(), source: "local" };
  }

  return { connections: result, source };
}

export async function listConnections(): Promise<CrmConnection[]> {
  const { connections } = await listConnectionsWithSource();
  return connections;
}

export async function createConnectionWithSource(
  input: Partial<ReturnType<typeof createBlankConnectionInput>> & { name: string },
): Promise<{ connection: CrmConnection; source: ConnectionsSource }> {
  const { result, source } = await withSupabaseOrLocal(
    () => supabaseCreateConnection(input),
    () => localCreateConnection(input),
  );
  return { connection: result, source };
}

export async function createConnection(
  input: Partial<ReturnType<typeof createBlankConnectionInput>> & { name: string },
): Promise<CrmConnection> {
  const { connection } = await createConnectionWithSource(input);
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
): Promise<{ connection: CrmConnection; source: ConnectionsSource }> {
  const { result, source } = await withSupabaseOrLocal(
    () => supabaseUpdateConnection(id, patch),
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
): Promise<CrmConnection> {
  const { connection } = await updateConnectionWithSource(id, patch);
  return connection;
}

export async function deleteConnectionWithSource(
  id: string,
): Promise<{ source: ConnectionsSource }> {
  const { source } = await withSupabaseOrLocal(
    async () => {
      await supabaseDeleteConnection(id);
      return true;
    },
    () => {
      localDeleteConnection(id);
      return true;
    },
  );
  return { source };
}

export async function deleteConnection(id: string) {
  await deleteConnectionWithSource(id);
}
