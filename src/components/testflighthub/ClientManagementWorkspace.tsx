"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ClientFinanceSummary } from "@/lib/accounting/client-finance";
import {
  CLIENT_CONTRACT_OPTIONS,
  CLIENT_INDUSTRY_OPTIONS,
  CLIENT_REGION_OPTIONS,
  CLIENT_STATUS_OPTIONS,
  clientFieldsEqual,
  clientStatusClass,
  type ManagedClient,
} from "@/lib/client-management-data";
import { isCrmLinkedClientNotes } from "@/lib/crm-lead-client-data";
import { centralLoginUrl } from "@/lib/app-domains";
import { useInternalOperationsBasePath } from "./InternalOperationsBasePathContext";
import DashboardTopTilesBar from "@/components/testflighthub/DashboardTopTilesBar";
import {
  buildClientDashboardCatalog,
  CLIENTS_DASHBOARD_TILES,
  DEFAULT_CLIENTS_TILE_LAYOUT,
} from "@/lib/view-dashboard-tile-catalogs";
import { cn } from "@/lib/utils";
import { ExternalLink, FolderOpen, FolderPlus, Loader2, Plus, Save, Search, Trash2 } from "lucide-react";

function formatFinanceMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

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
  /** Dashboard shows tiles/summary; directory shows the client explorer. */
  mode?: "dashboard" | "directory";
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

const CLIENT_EXPLORER_ROW_GRID =
  "grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-x-4 sm:gap-y-0";

export default function ClientManagementWorkspace({
  onClientsChange,
  mode = "directory",
}: ClientManagementWorkspaceProps) {
  const basePath = useInternalOperationsBasePath();
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<ManagedClient | null>(null);
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterContract, setFilterContract] = useState("all");
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [financeSummary, setFinanceSummary] = useState<ClientFinanceSummary | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const snapshottedIdRef = useRef<string | null>(null);
  const detailSectionRef = useRef<HTMLElement>(null);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const detailClient = useMemo(
    () => clients.find((client) => client.id === detailClientId) ?? null,
    [clients, detailClientId],
  );

  const isDirty = useMemo(() => {
    if (!selectedClient) return false;
    if (!savedSnapshot || savedSnapshot.id !== selectedClient.id) return true;
    return !clientFieldsEqual(selectedClient, savedSnapshot);
  }, [selectedClient, savedSnapshot]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clients.filter((client) => {
      if (filterIndustry !== "all" && client.industry !== filterIndustry) return false;
      if (filterRegion !== "all" && client.region !== filterRegion) return false;
      if (filterStatus !== "all" && client.accountStatus !== filterStatus) return false;
      if (filterContract !== "all" && client.contractType !== filterContract) return false;
      if (!query) return true;

      const haystack = [
        client.companyName,
        client.primaryContact,
        client.email,
        client.region,
        client.industry,
        client.contractType,
        client.accountStatus,
        client.billingAddress,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [clients, filterContract, filterIndustry, filterRegion, filterStatus, search]);

  const clientDashboardCatalog = useMemo(
    () => buildClientDashboardCatalog(clients),
    [clients],
  );

  function openClient(clientId: string) {
    setSelectedClientId(clientId);
    setDetailClientId(clientId);
    window.requestAnimationFrame(() => {
      detailSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

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

  useEffect(() => {
    if (!selectedClient?.id) {
      setFinanceSummary(null);
      setFinanceError(null);
      setFinanceLoading(false);
      return;
    }

    const clientId = selectedClient.id;
    let cancelled = false;

    async function loadFinanceSummary() {
      setFinanceLoading(true);
      setFinanceError(null);
      setFinanceSummary(null);

      try {
        const response = await fetch(`/api/financials/clients/${encodeURIComponent(clientId)}/summary`, {
          cache: "no-store",
        });
        const data = await readApiJson<{ summary?: ClientFinanceSummary; error?: string }>(response);
        if (!response.ok || !data.summary) {
          throw new Error(data.error ?? "Failed to load finance summary");
        }
        if (!cancelled) setFinanceSummary(data.summary);
      } catch (loadError) {
        if (!cancelled) {
          setFinanceSummary(null);
          setFinanceError(
            loadError instanceof Error ? loadError.message : "Failed to load finance summary",
          );
        }
      } finally {
        if (!cancelled) setFinanceLoading(false);
      }
    }

    void loadFinanceSummary();
    return () => {
      cancelled = true;
    };
  }, [selectedClient?.id]);

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

  async function handleResetWorkspaceOnboarding() {
    if (!selectedClient) return;
    setBusy(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(
        `/api/clients/${selectedClient.id}/reset-workspace-onboarding`,
        { method: "POST" },
      );
      const data = await readApiJson<{
        ok?: boolean;
        error?: string;
        message?: string;
        slug?: string;
      }>(response);
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to reset workspace onboarding.");
      }
      setSaveMessage(
        data.message ??
          `Workspace onboarding reset${data.slug ? ` for ${data.slug}` : ""}. Next login opens the wizard.`,
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error ? resetError.message : "Failed to reset workspace onboarding.",
      );
    } finally {
      setBusy(false);
    }
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
      setDetailClientId(data.client.id);
      snapshottedIdRef.current = data.client.id;
      setSavedSnapshot(data.client);
      setSaveMessage("Client created");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create client");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteClient(client?: ManagedClient) {
    const target = client ?? selectedClient;
    if (!target) return;
    if (!window.confirm(
      `Delete client "${target.companyName}"?\n\nUnpaid invoices linked to this client will also be removed. Paid invoices cannot be deleted.`,
    )) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${target.id}`, { method: "DELETE" });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to delete client");

      const remaining = clients.filter((item) => item.id !== target.id);
      syncClients(remaining);
      if (detailClientId === target.id) setDetailClientId(null);
      if (selectedClientId === target.id) setSelectedClientId(remaining[0]?.id ?? null);
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
      {mode === "dashboard" ? (
        <DashboardTopTilesBar
          storageKey="unit311-clients-dashboard-tiles"
          catalog={clientDashboardCatalog}
          defaultLayout={DEFAULT_CLIENTS_TILE_LAYOUT}
          title="Client key details"
          showCustomizeHint={false}
        />
      ) : null}
      {error && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
          {error.includes("Could not find the table") && error.includes("internal_clients") ? (
            <span className="mt-2 block text-xs text-red-200/80">
              Run{" "}
              <span className="font-mono">supabase/migrations/037_create_internal_clients.sql</span>{" "}
              in Supabase.
            </span>
          ) : null}
        </p>
      )}

      {mode === "dashboard" ? (
        loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading clients…
          </div>
        ) : (
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
            <h2 className="text-lg font-semibold text-white">Clients overview</h2>
            <p className="mt-1 text-sm text-white/55">
              {clients.length} accounts on record. Open Client Directory to manage accounts,
              contracts, and contacts.
            </p>
          </section>
        )
      ) : null}

      {mode === "directory" ? (
        loading ? (
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
                placeholder="Search by name, contact, email, location…"
                className={cn(inputClassName(), "mt-0 pl-10")}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <FieldLabel>Industry</FieldLabel>
                <select
                  className={inputClassName()}
                  value={filterIndustry}
                  onChange={(event) => setFilterIndustry(event.target.value)}
                >
                  <option value="all">All industries</option>
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
                  value={filterRegion}
                  onChange={(event) => setFilterRegion(event.target.value)}
                >
                  <option value="all">All regions</option>
                  {CLIENT_REGION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClassName()}
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  {CLIENT_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Contract</FieldLabel>
                <select
                  className={inputClassName()}
                  value={filterContract}
                  onChange={(event) => setFilterContract(event.target.value)}
                >
                  <option value="all">All contract types</option>
                  {CLIENT_CONTRACT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredClients.length === 0 ? (
              <p className="mt-4 text-sm text-white/45">
                {clients.length === 0
                  ? "No clients in this workspace yet. Create a client to get started."
                  : "No clients match your search."}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0b1524]/40">
                <div
                  className={cn(
                    CLIENT_EXPLORER_ROW_GRID,
                    "hidden border-b border-white/10 px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/40 sm:grid",
                  )}
                >
                  <span>Client name</span>
                  <span>Primary contact</span>
                  <span>Location</span>
                  <span>Industry</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>
                <ul className="divide-y divide-white/10">
                {filteredClients.map((client) => {
                  const selected = client.id === detailClientId;

                  return (
                    <li
                      key={client.id}
                      className={cn(
                        CLIENT_EXPLORER_ROW_GRID,
                        "px-4 py-3 transition-colors",
                        selected && "bg-sky-500/[0.06]",
                      )}
                    >
                      <p className="min-w-0 truncate text-sm font-semibold text-white">
                        {client.companyName}
                      </p>
                      <p className="min-w-0 truncate text-xs text-white/50">{client.primaryContact}</p>
                      <p className="min-w-0 truncate text-xs text-white/45">{client.region}</p>
                      <p className="min-w-0 truncate text-xs text-white/45">{client.industry}</p>
                      <span
                        className={cn(
                          "w-fit rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                          clientStatusClass(client.accountStatus),
                        )}
                      >
                        {client.accountStatus}
                      </span>
                      <div className="flex shrink-0 items-center justify-start gap-2 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => openClient(client.id)}
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
                        <button
                          type="button"
                          onClick={() => void handleDeleteClient(client)}
                          disabled={busy}
                          aria-label={`Delete ${client.companyName}`}
                          title={`Delete ${client.companyName}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-400/30 bg-red-500/10 text-red-200 transition-colors hover:border-red-400/50 hover:bg-red-500/20 disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
                </ul>
              </div>
            )}
          </section>

          {detailClient && selectedClient ? (
            <section
              ref={detailSectionRef}
              className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6"
            >
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
                    {/fotheringham/i.test(selectedClient.companyName) && (
                      <button
                        type="button"
                        onClick={() => void handleResetWorkspaceOnboarding()}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-100 transition-colors hover:bg-violet-500/25 disabled:opacity-60"
                      >
                        Reset Onboarding (Test)
                      </button>
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
                    <FieldLabel>Primary Contact First Name</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedClient.primaryContactFirstName ?? ""}
                      onChange={(event) =>
                        patchSelected({ primaryContactFirstName: event.target.value })
                      }
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <FieldLabel>Primary Contact Surname</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedClient.primaryContactSurname ?? ""}
                      onChange={(event) =>
                        patchSelected({ primaryContactSurname: event.target.value })
                      }
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
                    <FieldLabel>Role</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedClient.jobTitle ?? ""}
                      onChange={(event) => patchSelected({ jobTitle: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <FieldLabel>Account Status</FieldLabel>
                    {isCrmLinkedClientNotes(selectedClient.notes) ? (
                      <div className="mt-1.5 space-y-1.5">
                        <p
                          className={cn(
                            inputClassName(),
                            "flex items-center justify-between gap-3",
                            selectedClient.accountStatus === "Pending Payment" ||
                              selectedClient.accountStatus === "Pending"
                              ? "text-amber-100"
                              : "text-emerald-200",
                          )}
                        >
                          <span>{selectedClient.accountStatus}</span>
                          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
                            CRM client
                          </span>
                        </p>
                        {(selectedClient.accountStatus === "Pending Payment" ||
                          selectedClient.accountStatus === "Pending") && (
                          <p className="text-[11px] text-white/45">
                            Linked from CRM — still awaiting payment confirmation before full activation.
                          </p>
                        )}
                      </div>
                    ) : (
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
                    )}
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
                    <FieldLabel>Company Address</FieldLabel>
                    <textarea
                      rows={3}
                      className={inputClassName()}
                      value={selectedClient.companyAddress ?? ""}
                      onChange={(event) => patchSelected({ companyAddress: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <FieldLabel>Company City</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedClient.companyCity ?? ""}
                      onChange={(event) => patchSelected({ companyCity: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <FieldLabel>Company Postcode</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedClient.companyPostcode ?? ""}
                      onChange={(event) => patchSelected({ companyPostcode: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Company Country</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={selectedClient.companyCountry ?? ""}
                      onChange={(event) => patchSelected({ companyCountry: event.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Accounts Payable Email</FieldLabel>
                    <input
                      type="email"
                      className={inputClassName()}
                      value={
                        selectedClient.accountsPayableEmail ??
                        selectedClient.invoiceEmail ??
                        ""
                      }
                      onChange={(event) =>
                        patchSelected({
                          accountsPayableEmail: event.target.value,
                          invoiceEmail: event.target.value,
                        })
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
                  <div>
                    <FieldLabel>Subscription Status</FieldLabel>
                    <p className={cn(inputClassName(), "mt-1.5 text-white/75")}>
                      {selectedClient.subscriptionStatus ?? "—"}
                    </p>
                  </div>
                  <div>
                    <FieldLabel>Billing Frequency</FieldLabel>
                    <p className={cn(inputClassName(), "mt-1.5 text-white/75")}>
                      {selectedClient.billingFrequency ?? "—"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Renewal Date</FieldLabel>
                    <p className={cn(inputClassName(), "mt-1.5 text-white/75")}>
                      {selectedClient.renewalDate ?? "—"}
                    </p>
                  </div>
                  <div className="sm:col-span-2 rounded-xl border border-white/10 bg-[#0b1524]/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                        Finance
                      </p>
                      {financeLoading && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-white/45">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading…
                        </span>
                      )}
                    </div>
                    {financeError && (
                      <div className="mt-3 space-y-1 text-xs text-red-300">
                        <p>{financeError}</p>
                        {/unauthorized|authentication required/i.test(financeError) ? (
                          <p className="text-red-200/80">
                            <a
                              href={centralLoginUrl()}
                              className="font-semibold underline underline-offset-2 hover:text-white"
                            >
                              Sign in again
                            </a>{" "}
                            to load invoices and payments.
                          </p>
                        ) : null}
                      </div>
                    )}
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-white/10 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                          Outstanding Balance
                        </p>
                        <p className="mt-1 font-mono text-sm text-white/90">
                          {formatFinanceMoney(financeSummary?.outstandingBalance ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                          Financial Summary
                        </p>
                        <p className="mt-1 text-sm text-white/75">
                          {(financeSummary?.invoices.length ?? 0)} invoices ·{" "}
                          {(financeSummary?.payments.length ?? 0)} payments ·{" "}
                          {
                            (financeSummary?.invoices.filter(
                              (invoice) =>
                                invoice.status === "issued" || invoice.status === "overdue",
                            ).length ?? 0)
                          }{" "}
                          open
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                          Invoices
                        </p>
                        {(financeSummary?.invoices.length ?? 0) === 0 ? (
                          <p className="mt-2 text-xs text-white/40">No invoices</p>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {financeSummary!.invoices.map((invoice) => (
                              <li
                                key={invoice.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-2.5 py-2 text-xs"
                              >
                                <div>
                                  <Link
                                    href={`${basePath}?view=accounts-receivable`}
                                    className="font-medium text-sky-300 hover:text-sky-200"
                                  >
                                    {invoice.invoiceNumber}
                                  </Link>
                                  <span className="ml-2 text-white/45">{invoice.status}</span>
                                </div>
                                <span className="font-mono text-white/80">
                                  {formatFinanceMoney(invoice.amount, invoice.currency)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                          Payments
                        </p>
                        {(financeSummary?.payments.length ?? 0) === 0 ? (
                          <p className="mt-2 text-xs text-white/40">No payments</p>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {financeSummary!.payments.map((payment) => (
                              <li
                                key={payment.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-2.5 py-2 text-xs"
                              >
                                <div>
                                  <span className="font-medium text-white/85">
                                    {payment.invoiceNumber}
                                  </span>
                                  <span className="ml-2 text-white/45">{payment.paidAt.slice(0, 10)}</span>
                                </div>
                                <span className="font-mono text-emerald-300/90">
                                  {formatFinanceMoney(payment.amount, payment.currency)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
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
              Select a client from the explorer to view details.
            </section>
          )}
        </div>
        )
      ) : null}
    </div>
  );
}
