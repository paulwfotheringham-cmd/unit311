"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";

import {
  createBlankConnectionInput,
  CRM_CONNECTION_ROLE_OPTIONS,
  geocodeConnection,
  type CrmConnection,
} from "@/lib/connections-data";
import { createInitialConnections } from "@/lib/connections-seed-data";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Plus, Save, Trash2, Users } from "lucide-react";

const ConnectionsMap = dynamic(() => import("./ConnectionsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(52vh,480px)] items-center justify-center rounded-xl border border-white/10 bg-[#0b1524] text-sm text-white/45">
      Loading map…
    </div>
  ),
});

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function inputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
}

function connectionFieldsEqual(a: CrmConnection, b: CrmConnection) {
  return (
    a.name === b.name &&
    a.role === b.role &&
    a.specialties === b.specialties &&
    a.background === b.background &&
    a.countryExperience === b.countryExperience &&
    a.city === b.city &&
    a.country === b.country
  );
}

function draftToMapConnection(draft: Omit<CrmConnection, "id" | "createdAt" | "updatedAt">): CrmConnection {
  const [latitude, longitude] = geocodeConnection(draft.city, draft.country);
  return {
    ...draft,
    id: "__draft__",
    latitude,
    longitude,
    createdAt: "",
    updatedAt: "",
  };
}

function connectionLocationLabel(connection: CrmConnection) {
  return `${connection.city}, ${connection.country}`;
}

function connectionSpecialtyTags(specialties: string) {
  return specialties
    .split(/[,;|/]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function collectSpecialtyOptions(items: CrmConnection[]) {
  const tags = new Set<string>();
  for (const connection of items) {
    for (const tag of connectionSpecialtyTags(connection.specialties)) {
      tags.add(tag);
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
}

function collectLocationOptions(items: CrmConnection[]) {
  return [...new Set(items.map((connection) => connectionLocationLabel(connection)))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function connectionMatchesSpecialty(connection: CrmConnection, specialty: string) {
  if (specialty === "all") return true;
  const normalized = specialty.toLowerCase();
  return connectionSpecialtyTags(connection.specialties).some(
    (tag) => tag.toLowerCase() === normalized,
  );
}

function connectionMatchesLocation(connection: CrmConnection, location: string) {
  if (location === "all") return true;
  return connectionLocationLabel(connection) === location;
}

type ConnectionsWorkspaceProps = {
  onBackToCrm?: () => void;
};

export default function ConnectionsWorkspace({ onBackToCrm }: ConnectionsWorkspaceProps) {
  const [connections, setConnections] = useState<CrmConnection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState<CrmConnection | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<CrmConnection | null>(null);
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const snapshottedIdRef = useRef<string | null>(null);

  const selected = useMemo(() => {
    if (selectedId === "__draft__" && newDraft) return newDraft;
    return connections.find((entry) => entry.id === selectedId) ?? null;
  }, [connections, selectedId, newDraft]);

  const isDirty = useMemo(() => {
    if (!selected) return false;
    if (selected.id === "__draft__") return true;
    if (!savedSnapshot || savedSnapshot.id !== selected.id) return true;
    return !connectionFieldsEqual(selected, savedSnapshot);
  }, [selected, savedSnapshot]);

  const mapConnections = useMemo(() => {
    const filtered = connections.filter(
      (connection) =>
        connectionMatchesSpecialty(connection, filterSpecialty) &&
        connectionMatchesLocation(connection, filterLocation),
    );

    if (newDraft && selectedId === "__draft__") {
      return [...filtered, draftToMapConnection(newDraft)];
    }

    return filtered;
  }, [connections, filterLocation, filterSpecialty, newDraft, selectedId]);

  const specialtyOptions = useMemo(() => collectSpecialtyOptions(connections), [connections]);
  const locationOptions = useMemo(() => collectLocationOptions(connections), [connections]);

  const filteredConnections = useMemo(
    () =>
      connections.filter(
        (connection) =>
          connectionMatchesSpecialty(connection, filterSpecialty) &&
          connectionMatchesLocation(connection, filterLocation),
      ),
    [connections, filterSpecialty, filterLocation],
  );

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/crm/connections", { cache: "no-store" });
      const data = await readApiJson<{
        connections?: CrmConnection[];
        error?: string;
        source?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load connections");
      }

      const resolved = data.connections ?? createInitialConnections();
      setConnections(resolved);
      setUseLocalFallback(data.source === "local");
      setError(null);
      setSelectedId((current) => {
        if (current === "__draft__") return current;
        if (current && resolved.some((entry) => entry.id === current)) return current;
        return resolved[0]?.id ?? null;
      });
    } catch (loadError) {
      const fallback = createInitialConnections();
      setConnections(fallback);
      setUseLocalFallback(true);
      setSelectedId(fallback[0]?.id ?? null);
      setError(null);
      console.error(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadConnections();
    });
  }, [loadConnections]);

  useEffect(() => {
    if (selectedId === "__draft__") return;
    if (selectedId && filteredConnections.some((connection) => connection.id === selectedId)) {
      return;
    }
    startTransition(() => {
      setSelectedId(filteredConnections[0]?.id ?? null);
    });
  }, [filteredConnections, selectedId]);

  useEffect(() => {
    startTransition(() => {
      if (!selectedId || selectedId === "__draft__") {
        snapshottedIdRef.current = null;
        setSavedSnapshot(null);
        return;
      }
      if (snapshottedIdRef.current === selectedId) return;
      const entry = connections.find((item) => item.id === selectedId);
      if (entry) {
        snapshottedIdRef.current = selectedId;
        setSavedSnapshot({ ...entry });
      }
    });
  }, [selectedId, connections]);

  function saveConnectionLocally(connection: CrmConnection, isNew: boolean) {
    const now = new Date().toISOString();

    if (isNew) {
      if (!connection.name.trim()) {
        throw new Error("Name is required before saving");
      }

      const saved: CrmConnection = {
        ...connection,
        id: `conn-local-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };

      setConnections((current) =>
        [...current, saved].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewDraft(null);
      setSelectedId(saved.id);
      snapshottedIdRef.current = saved.id;
      setSavedSnapshot(saved);
      setSaveMessage("Contact saved locally");
      return;
    }

    const saved: CrmConnection = { ...connection, updatedAt: now };
    setConnections((current) =>
      current.map((entry) => (entry.id === saved.id ? saved : entry)),
    );
    snapshottedIdRef.current = saved.id;
    setSavedSnapshot(saved);
    setSaveMessage("Changes saved locally");
  }

  async function saveConnection(connection: CrmConnection, isNew: boolean) {
    setBusy(true);
    setError(null);

    try {
      if (useLocalFallback) {
        saveConnectionLocally(connection, isNew);
        return;
      }

      if (isNew) {
        if (!connection.name.trim()) {
          throw new Error("Name is required before saving");
        }

        const response = await fetch("/api/crm/connections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: connection.name,
            role: connection.role,
            specialties: connection.specialties,
            background: connection.background,
            countryExperience: connection.countryExperience,
            city: connection.city,
            country: connection.country,
          }),
        });

        const data = await readApiJson<{
          connection?: CrmConnection;
          error?: string;
          source?: string;
        }>(response);
        if (!response.ok || !data.connection) throw new Error(data.error ?? "Failed to save contact");
        if (data.source === "local") setUseLocalFallback(true);

        setConnections((current) =>
          [...current, data.connection!].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setNewDraft(null);
        setSelectedId(data.connection.id);
        snapshottedIdRef.current = data.connection.id;
        setSavedSnapshot(data.connection);
        setSaveMessage("Contact saved to map");
        return;
      }

      const response = await fetch(`/api/crm/connections/${connection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: connection.name,
          role: connection.role,
          specialties: connection.specialties,
          background: connection.background,
          countryExperience: connection.countryExperience,
          city: connection.city,
          country: connection.country,
        }),
      });

      const data = await readApiJson<{
        connection?: CrmConnection;
        error?: string;
        source?: string;
      }>(response);
      if (!response.ok || !data.connection) throw new Error(data.error ?? "Failed to save");
      if (data.source === "local") setUseLocalFallback(true);

      setConnections((current) =>
        current.map((entry) => (entry.id === data.connection!.id ? data.connection! : entry)),
      );
      snapshottedIdRef.current = data.connection.id;
      setSavedSnapshot(data.connection);
      setSaveMessage("Changes saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  function patchSelected(patch: Partial<CrmConnection>) {
    if (!selected) return;

    if (selected.id === "__draft__" && newDraft) {
      const next = { ...newDraft, ...patch };
      const [latitude, longitude] =
        patch.city !== undefined || patch.country !== undefined
          ? geocodeConnection(next.city, next.country)
          : [next.latitude, next.longitude];
      setNewDraft({ ...next, latitude, longitude });
      return;
    }

    const next = { ...selected, ...patch };
    if (patch.city !== undefined || patch.country !== undefined) {
      const [latitude, longitude] = geocodeConnection(next.city, next.country);
      next.latitude = latitude;
      next.longitude = longitude;
    }
    setConnections((current) => current.map((entry) => (entry.id === next.id ? next : entry)));
  }

  function handleAddContact() {
    setError(null);
    setSaveMessage(null);
    const blank = createBlankConnectionInput();
    const [latitude, longitude] = geocodeConnection(blank.city, blank.country);
    setNewDraft({
      ...blank,
      id: "__draft__",
      latitude,
      longitude,
      createdAt: "",
      updatedAt: "",
    });
    setSelectedId("__draft__");
  }

  async function handleSaveContact() {
    if (!selected) return;
    setError(null);
    setSaveMessage(null);
    await saveConnection(selected, selected.id === "__draft__");
  }

  async function handleDeleteContact() {
    if (!selected) return;

    if (selected.id === "__draft__") {
      setNewDraft(null);
      setSelectedId(connections[0]?.id ?? null);
      setSaveMessage(null);
      return;
    }

    if (!window.confirm(`Remove "${selected.name}" from connections?`)) return;

    setBusy(true);
    setError(null);

    try {
      if (useLocalFallback) {
        const remaining = connections.filter((entry) => entry.id !== selected.id);
        setConnections(remaining);
        snapshottedIdRef.current = remaining[0]?.id ?? null;
        setSelectedId(remaining[0]?.id ?? null);
        setSavedSnapshot(remaining[0] ? { ...remaining[0] } : null);
        return;
      }

      const response = await fetch(`/api/crm/connections/${selected.id}`, { method: "DELETE" });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to delete contact");

      const remaining = connections.filter((entry) => entry.id !== selected.id);
      setConnections(remaining);
      snapshottedIdRef.current = remaining[0]?.id ?? null;
      setSelectedId(remaining[0]?.id ?? null);
      setSavedSnapshot(remaining[0] ? { ...remaining[0] } : null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete contact");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {onBackToCrm && (
              <button
                type="button"
                onClick={onBackToCrm}
                className="mt-0.5 inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs text-white/60 transition-colors hover:border-white/20 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to CRM
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-400" />
                <h3 className="text-sm font-semibold text-white">Connections</h3>
              </div>
              <p className="mt-1 text-xs text-white/45">
                {connections.length} contacts on the global map · hover or click a marker for details
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleAddContact}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            New contact
          </button>
        </div>
      </section>

      {useLocalFallback && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200/90">
          Using built-in connection directory (Supabase CRM table not provisioned yet).
        </div>
      )}

      {saveMessage && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {saveMessage}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading connections map…
        </div>
      ) : (
        <>
          <ConnectionsMap
            connections={mapConnections}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {connections.length > 0 && (
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
              <div>
                <FieldLabel>Specialty</FieldLabel>
                <select
                  className={inputClassName()}
                  value={filterSpecialty}
                  onChange={(event) => setFilterSpecialty(event.target.value)}
                >
                  <option value="all">All specialties</option>
                  {specialtyOptions.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Location</FieldLabel>
                <select
                  className={inputClassName()}
                  value={filterLocation}
                  onChange={(event) => setFilterLocation(event.target.value)}
                >
                  <option value="all">All locations</option>
                  {locationOptions.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Contact</FieldLabel>
                <select
                  className={inputClassName()}
                  value={selectedId && selectedId !== "__draft__" ? selectedId : ""}
                  onChange={(event) => setSelectedId(event.target.value || null)}
                >
                  <option value="">
                    {filteredConnections.length === 0
                      ? "No contacts match filters"
                      : "Select a contact"}
                  </option>
                  {filteredConnections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.name} · {connection.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {selected ? (
            <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                    {selected.id === "__draft__" ? "New contact" : "Contact record"}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    {selected.name || "Untitled contact"}
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    {selected.city}, {selected.country}
                    {selected.id === "__draft__" && (
                      <span className="ml-2 text-amber-300/90">· unsaved</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || !isDirty}
                    onClick={() => void handleSaveContact()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </button>
                  {selected.id !== "__draft__" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDeleteContact()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-400/20 px-3 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                  {selected.id === "__draft__" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDeleteContact()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs text-white/55 hover:bg-white/[0.04] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel>Name</FieldLabel>
                  <input
                    className={inputClassName()}
                    value={selected.name}
                    onChange={(event) => patchSelected({ name: event.target.value })}
                    disabled={busy}
                  />
                </div>
                <div>
                  <FieldLabel>Role</FieldLabel>
                  <select
                    className={inputClassName()}
                    value={selected.role}
                    onChange={(event) => patchSelected({ role: event.target.value })}
                    disabled={busy}
                  >
                    {CRM_CONNECTION_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                    {!CRM_CONNECTION_ROLE_OPTIONS.includes(
                      selected.role as (typeof CRM_CONNECTION_ROLE_OPTIONS)[number],
                    ) && (
                      <option value={selected.role}>{selected.role}</option>
                    )}
                  </select>
                </div>
                <div>
                  <FieldLabel>City</FieldLabel>
                  <input
                    className={inputClassName()}
                    value={selected.city}
                    onChange={(event) => patchSelected({ city: event.target.value })}
                    disabled={busy}
                  />
                </div>
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <input
                    className={inputClassName()}
                    value={selected.country}
                    onChange={(event) => patchSelected({ country: event.target.value })}
                    disabled={busy}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Specialties</FieldLabel>
                  <input
                    className={inputClassName()}
                    value={selected.specialties}
                    onChange={(event) => patchSelected({ specialties: event.target.value })}
                    disabled={busy}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Background</FieldLabel>
                  <textarea
                    rows={3}
                    className={cn(inputClassName(), "resize-y")}
                    value={selected.background}
                    onChange={(event) => patchSelected({ background: event.target.value })}
                    disabled={busy}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Country experience</FieldLabel>
                  <input
                    className={inputClassName()}
                    value={selected.countryExperience}
                    onChange={(event) => patchSelected({ countryExperience: event.target.value })}
                    disabled={busy}
                  />
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
              Add a contact or select a marker on the map to edit their details.
            </section>
          )}
        </>
      )}
    </div>
  );
}
