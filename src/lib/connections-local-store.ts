import {
  createBlankConnectionInput,
  geocodeConnection,
  type CrmConnection,
} from "@/lib/connections-data";
import { createInitialConnections } from "@/lib/connections-seed-data";

let connections = createInitialConnections();

function nowIso() {
  return new Date().toISOString();
}

export function localListConnections(): CrmConnection[] {
  return [...connections].sort((a, b) => a.name.localeCompare(b.name));
}

export function localCreateConnection(
  input: Partial<ReturnType<typeof createBlankConnectionInput>> & { name: string },
): CrmConnection {
  const blank = createBlankConnectionInput();
  const city = input.city?.trim() || blank.city;
  const country = input.country?.trim() || blank.country;
  const [latitude, longitude] = geocodeConnection(city, country);
  const now = nowIso();

  const connection: CrmConnection = {
    id: `conn-local-${Date.now()}`,
    name: input.name.trim(),
    role: input.role?.trim() || blank.role,
    specialties: input.specialties?.trim() || "",
    background: input.background?.trim() || "",
    countryExperience: input.countryExperience?.trim() || "",
    city,
    country,
    latitude: input.latitude ?? latitude,
    longitude: input.longitude ?? longitude,
    createdAt: now,
    updatedAt: now,
  };

  connections = [...connections, connection].sort((a, b) => a.name.localeCompare(b.name));
  return connection;
}

export function localUpdateConnection(
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
): CrmConnection {
  const existing = connections.find((entry) => entry.id === id);
  if (!existing) throw new Error("Connection not found.");

  const next: CrmConnection = {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.role !== undefined ? { role: patch.role.trim() } : {}),
    ...(patch.specialties !== undefined ? { specialties: patch.specialties.trim() } : {}),
    ...(patch.background !== undefined ? { background: patch.background.trim() } : {}),
    ...(patch.countryExperience !== undefined
      ? { countryExperience: patch.countryExperience.trim() }
      : {}),
    updatedAt: nowIso(),
  };

  if (patch.city !== undefined || patch.country !== undefined) {
    const city = (patch.city ?? existing.city).trim();
    const country = (patch.country ?? existing.country).trim();
    const [latitude, longitude] = geocodeConnection(city, country);
    next.city = city;
    next.country = country;
    next.latitude = latitude;
    next.longitude = longitude;
  }

  connections = connections
    .map((entry) => (entry.id === id ? next : entry))
    .sort((a, b) => a.name.localeCompare(b.name));
  return next;
}

export function localDeleteConnection(id: string) {
  const before = connections.length;
  connections = connections.filter((entry) => entry.id !== id);
  if (connections.length === before) throw new Error("Connection not found.");
}

export function localResetConnections() {
  connections = createInitialConnections();
}
