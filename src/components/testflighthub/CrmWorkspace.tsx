"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  createBlankLeadInput,
  formatLeadDate,
  canSendClientReportPdf,
  hasClientReportPptDraft,
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  leadStatusClass,
  type CrmLead,
  type LeadStatus,
} from "@/lib/crm-data";
import { cn } from "@/lib/utils";
import ResponsiveMasterDetail, { useMobileDetailPanel } from "@/components/ui/ResponsiveMasterDetail";
import DashboardTopTilesBar from "@/components/testflighthub/DashboardTopTilesBar";
import CrmLeadDiscoveryEditor from "@/components/testflighthub/CrmLeadDiscoveryEditor";
import CrmLeadLogoUpload from "@/components/testflighthub/CrmLeadLogoUpload";
import CrmLeadQuestionsPanel from "@/components/testflighthub/CrmLeadQuestionsPanel";
import CrmLeadTimelinePanel from "@/components/testflighthub/CrmLeadTimelinePanel";
import { isDiscoveryCallLead } from "@/lib/discovery-questions-data";
import {
  CRM_DASHBOARD_TILES,
  DEFAULT_CRM_TILE_LAYOUT,
} from "@/lib/view-dashboard-tile-catalogs";
import { CheckCircle2, ClipboardList, FileText, FileType, Loader2, Network, Plus, Presentation, Save, Trash2, UserPlus } from "lucide-react";

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

function leadFieldsEqual(a: CrmLead, b: CrmLead) {
  return (
    a.companyName === b.companyName &&
    a.contactName === b.contactName &&
    a.email === b.email &&
    a.phone === b.phone &&
    a.status === b.status &&
    a.source === b.source &&
    a.nextAction === b.nextAction &&
    a.nextActionDate === b.nextActionDate &&
    a.estimatedValue === b.estimatedValue &&
    a.notes === b.notes
  );
}

export default function CrmWorkspace({
  onOpenConnections,
}: {
  onOpenConnections?: () => void;
}) {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<CrmLead | null>(null);
  const [detailView, setDetailView] = useState<"record" | "discovery" | "questions">("record");
  const snapshottedIdRef = useRef<string | null>(null);
  const { showDetail, openDetail, closeDetail } = useMobileDetailPanel();

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? leads[0] ?? null,
    [leads, selectedLeadId],
  );

  const isDirty = useMemo(() => {
    if (!selectedLead) return false;
    if (!savedSnapshot || savedSnapshot.id !== selectedLead.id) return true;
    return !leadFieldsEqual(selectedLead, savedSnapshot);
  }, [selectedLead, savedSnapshot]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.set("status", statusFilter);

      const response = await fetch(`/api/crm/leads?${params.toString()}`, { cache: "no-store" });
      const data = await readApiJson<{ leads?: CrmLead[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load leads");

      const nextLeads = data.leads ?? [];
      const deepLinkLeadId = searchParams.get("leadId");
      setLeads(nextLeads);
      setSelectedLeadId((current) => {
        if (deepLinkLeadId && nextLeads.some((lead) => lead.id === deepLinkLeadId)) {
          return deepLinkLeadId;
        }
        if (current && nextLeads.some((lead) => lead.id === current)) return current;
        return nextLeads[0]?.id ?? null;
      });
      if (deepLinkLeadId && nextLeads.some((lead) => lead.id === deepLinkLeadId)) {
        openDetail();
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load leads");
      setLeads([]);
      setSelectedLeadId(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchParams, openDetail]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    setDetailView("record");
  }, [selectedLeadId]);

  useEffect(() => {
    if (!selectedLeadId) {
      snapshottedIdRef.current = null;
      setSavedSnapshot(null);
      return;
    }
    if (snapshottedIdRef.current === selectedLeadId) return;
    const lead = leads.find((item) => item.id === selectedLeadId);
    if (lead) {
      snapshottedIdRef.current = selectedLeadId;
      setSavedSnapshot({ ...lead });
    }
  }, [selectedLeadId, leads]);

  async function saveLead(lead: CrmLead) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: lead.companyName,
          contactName: lead.contactName,
          email: lead.email,
          phone: lead.phone,
          status: lead.status,
          source: lead.source,
          nextAction: lead.nextAction,
          nextActionDate: lead.nextActionDate,
          estimatedValue: lead.estimatedValue,
          notes: lead.notes,
        }),
      });

      const data = await readApiJson<{ lead?: CrmLead; error?: string }>(response);
      if (!response.ok || !data.lead) throw new Error(data.error ?? "Failed to save lead");

      setLeads((current) => current.map((item) => (item.id === data.lead!.id ? data.lead! : item)));
      snapshottedIdRef.current = data.lead.id;
      setSavedSnapshot(data.lead);
      setSaveMessage("Lead saved");
      return data.lead;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save lead");
    } finally {
      setBusy(false);
    }
  }

  function patchSelected(patch: Partial<CrmLead>) {
    if (!selectedLead) return;
    const next = { ...selectedLead, ...patch };
    setLeads((current) => current.map((lead) => (lead.id === next.id ? next : lead)));
    setSaveMessage(null);
  }

  async function handleSaveLead() {
    if (!selectedLead) return;
    setError(null);
    setSaveMessage(null);
    await saveLead(selectedLead);
  }

  async function handleAddLead() {
    setBusy(true);
    setError(null);

    const blank = createBlankLeadInput();

    try {
      const response = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...blank,
          companyName: "New Company",
          contactName: "New Contact",
        }),
      });

      const data = await readApiJson<{ lead?: CrmLead; error?: string }>(response);
      if (!response.ok || !data.lead) throw new Error(data.error ?? "Failed to create lead");

      setLeads((current) => [data.lead!, ...current]);
      setSelectedLeadId(data.lead.id);
      snapshottedIdRef.current = data.lead.id;
      setSavedSnapshot(data.lead);
      setStatusFilter("All");
      setSaveMessage("Lead created");
      openDetail();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create lead");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDiscovery(html: string) {
    if (!selectedLead) return;

    setBusy(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/crm/leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discoveryNotes: html }),
      });

      const data = await readApiJson<{ lead?: CrmLead; error?: string }>(response);
      if (!response.ok || !data.lead) throw new Error(data.error ?? "Failed to save discovery notes");

      setLeads((current) => current.map((item) => (item.id === data.lead!.id ? data.lead! : item)));
      if (savedSnapshot?.id === data.lead.id) {
        setSavedSnapshot(data.lead);
      }
      setSaveMessage("Discovery notes saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save discovery notes");
      throw saveError;
    } finally {
      setBusy(false);
    }
  }

  async function handleCommitDiscovery(html: string) {
    if (!selectedLead) {
      return { meetingsCompleted: 0, alertsCleared: 0 };
    }

    setBusy(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/crm/leads/${selectedLead.id}/commit-discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discoveryNotes: html }),
      });

      const data = await readApiJson<{
        lead?: CrmLead;
        meetingsCompleted?: number;
        alertsCleared?: number;
        transcriptsSaved?: number;
        discoveryDocumentSaved?: boolean;
        discoveryDocumentFileName?: string | null;
        warnings?: string[];
        error?: string;
      }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to commit discovery");

      if (data.lead) {
        setLeads((current) => current.map((item) => (item.id === data.lead!.id ? data.lead! : item)));
        if (savedSnapshot?.id === data.lead.id) {
          setSavedSnapshot(data.lead);
        }
      }

      const meetingsCompleted = data.meetingsCompleted ?? 0;
      const alertsCleared = data.alertsCleared ?? 0;
      const transcriptsSaved = data.transcriptsSaved ?? 0;
      const discoveryDocumentSaved = data.discoveryDocumentSaved ?? false;

      const parts: string[] = ["Discovery committed"];

      if (meetingsCompleted > 0) {
        parts.push(
          `${meetingsCompleted} meeting${meetingsCompleted === 1 ? "" : "s"} marked completed`,
        );
      }

      if (transcriptsSaved > 0) {
        parts.push(
          `${transcriptsSaved} call note${transcriptsSaved === 1 ? "" : "s"} saved to client folder`,
        );
      }

      if (discoveryDocumentSaved) {
        parts.push("discovery notes saved to client folder");
      }

      if (alertsCleared > 0) {
        parts.push(`${alertsCleared} home alert${alertsCleared === 1 ? "" : "s"} cleared`);
      }

      setSaveMessage(`${parts.join(" · ")}.`);

      if (data.warnings?.length) {
        setError(data.warnings.join(" · "));
      }

      window.dispatchEvent(new CustomEvent("internal-dashboard:refresh-alerts"));

      return { meetingsCompleted, alertsCleared };
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : "Failed to commit discovery");
      throw commitError;
    } finally {
      setBusy(false);
    }
  }

  function applyLeadUpdate(updatedLead: CrmLead) {
    setLeads((current) => current.map((item) => (item.id === updatedLead.id ? updatedLead : item)));
    if (savedSnapshot?.id === updatedLead.id) {
      setSavedSnapshot(updatedLead);
    }
  }

  async function handleReviewPowerPoint() {
    if (!selectedLead?.clientReportPptFileId) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/files/objects/${selectedLead.clientReportPptFileId}`, {
        cache: "no-store",
      });
      const data = await readApiJson<{ url?: string; error?: string }>(response);
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Failed to open PowerPoint");
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Failed to open PowerPoint");
    } finally {
      setBusy(false);
    }
  }

  async function handleGeneratePdf() {
    if (!selectedLead) return;

    if (
      !window.confirm(
        `Generate the PDF and email it to ${selectedLead.contactName} at ${selectedLead.email}? The email will include a guest chat link.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/crm/leads/${selectedLead.id}/generate-pdf`, {
        method: "POST",
      });

      const data = await readApiJson<{
        lead?: CrmLead;
        fileName?: string;
        chatUrl?: string;
        clientEmailed?: boolean;
        adminEmailed?: boolean;
        messagingUpdated?: boolean;
        alertCreated?: boolean;
        meetingsLinked?: number;
        error?: string;
      }>(response);

      if (!response.ok) throw new Error(data.error ?? "Failed to generate and send client report");

      if (data.lead) {
        applyLeadUpdate(data.lead);
      }

      const parts = ["PDF generated and saved to client folder"];
      if (data.clientEmailed) parts.push("emailed to client");
      if (data.adminEmailed) parts.push("copy sent to info@unit311central.com");
      if (data.messagingUpdated) parts.push("team chat updated");
      if (data.alertCreated) parts.push("home alert added");
      if (data.meetingsLinked) {
        parts.push(
          `${data.meetingsLinked} executive session${data.meetingsLinked === 1 ? "" : "s"} linked`,
        );
      }

      setSaveMessage(`${parts.join(" · ")}.`);

      window.dispatchEvent(new CustomEvent("internal-dashboard:refresh-alerts"));
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Failed to generate report");
    } finally {
      setBusy(false);
    }
  }

  async function handleMoveToClientDirectory() {
    if (!selectedLead) return;

    setBusy(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(`/api/crm/leads/${selectedLead.id}/promote-to-client`, {
        method: "POST",
      });
      const data = await readApiJson<{ client?: { companyName: string }; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to move lead to client directory");

      setSaveMessage(
        data.client
          ? `${data.client.companyName} added to Client Directory as Active`
          : "Lead moved to Client Directory as Active",
      );
    } catch (moveError) {
      setError(
        moveError instanceof Error ? moveError.message : "Failed to move lead to client directory",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteLead() {
    if (!selectedLead) return;
    if (!window.confirm(`Delete lead "${selectedLead.companyName}"?`)) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/crm/leads/${selectedLead.id}`, { method: "DELETE" });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to delete lead");

      const remaining = leads.filter((lead) => lead.id !== selectedLead.id);
      setLeads(remaining);
      setSelectedLeadId(remaining[0]?.id ?? null);
      if (remaining.length === 0) closeDetail();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete lead");
    } finally {
      setBusy(false);
    }
  }

  const statusCounts = useMemo(() => {
    const counts: Record<LeadStatus, number> = {
      Cold: 0,
      Warm: 0,
      Hot: 0,
      Won: 0,
      "Active Customer": 0,
      Lost: 0,
    };
    for (const lead of leads) {
      counts[lead.status] += 1;
    }
    return counts;
  }, [leads]);

  return (
    <div className="space-y-6">
      <DashboardTopTilesBar
        storageKey="unit311-crm-dashboard-tiles"
        catalog={CRM_DASHBOARD_TILES}
        defaultLayout={DEFAULT_CRM_TILE_LAYOUT}
        title="CRM key details"
        showCustomizeHint={false}
      />
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Pipeline</h3>
            <p className="mt-1 text-xs text-white/45">
              {leads.length} leads · {statusCounts.Hot} hot · {statusCounts.Warm} warm ·{" "}
              {statusCounts.Cold} cold
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {onOpenConnections && (
              <button
                type="button"
                onClick={onOpenConnections}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 text-xs font-semibold text-violet-200 transition-colors hover:border-violet-400/60 hover:bg-violet-500/25"
              >
                <Network className="h-3.5 w-3.5" />
                Connections
              </button>
            )}
            <div className="min-w-[180px]">
              <FieldLabel>Filter by status</FieldLabel>
            <select
              className={inputClassName()}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as LeadStatus | "All")}
            >
              <option value="All">All statuses</option>
              {LEAD_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            </div>
          </div>
        </div>
      </section>

      {saveMessage && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {saveMessage}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
          {error.includes("crm_leads") && (
            <p className="mt-1 text-xs text-red-200/70">
              Run{" "}
              <span className="font-mono">supabase/migrations/004_create_crm_leads.sql</span> and{" "}
              <span className="font-mono">060_crm_leads_discovery_notes.sql</span> in Supabase SQL
              Editor.
            </p>
          )}
        </div>
      )}

      <ResponsiveMasterDetail
        showDetail={showDetail && !!selectedLead}
        onBack={closeDetail}
        backLabel="Back to leads"
        master={
        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Leads</h2>
              <p className="mt-1 text-xs text-white/45">{leads.length} in view</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAddLead()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              New lead
            </button>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center gap-3 text-sm text-white/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading leads…
            </div>
          ) : leads.length === 0 ? (
            <p className="mt-6 text-sm text-white/45">
              No leads yet. Add your first prospect to start tracking outreach.
            </p>
          ) : (
            <ul className="mt-4 max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {leads.map((lead) => {
                const selected = lead.id === selectedLead?.id;

                return (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeadId(lead.id);
                        openDetail();
                      }}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                        selected
                          ? "border-sky-400/40 bg-sky-500/10 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.15)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {lead.companyName}
                          </p>
                          <p className="mt-1 text-xs text-white/45">{lead.contactName}</p>
                          {lead.nextAction && (
                            <p className="mt-1 truncate text-[11px] text-white/35">
                              Next: {lead.nextAction}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-start gap-1.5">
                          <CrmLeadLogoUpload
                            lead={lead}
                            busy={busy}
                            compact
                            onUploaded={applyLeadUpdate}
                            onError={setError}
                          />
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                              leadStatusClass(lead.status),
                            )}
                          >
                            {lead.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        }
        detail={
        selectedLead ? (
          <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
            {detailView === "discovery" ? (
              <CrmLeadDiscoveryEditor
                companyName={selectedLead.companyName}
                initialHtml={selectedLead.discoveryNotes}
                busy={busy}
                onBack={() => setDetailView("record")}
                onSave={handleSaveDiscovery}
                onCommit={handleCommitDiscovery}
                onReviewPowerPoint={() => void handleReviewPowerPoint()}
                onGeneratePdf={() => void handleGeneratePdf()}
                canGeneratePdf={Boolean(selectedLead.email.trim())}
                showReviewPowerPoint={
                  hasClientReportPptDraft(selectedLead) && !selectedLead.clientReportSentAt
                }
                showGeneratePdf={canSendClientReportPdf(selectedLead)}
              />
            ) : detailView === "questions" ? (
              <CrmLeadQuestionsPanel
                leadId={selectedLead.id}
                companyName={selectedLead.companyName}
                lead={selectedLead}
                onBack={() => setDetailView("record")}
                busy={busy}
                onLeadUpdated={applyLeadUpdate}
                onReviewPowerPoint={() => void handleReviewPowerPoint()}
                onGeneratePdf={() => void handleGeneratePdf()}
                showReviewPowerPoint={
                  hasClientReportPptDraft(selectedLead) && !selectedLead.clientReportSentAt
                }
                showGeneratePdf={canSendClientReportPdf(selectedLead)}
              />
            ) : (
              <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                  Lead record
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">{selectedLead.companyName}</h2>
                <p className="mt-1 text-sm text-white/50">{selectedLead.contactName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                    leadStatusClass(selectedLead.status),
                  )}
                >
                  {selectedLead.status}
                </span>
                {selectedLead.needsManualReview ? (
                  <span
                    className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100"
                    title={selectedLead.manualReviewReason || "Needs manual review"}
                  >
                    Manual review
                  </span>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDetailView("discovery")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 text-xs font-semibold text-violet-200 transition-colors hover:border-violet-400/60 hover:bg-violet-500/25 disabled:opacity-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Discovery
                </button>
                {isDiscoveryCallLead(selectedLead) ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDetailView("questions")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Questions
                  </button>
                ) : null}
                {hasClientReportPptDraft(selectedLead) && !selectedLead.clientReportSentAt ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleReviewPowerPoint()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 text-xs font-semibold text-violet-100 transition-colors hover:border-violet-400/60 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Open the PowerPoint draft in the client folder"
                  >
                    <Presentation className="h-3.5 w-3.5" />
                    Review PowerPoint
                  </button>
                ) : null}
                {canSendClientReportPdf(selectedLead) ? (
                  <button
                    type="button"
                    disabled={busy || !selectedLead.email.trim()}
                    onClick={() => void handleGeneratePdf()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 text-xs font-semibold text-amber-100 transition-colors hover:border-amber-400/60 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Generate PDF, email the client, and open the guest chat channel"
                  >
                    <FileType className="h-3.5 w-3.5" />
                    Generate PDF
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleMoveToClientDirectory()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-xs font-semibold text-sky-200 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25 disabled:opacity-50"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Move to Client Directory
                </button>
                <button
                  type="button"
                  disabled={busy || !isDirty}
                  onClick={() => void handleSaveLead()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDeleteLead()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-400/20 px-3 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel>Company</FieldLabel>
                <input
                  className={inputClassName()}
                  value={selectedLead.companyName}
                  onChange={(event) => patchSelected({ companyName: event.target.value })}
                  disabled={busy}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Company logo</FieldLabel>
                <CrmLeadLogoUpload
                  lead={selectedLead}
                  busy={busy}
                  onUploaded={applyLeadUpdate}
                  onError={setError}
                />
              </div>
              <div>
                <FieldLabel>Contact name</FieldLabel>
                <input
                  className={inputClassName()}
                  value={selectedLead.contactName}
                  onChange={(event) => patchSelected({ contactName: event.target.value })}
                  disabled={busy}
                />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select
                  className={inputClassName()}
                  value={selectedLead.status}
                  onChange={(event) =>
                    patchSelected({ status: event.target.value as LeadStatus })
                  }
                  disabled={busy}
                >
                  {LEAD_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <input
                  type="email"
                  className={inputClassName()}
                  value={selectedLead.email}
                  onChange={(event) => patchSelected({ email: event.target.value })}
                  disabled={busy}
                />
              </div>
              <div>
                <FieldLabel>Phone</FieldLabel>
                <input
                  className={inputClassName()}
                  value={selectedLead.phone}
                  onChange={(event) => patchSelected({ phone: event.target.value })}
                  disabled={busy}
                />
              </div>
              <div>
                <FieldLabel>Source</FieldLabel>
                <select
                  className={inputClassName()}
                  value={selectedLead.source || LEAD_SOURCE_OPTIONS[0]}
                  onChange={(event) => patchSelected({ source: event.target.value })}
                  disabled={busy}
                >
                  {Array.from(
                    new Set([selectedLead.source, ...LEAD_SOURCE_OPTIONS].filter(Boolean)),
                  ).map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Estimated value (EUR)</FieldLabel>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  className={inputClassName()}
                  value={selectedLead.estimatedValue ?? ""}
                  onChange={(event) =>
                    patchSelected({
                      estimatedValue: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  disabled={busy}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Next action</FieldLabel>
                <input
                  className={inputClassName()}
                  value={selectedLead.nextAction}
                  onChange={(event) => patchSelected({ nextAction: event.target.value })}
                  placeholder="e.g. Send proposal, book demo call…"
                  disabled={busy}
                />
              </div>
              <div>
                <FieldLabel>Next action date</FieldLabel>
                <input
                  type="date"
                  className={inputClassName()}
                  value={selectedLead.nextActionDate ?? ""}
                  onChange={(event) =>
                    patchSelected({ nextActionDate: event.target.value || null })
                  }
                  disabled={busy}
                />
              </div>
              <div>
                <FieldLabel>Last updated</FieldLabel>
                <p className={cn(inputClassName(), "mt-1.5 flex items-center text-white/55")}>
                  {formatLeadDate(selectedLead.updatedAt)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Client report</FieldLabel>
                <div className="mt-1.5 rounded-xl border border-white/10 bg-[#0b1524] px-3 py-3 text-sm text-white/75">
                  {selectedLead.clientReportGeneratedAt ? (
                    <div className="space-y-2">
                      <p>
                        <span className="text-white/45">Draft generated:</span>{" "}
                        {formatLeadDate(selectedLead.clientReportGeneratedAt)}
                      </p>
                      {selectedLead.clientReportFileName ? (
                        <p>
                          <span className="text-white/45">PDF:</span>{" "}
                          {selectedLead.clientReportFileName}
                        </p>
                      ) : null}
                      {selectedLead.clientReportPptFileName ? (
                        <p>
                          <span className="text-white/45">PowerPoint:</span>{" "}
                          {selectedLead.clientReportPptFileName}
                        </p>
                      ) : null}
                      {selectedLead.clientReportSentAt ? (
                        <p>
                          <span className="text-white/45">PDF sent:</span>{" "}
                          {formatLeadDate(selectedLead.clientReportSentAt)}
                        </p>
                      ) : (
                        <p className="text-amber-200/90">
                          Review the PowerPoint in the client folder, make any corrections, then click
                          Generate PDF to email the client.
                        </p>
                      )}
                      {selectedLead.clientReportRepliedAt ? (
                        <p>
                          <span className="text-white/45">Client replied:</span>{" "}
                          {formatLeadDate(selectedLead.clientReportRepliedAt)}
                        </p>
                      ) : selectedLead.clientReportSentAt ? (
                        <p className="text-white/55">
                          Awaiting client reply to info@ — reminders at 7 days and again 14 days later
                          if no response.
                        </p>
                      ) : null}
                      {selectedLead.clientReportLastReminderSentAt ? (
                        <p>
                          <span className="text-white/45">Last email reminder:</span>{" "}
                          {formatLeadDate(selectedLead.clientReportLastReminderSentAt)}
                        </p>
                      ) : null}
                      {selectedLead.clientChatAccessToken && selectedLead.clientReportSentAt ? (
                        <p className="break-all text-xs text-sky-300/90">
                          Guest chat: /report-chat/{selectedLead.clientChatAccessToken}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-white/45">
                      No client report yet. Save discovery questions to auto-generate a PowerPoint
                      draft in the client folder, then use Generate PDF to email the client.
                    </p>
                  )}
                </div>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Notes</FieldLabel>
                <textarea
                  rows={4}
                  className={cn(inputClassName(), "resize-y")}
                  value={selectedLead.notes}
                  onChange={(event) => patchSelected({ notes: event.target.value })}
                  disabled={busy}
                />
              </div>
              {selectedLead.originalEnquirySubmittedAt ||
              selectedLead.originalEnquiryMessage ||
              selectedLead.source === "Website Contact Form" ? (
                <div className="sm:col-span-2 space-y-3 rounded-xl border border-sky-400/20 bg-sky-500/[0.06] p-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
                      Original Website Enquiry
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      First contact form submission — not overwritten by later enquiries.
                    </p>
                  </div>
                  {selectedLead.originalEnquirySubmittedAt ? (
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                          Subject
                        </dt>
                        <dd className="mt-1 text-white">
                          {selectedLead.originalEnquirySubject || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                          Message
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap text-white/85">
                          {selectedLead.originalEnquiryMessage || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-[0.12em] text-white/40">
                          Date Submitted
                        </dt>
                        <dd className="mt-1 text-white/80">
                          {formatLeadDate(selectedLead.originalEnquirySubmittedAt)}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-white/45">
                      Original enquiry details are not available for this lead yet.
                    </p>
                  )}
                </div>
              ) : null}
              <CrmLeadTimelinePanel leadId={selectedLead.id} />
            </div>
              </>
            )}
          </section>
        ) : !loading ? (
          <section className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] p-6 text-sm text-white/45">
            Select a lead or create a new one to get started.
          </section>
        ) : null
        }
      />
    </div>
  );
}
