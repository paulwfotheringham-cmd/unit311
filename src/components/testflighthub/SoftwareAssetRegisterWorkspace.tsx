"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import {
  Download,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

import DashboardTopTilesBar from "@/components/testflighthub/DashboardTopTilesBar";
import ResponsiveMasterDetail, { useMobileDetailPanel } from "@/components/ui/ResponsiveMasterDetail";
import {
  ATTACHMENT_KINDS,
  availableLicences,
  computeSoftwareAssetsSummary,
  createBlankSoftwareAsset,
  formatSoftwareMoney,
  LICENCE_TYPES,
  RENEWAL_FREQUENCIES,
  SOFTWARE_STATUSES,
  softwareAssetToCsvRow,
  type SoftwareAsset,
  type SoftwareAttachmentKind,
  type SoftwareStatus,
} from "@/lib/software-assets-data";
import { cn } from "@/lib/utils";
import {
  buildSoftwareAssetsDashboardCatalog,
  DEFAULT_SOFTWARE_ASSETS_TILE_LAYOUT,
  SOFTWARE_ASSETS_DASHBOARD_TILES,
} from "@/lib/view-dashboard-tile-catalogs";

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

/** Plain numeric entry — no browser stepper / scroller arrows. */
function numberInputClassName() {
  return cn(
    inputClassName(),
    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-white">{children}</h3>;
}

function statusClass(status: SoftwareStatus) {
  if (status === "Active") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  if (status === "Trial") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-white/15 bg-white/[0.04] text-white/60";
}

function assetsEqual(a: SoftwareAsset, b: SoftwareAsset) {
  return JSON.stringify(stripTransient(a)) === JSON.stringify(stripTransient(b));
}

function stripTransient(asset: SoftwareAsset) {
  const { files: _files, createdAt: _c, updatedAt: _u, ...rest } = asset;
  return rest;
}

function downloadCsv(assets: SoftwareAsset[]) {
  const rows = assets.map(softwareAssetToCsvRow);
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]!);
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header as keyof typeof row])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `software-asset-register-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

type DetailTab =
  | "general"
  | "licences"
  | "financials"
  | "account"
  | "ownership"
  | "supplier"
  | "files"
  | "integrations";

export default function SoftwareAssetRegisterWorkspace() {
  const [assets, setAssets] = useState<SoftwareAsset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<SoftwareAsset | null>(null);
  const [search, setSearch] = useState("");
  const [filterVendor, setFilterVendor] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | SoftwareStatus>("all");
  const [filterRenewalMonth, setFilterRenewalMonth] = useState("all");
  const [detailTab, setDetailTab] = useState<DetailTab>("general");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [attachmentKind, setAttachmentKind] = useState<SoftwareAttachmentKind>("Contract");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const snapshottedIdRef = useRef<string | null>(null);
  const { showDetail, openDetail, closeDetail } = useMobileDetailPanel();

  const selected = useMemo(
    () => assets.find((asset) => asset.id === selectedId) ?? assets[0] ?? null,
    [assets, selectedId],
  );

  const isDirty = useMemo(() => {
    if (!selected) return false;
    if (!savedSnapshot || savedSnapshot.id !== selected.id) return true;
    return !assetsEqual(selected, savedSnapshot) || Boolean(passwordDraft);
  }, [selected, savedSnapshot, passwordDraft]);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/software-assets", { cache: "no-store" });
      const data = await readApiJson<{ assets?: SoftwareAsset[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load software assets");
      const next = data.assets ?? [];
      setAssets(next);
      setSelectedId((current) => {
        if (current && next.some((asset) => asset.id === current)) return current;
        return next[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load software assets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadAssets();
    });
  }, [loadAssets]);

  useEffect(() => {
    startTransition(() => {
      if (!selected) {
        setSavedSnapshot(null);
        snapshottedIdRef.current = null;
        return;
      }
      if (snapshottedIdRef.current === selected.id) return;
      snapshottedIdRef.current = selected.id;
      setSavedSnapshot(selected);
      setPasswordDraft("");
      setRevealedPassword(null);
      setShowPassword(false);
    });
  }, [selected]);

  const vendors = useMemo(
    () =>
      Array.from(new Set(assets.map((asset) => asset.vendor.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [assets],
  );

  const categories = useMemo(
    () =>
      Array.from(new Set(assets.map((asset) => asset.category.trim()).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [assets],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (filterVendor !== "all" && asset.vendor !== filterVendor) return false;
      if (filterCategory !== "all" && asset.category !== filterCategory) return false;
      if (filterStatus !== "all" && asset.status !== filterStatus) return false;
      if (filterRenewalMonth !== "all") {
        if (!asset.nextRenewalDate) return false;
        const month = String(new Date(asset.nextRenewalDate).getUTCMonth() + 1);
        if (month !== filterRenewalMonth) return false;
      }
      if (!q) return true;
      return [asset.name, asset.vendor, asset.category, asset.purpose, asset.department]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [assets, filterCategory, filterRenewalMonth, filterStatus, filterVendor, search]);

  const summary = useMemo(() => computeSoftwareAssetsSummary(assets, null), [assets]);
  const tileCatalog = useMemo(
    () => buildSoftwareAssetsDashboardCatalog(summary, formatSoftwareMoney),
    [summary],
  );

  function patchSelected(patch: Partial<SoftwareAsset>) {
    if (!selected) return;
    setAssets((current) =>
      current.map((asset) => (asset.id === selected.id ? { ...asset, ...patch } : asset)),
    );
  }

  function patchCredentials(patch: Partial<SoftwareAsset["credentials"]>) {
    if (!selected) return;
    patchSelected({ credentials: { ...selected.credentials, ...patch } });
  }

  async function handleAdd() {
    setBusy(true);
    setError(null);
    setSaveMessage(null);
    try {
      const blank = createBlankSoftwareAsset();
      const response = await fetch("/api/software-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: blank.name, status: blank.status }),
      });
      const data = await readApiJson<{ asset?: SoftwareAsset; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to add software");
      const asset = data.asset!;
      setAssets((current) => [...current, asset].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(asset.id);
      snapshottedIdRef.current = null;
      openDetail();
      setDetailTab("general");
      setSaveMessage("Software record created.");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Failed to add software");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setSaveMessage(null);
    try {
      const response = await fetch(`/api/software-assets/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...selected,
          password: passwordDraft || undefined,
        }),
      });
      const data = await readApiJson<{ asset?: SoftwareAsset; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to save");
      const asset = data.asset!;
      setAssets((current) => current.map((item) => (item.id === asset.id ? asset : item)));
      setSavedSnapshot(asset);
      setPasswordDraft("");
      snapshottedIdRef.current = asset.id;
      setSaveMessage("Saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Delete “${selected.name}”? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/software-assets/${selected.id}`, { method: "DELETE" });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to delete");
      setAssets((current) => current.filter((asset) => asset.id !== selected.id));
      setSelectedId(null);
      closeDetail();
      setSaveMessage("Deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevealPassword() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/software-assets/${selected.id}/reveal-password`, {
        method: "POST",
      });
      const data = await readApiJson<{ password?: string; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to reveal password");
      setRevealedPassword(data.password ?? "");
      setShowPassword(true);
    } catch (revealError) {
      setError(revealError instanceof Error ? revealError.message : "Failed to reveal password");
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadFile(file: File) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await fetch("/api/files/upload", { method: "POST", body: formData });
      const uploadData = await readApiJson<{ file?: { id: string }; error?: string }>(
        uploadResponse,
      );
      if (!uploadResponse.ok) throw new Error(uploadData.error ?? "Upload failed");
      const fileObjectId = uploadData.file?.id;
      if (!fileObjectId) throw new Error("Upload did not return a file id.");

      const linkResponse = await fetch(`/api/software-assets/${selected.id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileObjectId, attachmentKind }),
      });
      const linkData = await readApiJson<{ asset?: SoftwareAsset; error?: string }>(linkResponse);
      if (!linkResponse.ok) throw new Error(linkData.error ?? "Failed to link file");
      const asset = linkData.asset!;
      setAssets((current) => current.map((item) => (item.id === asset.id ? asset : item)));
      setSavedSnapshot(asset);
      setSaveMessage("File attached.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to attach file");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleUnlinkFile(linkId: string) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/software-assets/${selected.id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink", linkId }),
      });
      const data = await readApiJson<{ asset?: SoftwareAsset; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to remove file");
      const asset = data.asset!;
      setAssets((current) => current.map((item) => (item.id === asset.id ? asset : item)));
      setSavedSnapshot(asset);
    } catch (unlinkError) {
      setError(unlinkError instanceof Error ? unlinkError.message : "Failed to remove file");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: DetailTab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "licences", label: "Licences" },
    { id: "financials", label: "Financials" },
    { id: "account", label: "Account" },
    { id: "ownership", label: "Ownership" },
    { id: "supplier", label: "Supplier" },
    { id: "files", label: "Files" },
    { id: "integrations", label: "Integrations" },
  ];

  const available = selected ? availableLicences(selected) : null;

  return (
    <div className="space-y-4">
      <DashboardTopTilesBar
        storageKey="unit311-software-assets-tiles"
        catalog={SOFTWARE_ASSETS_DASHBOARD_TILES}
        defaultLayout={DEFAULT_SOFTWARE_ASSETS_TILE_LAYOUT}
        tiles={tileCatalog}
        title="Software Asset Register"
      />

      {error ? (
        <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}
      {saveMessage ? (
        <p className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {saveMessage}
        </p>
      ) : null}

      <ResponsiveMasterDetail
        showDetail={showDetail && !!selected}
        onBack={closeDetail}
        backLabel="Back to software"
        master={
          <section className="flex h-full min-h-[28rem] flex-col rounded-2xl border border-white/15 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">Software Explorer</h2>
                <p className="mt-0.5 text-[11px] text-white/45">
                  {filtered.length} of {assets.length} products
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadCsv(filtered)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-xs font-medium text-white hover:bg-white/[0.1]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
                <button
                  type="button"
                  onClick={() => void handleAdd()}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add Software
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search software…"
                className={inputClassName()}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={filterVendor}
                  onChange={(event) => setFilterVendor(event.target.value)}
                  className={inputClassName()}
                >
                  <option value="all">All vendors</option>
                  {vendors.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
                <select
                  value={filterCategory}
                  onChange={(event) => setFilterCategory(event.target.value)}
                  className={inputClassName()}
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(event) =>
                    setFilterStatus(event.target.value as "all" | SoftwareStatus)
                  }
                  className={inputClassName()}
                >
                  <option value="all">All statuses</option>
                  {SOFTWARE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <select
                  value={filterRenewalMonth}
                  onChange={(event) => setFilterRenewalMonth(event.target.value)}
                  className={inputClassName()}
                >
                  <option value="all">All renewal months</option>
                  {Array.from({ length: 12 }, (_, index) => {
                    const value = String(index + 1);
                    const label = new Date(2026, index, 1).toLocaleString("en-GB", {
                      month: "long",
                    });
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-sm text-white/50">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading register…
                </div>
              ) : filtered.length === 0 ? (
                <p className="px-2 py-10 text-center text-sm text-white/45">
                  No software records match these filters.
                </p>
              ) : (
                filtered.map((asset) => {
                  const isSelected = selected?.id === asset.id;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(asset.id);
                        openDetail();
                      }}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                        isSelected
                          ? "border-sky-400/40 bg-sky-500/10"
                          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{asset.name}</p>
                          <p className="mt-0.5 truncate text-xs text-white/50">
                            {asset.vendor || "No vendor"} · {asset.category || "Uncategorised"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-medium",
                            statusClass(asset.status),
                          )}
                        >
                          {asset.status}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-white/40">
                        {formatSoftwareMoney(asset.monthlyCost, asset.currency)}/mo
                        {asset.nextRenewalDate ? ` · renews ${asset.nextRenewalDate}` : ""}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        }
        detail={
          selected ? (
            <section className="flex h-full min-h-[28rem] flex-col rounded-2xl border border-white/15 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300">
                    Software record
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">{selected.name}</h2>
                  <p className="mt-1 text-sm text-white/50">
                    {selected.vendor || "Vendor not set"}
                    {summary.costPerEmployee != null
                      ? ` · Cost/employee (workspace annual): ${formatSoftwareMoney(summary.costPerEmployee, summary.currency)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={busy || !isDirty}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={busy}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3 text-xs font-medium text-red-100 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      detailTab === tab.id
                        ? "bg-sky-500/20 text-sky-100"
                        : "text-white/50 hover:bg-white/[0.06] hover:text-white/80",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
                {detailTab === "general" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldLabel>Software name</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.name}
                        onChange={(event) => patchSelected({ name: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Vendor</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.vendor}
                        onChange={(event) => patchSelected({ vendor: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Category</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.category}
                        onChange={(event) => patchSelected({ category: event.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel>Purpose / Description</FieldLabel>
                      <textarea
                        className={cn(inputClassName(), "min-h-[5rem] resize-y")}
                        value={selected.purpose}
                        onChange={(event) => patchSelected({ purpose: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Website</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.websiteUrl}
                        onChange={(event) => patchSelected({ websiteUrl: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Support URL</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.supportUrl}
                        onChange={(event) => patchSelected({ supportUrl: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Documentation URL</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.documentationUrl}
                        onChange={(event) =>
                          patchSelected({ documentationUrl: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Status</FieldLabel>
                      <select
                        className={inputClassName()}
                        value={selected.status}
                        onChange={(event) =>
                          patchSelected({ status: event.target.value as SoftwareStatus })
                        }
                      >
                        {SOFTWARE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : null}

                {detailTab === "licences" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Licences purchased</FieldLabel>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={numberInputClassName()}
                        value={selected.licencesPurchased}
                        onChange={(event) => {
                          const raw = event.target.value.replace(/[^\d]/g, "");
                          patchSelected({ licencesPurchased: raw === "" ? 0 : Number(raw) });
                        }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Currently allocated</FieldLabel>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={numberInputClassName()}
                        value={selected.licencesAllocated}
                        onChange={(event) => {
                          const raw = event.target.value.replace(/[^\d]/g, "");
                          patchSelected({ licencesAllocated: raw === "" ? 0 : Number(raw) });
                        }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Available licences</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={available === null ? "Unlimited" : String(available)}
                        readOnly
                      />
                    </div>
                    <div>
                      <FieldLabel>Licence type</FieldLabel>
                      <select
                        className={inputClassName()}
                        value={selected.licenceType}
                        onChange={(event) =>
                          patchSelected({
                            licenceType: event.target.value as SoftwareAsset["licenceType"],
                          })
                        }
                      >
                        {LICENCE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : null}

                {detailTab === "financials" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Current monthly cost</FieldLabel>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={numberInputClassName()}
                        value={selected.monthlyCost}
                        onChange={(event) => {
                          const raw = event.target.value.replace(/[^\d.]/g, "");
                          if (raw === "" || raw === ".") {
                            patchSelected({ monthlyCost: 0 });
                            return;
                          }
                          if (!/^\d*\.?\d*$/.test(raw)) return;
                          patchSelected({ monthlyCost: Number(raw) });
                        }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Current annual cost</FieldLabel>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={numberInputClassName()}
                        value={selected.annualCost}
                        onChange={(event) => {
                          const raw = event.target.value.replace(/[^\d.]/g, "");
                          if (raw === "" || raw === ".") {
                            patchSelected({ annualCost: 0 });
                            return;
                          }
                          if (!/^\d*\.?\d*$/.test(raw)) return;
                          patchSelected({ annualCost: Number(raw) });
                        }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Currency</FieldLabel>
                      <select
                        className={inputClassName()}
                        value={selected.currency || "USD"}
                        onChange={(event) => patchSelected({ currency: event.target.value })}
                      >
                        {["USD", "GBP", "EUR", "AED", "ZAR"].map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Last payment amount</FieldLabel>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={numberInputClassName()}
                        value={selected.lastPaymentAmount ?? ""}
                        onChange={(event) => {
                          const raw = event.target.value.replace(/[^\d.]/g, "");
                          if (raw === "") {
                            patchSelected({ lastPaymentAmount: null });
                            return;
                          }
                          if (raw === "." || !/^\d*\.?\d*$/.test(raw)) return;
                          patchSelected({ lastPaymentAmount: Number(raw) });
                        }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Last payment date</FieldLabel>
                      <input
                        type="date"
                        className={inputClassName()}
                        value={selected.lastPaymentDate ?? ""}
                        onChange={(event) =>
                          patchSelected({ lastPaymentDate: event.target.value || null })
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Next renewal date</FieldLabel>
                      <input
                        type="date"
                        className={inputClassName()}
                        value={selected.nextRenewalDate ?? ""}
                        onChange={(event) =>
                          patchSelected({ nextRenewalDate: event.target.value || null })
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Renewal frequency</FieldLabel>
                      <select
                        className={inputClassName()}
                        value={selected.renewalFrequency}
                        onChange={(event) =>
                          patchSelected({
                            renewalFrequency: event.target
                              .value as SoftwareAsset["renewalFrequency"],
                          })
                        }
                      >
                        {RENEWAL_FREQUENCIES.map((frequency) => (
                          <option key={frequency} value={frequency}>
                            {frequency}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Contract length</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.contractLength}
                        onChange={(event) => patchSelected({ contractLength: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Cost centre</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.costCentre}
                        onChange={(event) => patchSelected({ costCentre: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Budget owner</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.budgetOwner}
                        onChange={(event) => patchSelected({ budgetOwner: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Supplier</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.supplierName}
                        onChange={(event) => patchSelected({ supplierName: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Invoice reference</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.invoiceReference}
                        onChange={(event) =>
                          patchSelected({ invoiceReference: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Financial account</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.financialAccountCode}
                        onChange={(event) =>
                          patchSelected({ financialAccountCode: event.target.value })
                        }
                      />
                    </div>
                  </div>
                ) : null}

                {detailTab === "account" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Primary account email</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.credentials.primaryAccountEmail}
                        onChange={(event) =>
                          patchCredentials({ primaryAccountEmail: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Portal URL</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.credentials.portalUrl}
                        onChange={(event) => patchCredentials({ portalUrl: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Username</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.credentials.username}
                        onChange={(event) => patchCredentials({ username: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>
                        Password {selected.credentials.passwordSet ? "(encrypted on file)" : ""}
                      </FieldLabel>
                      <div className="mt-1.5 flex gap-2">
                        <input
                          type={showPassword ? "text" : "password"}
                          className={cn(inputClassName(), "mt-0")}
                          value={passwordDraft || (showPassword ? revealedPassword ?? "" : "")}
                          placeholder={
                            selected.credentials.passwordSet
                              ? "Enter new password to replace"
                              : "Set password"
                          }
                          onChange={(event) => setPasswordDraft(event.target.value)}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          title={showPassword ? "Hide" : "Reveal"}
                          onClick={() => {
                            if (showPassword) {
                              setShowPassword(false);
                              return;
                            }
                            if (passwordDraft) {
                              setShowPassword(true);
                              return;
                            }
                            void handleRevealPassword();
                          }}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-white/40">
                        Passwords are encrypted at rest. Plaintext is never stored or listed.
                      </p>
                    </div>
                    <div>
                      <FieldLabel>MFA enabled</FieldLabel>
                      <select
                        className={inputClassName()}
                        value={selected.credentials.mfaEnabled ? "yes" : "no"}
                        onChange={(event) =>
                          patchCredentials({ mfaEnabled: event.target.value === "yes" })
                        }
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Recovery email</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.credentials.recoveryEmail}
                        onChange={(event) =>
                          patchCredentials({ recoveryEmail: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <FieldLabel>Recovery phone</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.credentials.recoveryPhone}
                        onChange={(event) =>
                          patchCredentials({ recoveryPhone: event.target.value })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel>Notes</FieldLabel>
                      <textarea
                        className={cn(inputClassName(), "min-h-[4.5rem] resize-y")}
                        value={selected.credentials.notes}
                        onChange={(event) => patchCredentials({ notes: event.target.value })}
                      />
                    </div>
                  </div>
                ) : null}

                {detailTab === "ownership" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Business owner</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.businessOwner}
                        onChange={(event) => patchSelected({ businessOwner: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Technical owner</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.technicalOwner}
                        onChange={(event) => patchSelected({ technicalOwner: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Department</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.department}
                        onChange={(event) => patchSelected({ department: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Approver</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.approver}
                        onChange={(event) => patchSelected({ approver: event.target.value })}
                      />
                    </div>
                  </div>
                ) : null}

                {detailTab === "supplier" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Supplier company</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.supplierCompany}
                        onChange={(event) => patchSelected({ supplierCompany: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Account manager</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.accountManager}
                        onChange={(event) => patchSelected({ accountManager: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Support email</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.supportEmail}
                        onChange={(event) => patchSelected({ supportEmail: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Support phone</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.supportPhone}
                        onChange={(event) => patchSelected({ supportPhone: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>Customer number</FieldLabel>
                      <input
                        className={inputClassName()}
                        value={selected.customerNumber}
                        onChange={(event) => patchSelected({ customerNumber: event.target.value })}
                      />
                    </div>
                  </div>
                ) : null}

                {detailTab === "files" ? (
                  <div className="space-y-4">
                    <SectionTitle>Attachments</SectionTitle>
                    <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <FieldLabel>Kind</FieldLabel>
                        <select
                          className={inputClassName()}
                          value={attachmentKind}
                          onChange={(event) =>
                            setAttachmentKind(event.target.value as SoftwareAttachmentKind)
                          }
                        >
                          {ATTACHMENT_KINDS.map((kind) => (
                            <option key={kind} value={kind}>
                              {kind}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busy}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-xs font-medium text-white hover:bg-white/[0.1] disabled:opacity-50"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Attach file
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void handleUploadFile(file);
                        }}
                      />
                    </div>
                    {selected.files.length === 0 ? (
                      <p className="text-sm text-white/45">No files attached yet.</p>
                    ) : (
                      <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-black/20">
                        {selected.files.map((file) => (
                          <li
                            key={file.id}
                            className="flex items-center justify-between gap-3 px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm text-white">{file.fileName}</p>
                              <p className="text-[11px] text-white/40">{file.attachmentKind}</p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <a
                                href={`/api/files/objects/${file.fileObjectId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/70 hover:bg-white/[0.06]"
                              >
                                Open
                              </a>
                              <button
                                type="button"
                                onClick={() => void handleUnlinkFile(file.id)}
                                className="rounded-lg border border-red-400/30 px-2 py-1 text-[11px] text-red-100 hover:bg-red-500/15"
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                {detailTab === "integrations" ? (
                  <div className="space-y-3">
                    <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                      Integration fields are placeholders for a future sync. No live API, webhook,
                      or OAuth connection is active yet.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel>Connected</FieldLabel>
                        <select
                          className={inputClassName()}
                          value={selected.integrationConnected ? "yes" : "no"}
                          onChange={(event) =>
                            patchSelected({ integrationConnected: event.target.value === "yes" })
                          }
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                      <div>
                        <FieldLabel>API key set</FieldLabel>
                        <select
                          className={inputClassName()}
                          value={selected.integrationApiKeySet ? "yes" : "no"}
                          onChange={(event) =>
                            patchSelected({ integrationApiKeySet: event.target.value === "yes" })
                          }
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                      <div>
                        <FieldLabel>Webhook</FieldLabel>
                        <input
                          className={inputClassName()}
                          value={selected.integrationWebhookUrl}
                          onChange={(event) =>
                            patchSelected({ integrationWebhookUrl: event.target.value })
                          }
                          placeholder="https://…"
                        />
                      </div>
                      <div>
                        <FieldLabel>OAuth status</FieldLabel>
                        <input
                          className={inputClassName()}
                          value={selected.integrationOauthStatus}
                          onChange={(event) =>
                            patchSelected({ integrationOauthStatus: event.target.value })
                          }
                          placeholder="Not connected"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <FieldLabel>Sync status</FieldLabel>
                        <input
                          className={inputClassName()}
                          value={selected.integrationSyncStatus}
                          onChange={(event) =>
                            patchSelected({ integrationSyncStatus: event.target.value })
                          }
                          placeholder="Idle"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : (
            <section className="flex min-h-[28rem] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 text-center text-sm text-white/45">
              Select a software product or add a new one to open the register detail.
            </section>
          )
        }
      />
    </div>
  );
}
