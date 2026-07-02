"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CLIENT_CONTRACT_OPTIONS,
  CLIENT_INDUSTRY_OPTIONS,
  CLIENT_REGION_OPTIONS,
  CLIENT_STATUS_OPTIONS,
  clientFieldsEqual,
  clientStatusClass,
  type ManagedClient,
} from "@/lib/client-management-data";
import { useInternalOperationsBasePath } from "./InternalOperationsBasePathContext";
import { cn } from "@/lib/utils";
import { ExternalLink, FolderOpen, FolderPlus, Loader2, Plus, Save, Search, Trash2 } from "lucide-react";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

type ClientManagementWorkspaceProps = {
  onClientsChange?: (clients: ManagedClient[]) => void;
};

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

export default function ClientManagementWorkspace({ onClientsChange }: ClientManagementWorkspaceProps) {
  const basePath = useInternalOperationsBasePath();
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<ManagedClient | null>(null);
  const [search, setSearch] = useState("");
  const snapshottedIdRef = useRef<string | null>(null);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null,
    [clients, selectedClientId],
  );

  const isDirty = useMemo(() => {
    if (!selectedClient) return false;
    if (!savedSnapshot || savedSnapshot.id !== selectedClient.id) return true;
    return !clientFieldsEqual(selectedClient, savedSnapshot);
  }, [selectedClient, savedSnapshot]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) => {
      const haystack = [
        client.companyName,
        client.primaryContact,
        client.email,
        client.region,
        client.industry,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [clients, search]);

  const syncClients = useCallback(
    (nextClients: ManagedClient[]) => {
      setClients(nextClients);
      onClientsChange?.(nextClients);
    },
    [onClientsChange],
  );

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/clients", { cache: "no-store" });
      const data = await readApiJson<{ clients?: ManagedClient[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load clients");

      const nextClients = data.clients ?? [];
      syncClients(nextClients);
      setSelectedClientId((current) => {
        if (current && nextClients.some((client) => client.id === current)) return current;
        return nextClients[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load clients");
      syncClients([]);
      setSelectedClientId(null);
    } finally {
      setLoading(false);
    }
  }, [syncClients]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (!selectedClientId) {
      snapshottedIdRef.current = null;
      setSavedSnapshot(null);
      return;
    }
    if (snapshottedIdRef.current === selectedClientId) return;
    const client = clients.find((item) => item.id === selectedClientId);
    if (client) {
      snapshottedIdRef.current = selectedClientId;
      setSavedSnapshot({ ...client });
    }
  }, [selectedClientId, clients]);

  function patchSelected(patch: Partial<ManagedClient>) {
    if (!selectedClient) return;
    const next = { ...selectedClient, ...patch };
    syncClients(clients.map((client) => (client.id === next.id ? next : client)));
    setSaveMessage(null);
  }

  async function saveClient(client: ManagedClient) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(client),
      });

      const data = await readApiJson<{ client?: ManagedClient; error?: string }>(response);
      if (!response.ok || !data.client) throw new Error(data.error ?? "Failed to save client");

      syncClients(clients.map((item) => (item.id === data.client!.id ? data.client! : item)));
      snapshottedIdRef.current = data.client.id;
      setSavedSnapshot(data.client);
      setSaveMessage("Client saved");
      return data.client;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save client");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveClient() {
    if (!selectedClient) return;
    setError(null);
    setSaveMessage(null);
    await saveClient(selectedClient);
  }

  async function handleAddClient() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: "New Client" }),
      });

      const data = await readApiJson<{ client?: ManagedClient; error?: string }>(response);
      if (!response.ok || !data.client) throw new Error(data.error ?? "Failed to create client");

      syncClients([data.client, ...clients]);
      setSelectedClientId(data.client.id);
      snapshottedIdRef.current = data.client.id;
      setSavedSnapshot(data.client);
      setSaveMessage("Client created");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create client");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteClient() {
    if (!selectedClient) return;
    if (!window.confirm(`Delete client "${selectedClient.companyName}"?`)) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${selectedClient.id}`, { method: "DELETE" });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to delete client");

      const remaining = clients.filter((client) => client.id !== selectedClient.id);
      syncClients(remaining);
      setSelectedClientId(remaining[0]?.id ?? null);
      setSaveMessage(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete client");
    } finally {
      setBusy(false);
    }
  }

  async function createClientFolder(client: ManagedClient) {
    const folderName =
      window.prompt("Folder name", client.companyName.trim() || "Client folder")?.trim() ||
      client.companyName.trim() ||
      "Client folder";

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/files/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName, parentId: null }),
      });
      const data = await readApiJson<{ folder?: { id: string; name: string }; error?: string }>(
        response,
      );
      if (!response.ok || !data.folder) throw new Error(data.error ?? "Failed to create folder");

      const updated = {
        ...client,
        filesFolderId: data.folder.id,
        filesFolderName: data.folder.name,
      };
      await saveClient(updated);
      setSaveMessage(`Folder "${data.folder.name}" created and linked`);
    } catch (folderError) {
      setError(folderError instanceof Error ? folderError.message : "Failed to create folder");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
          {error.includes("internal_clients") && (
            <span className="mt-2 block text-xs text-red-200/80">
              Run{" "}
              <span className="font-mono">supabase/migrations/037_create_internal_clients.sql</span>{" "}
              in Supabase.
            </span>
          )}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading clients…
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Client Explorer</h2>
                <p className="mt-1 text-xs text-white/45">{clients.length} accounts</p>
              </div>
              <button
                type="button"
                onClick={() => void handleAddClient()}
                disabled={busy}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25 disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Client
              </button>
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clients…"
                className={cn(inputClassName(), "mt-0 pl-10")}
              />
            </div>

            {filteredClients.length === 0 ? (
              <p className="mt-4 text-sm text-white/45">No clients match your search.</p>
            ) : (
              <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10 bg-[#0b1524]/40">
                {filteredClients.map((client) => {
                  const selected = client.id === selectedClient?.id;

                  return (
                    <li
                      key={client.id}
                      className={cn(
                        "flex flex-wrap items-center gap-3 px-4 py-3 transition-colors sm:gap-4",
                        selected && "bg-sky-500/[0.06]",
                      )}
                    >
                      <div className="min-w-0 flex-1 grid gap-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4">
                        <p className="truncate text-sm font-semibold text-white">{client.companyName}</p>
                        <p className="truncate text-xs text-white/50">{client.primaryContact}</p>
                        <p className="text-xs text-white/45">{client.region}</p>
                        <p className="text-xs text-white/45">{client.industry}</p>
                      </div>
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                        Active
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedClientId(client.id)}
                        className={cn(
                          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors",
                          selected
                            ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
                            : "border-white/15 bg-white/[0.04] text-white/70 hover:border-white/25 hover:bg-white/[0.08]",
                        )}
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        Open
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {selectedClient ? (
            <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                      Client Record
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {selectedClient.companyName || "New Client"}
                    </h2>
                    <p className="mt-1 text-sm text-white/50">{selectedClient.region}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`${basePath}?view=projects&clientId=${encodeURIComponent(selectedClient.id)}`}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 text-xs font-semibold text-amber-200 transition-colors hover:border-amber-400/60 hover:bg-amber-500/25"
                    >
                      Active projects ({selectedClient.activeProjects})
                    </Link>
                    {selectedClient.filesFolderId ? (
                      <Link
                        href={`${basePath}?view=files-internal&folderId=${encodeURIComponent(selectedClient.filesFolderId)}`}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        Link to folder
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void createClientFolder(selectedClient)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25 disabled:opacity-60"
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                        Create folder
                      </button>
                    )}
                    <Link
                      href={`${basePath}?view=files-client`}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.08]"
                    >
                      Client file explorer
                    </Link>
                    {selectedClient.platformUrl && (
                      <Link
                        href={selectedClient.platformUrl}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Intelligence Platform
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSaveClient()}
                      disabled={busy || !isDirty}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteClient()}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                        clientStatusClass(selectedClient.accountStatus),
                      )}
                    >
                      {selectedClient.accountStatus}
                    </span>
                  </div>
                </div>

                {saveMessage && (
                  <p className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    {saveMessage}
                  </p>
                )}

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel>Company Name</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedClient.companyName}
                      onChange={(event) => patchSelected({ companyName: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <FieldLabel>Industry</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedClient.industry}
                      onChange={(event) =>
                        patchSelected({ industry: event.target.value as ManagedClient["industry"] })
                      }
                      disabled={busy}
                    >
                      {CLIENT_INDUSTRY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Region</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedClient.region}
                      onChange={(event) =>
                        patchSelected({ region: event.target.value as ManagedClient["region"] })
                      }
                      disabled={busy}
                    >
                      {CLIENT_REGION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Primary Contact</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedClient.primaryContact}
                      onChange={(event) => patchSelected({ primaryContact: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <input
                      type="email"
                      className={inputClassName()}
                      value={selectedClient.email}
                      onChange={(event) => patchSelected({ email: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <FieldLabel>Phone</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedClient.phone}
                      onChange={(event) => patchSelected({ phone: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <FieldLabel>Account Status</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedClient.accountStatus}
                      onChange={(event) =>
                        patchSelected({
                          accountStatus: event.target.value as ManagedClient["accountStatus"],
                        })
                      }
                      disabled={busy}
                    >
                      {CLIENT_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Contract Type</FieldLabel>
                    <select
                      className={inputClassName()}
                      value={selectedClient.contractType}
                      onChange={(event) =>
                        patchSelected({
                          contractType: event.target.value as ManagedClient["contractType"],
                        })
                      }
                      disabled={busy}
                    >
                      {CLIENT_CONTRACT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel>Tax / VAT ID</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedClient.taxId}
                      onChange={(event) => patchSelected({ taxId: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <FieldLabel>Active Projects</FieldLabel>
                    <input
                      type="number"
                      min={0}
                      className={inputClassName()}
                      value={selectedClient.activeProjects}
                      onChange={(event) =>
                        patchSelected({ activeProjects: Number(event.target.value) || 0 })
                      }
                      disabled={busy}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Billing Address</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedClient.billingAddress}
                      onChange={(event) => patchSelected({ billingAddress: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Notes</FieldLabel>
                    <textarea
                      rows={3}
                      className={cn(inputClassName(), "resize-y")}
                      value={selectedClient.notes}
                      onChange={(event) => patchSelected({ notes: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                </div>
              </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-white/45">
              Add a client or select one from the explorer above.
            </section>
          )}
        </div>
      )}
    </div>
  );
}
