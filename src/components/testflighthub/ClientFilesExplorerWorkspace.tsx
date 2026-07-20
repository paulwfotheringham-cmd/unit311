"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, startTransition } from "react";

import type { ManagedClient } from "@/lib/client-management-data";
import { clientStatusClass } from "@/lib/client-management-data";
import { useInternalOperationsBasePath } from "./InternalOperationsBasePathContext";
import { cn } from "@/lib/utils";
import { FolderOpen, FolderPlus, Loader2, Search } from "lucide-react";

import FileRepositoryWorkspace from "./FileRepositoryWorkspace";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

export default function ClientFilesExplorerWorkspace() {
  const basePath = useInternalOperationsBasePath();
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [ensuring, setEnsuring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/clients", { cache: "no-store" });
      const data = await readApiJson<{ clients?: ManagedClient[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load clients");

      const nextClients = data.clients ?? [];
      setClients(nextClients);
      setSelectedClientId((current) => {
        if (current && nextClients.some((client) => client.id === current)) return current;
        return nextClients[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load clients");
      setClients([]);
      setSelectedClientId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadClients();
    });
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) => {
      const haystack = [client.companyName, client.primaryContact, client.region, client.industry]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [clients, search]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const ensureSelectedRoot = useCallback(async () => {
    if (!selectedClientId) return null;

    setEnsuring(true);
    setError(null);
    try {
      const response = await fetch(`/api/clients/${encodeURIComponent(selectedClientId)}/files-root`, {
        method: "POST",
      });
      const data = await readApiJson<{
        client?: ManagedClient;
        rootFolderId?: string;
        error?: string;
      }>(response);
      if (!response.ok || !data.client?.filesFolderId) {
        throw new Error(data.error ?? "Failed to provision client files folder");
      }

      setClients((current) =>
        current.map((client) => (client.id === data.client!.id ? data.client! : client)),
      );
      return data.client;
    } catch (ensureError) {
      setError(
        ensureError instanceof Error ? ensureError.message : "Failed to provision client files folder",
      );
      return null;
    } finally {
      setEnsuring(false);
    }
  }, [selectedClientId]);

  useEffect(() => {
    if (!selectedClientId) return;
    if (selectedClient?.filesFolderId) return;

    startTransition(() => {
      void ensureSelectedRoot();
    });
  }, [ensureSelectedRoot, selectedClient?.filesFolderId, selectedClientId]);

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
              Client files
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Client file explorer</h2>
            <p className="mt-1 text-xs text-white/45">
              Document workspace for each Client Directory account.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedClient && !selectedClient.filesFolderId ? (
              <button
                type="button"
                disabled={ensuring}
                onClick={() => void ensureSelectedRoot()}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25 disabled:opacity-60"
              >
                {ensuring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
                Ensure folder
              </button>
            ) : null}
            {selectedClient?.filesFolderId ? (
              <Link
                href={`${basePath}?view=files-internal&folderId=${encodeURIComponent(selectedClient.filesFolderId)}`}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Open in internal files
              </Link>
            ) : null}
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clients…"
            className="h-10 w-full rounded-xl border border-white/10 bg-[#0b1524] pl-10 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-400/50"
          />
        </div>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading clients…
          </div>
        ) : (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {filteredClients.length === 0 ? (
              <p className="text-sm text-white/45">
                {clients.length === 0
                  ? "No clients in this workspace yet."
                  : "No clients match your search."}
              </p>
            ) : (
              filteredClients.map((client) => {
                const selected = client.id === selectedClientId;

                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClientId(client.id)}
                    className={cn(
                      "min-w-[12rem] shrink-0 rounded-xl border px-4 py-3 text-left transition-colors",
                      selected
                        ? "border-sky-400/40 bg-sky-500/10 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.15)]"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{client.companyName}</p>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                          clientStatusClass(client.accountStatus),
                        )}
                      >
                        {client.accountStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {client.industry} · {client.region}
                    </p>
                    <p className="mt-1 text-[11px] text-white/35">
                      {client.filesFolderName
                        ? `Folder: ${client.filesFolderName}`
                        : ensuring && selected
                          ? "Provisioning folder…"
                          : "No linked folder"}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        )}
      </section>

      {selectedClient?.filesFolderId ? (
        <FileRepositoryWorkspace
          key={`${selectedClient.id}-${selectedClient.filesFolderId}`}
          scope="client"
          clientId={selectedClient.id}
          clientName={selectedClient.companyName}
          initialFolderId={selectedClient.filesFolderId}
          rootLabel={selectedClient.companyName}
        />
      ) : selectedClient ? (
        <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-white/45">
          {ensuring ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Provisioning document workspace…
            </span>
          ) : (
            <div className="space-y-3">
              <p>This client does not have a linked document folder yet.</p>
              <button
                type="button"
                onClick={() => void ensureSelectedRoot()}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Ensure folder
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center text-sm text-white/45">
          Select a client to browse their file workspace.
        </section>
      )}
    </div>
  );
}
