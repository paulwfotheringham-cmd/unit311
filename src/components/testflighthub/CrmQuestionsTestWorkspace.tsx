"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import CrmLeadQuestionsPanel from "@/components/testflighthub/CrmLeadQuestionsPanel";
import { formatLeadDate, leadStatusClass, type CrmLead } from "@/lib/crm-data";
import { isDiscoveryCallLead } from "@/lib/discovery-questions-data";
import { cn } from "@/lib/utils";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

export default function CrmQuestionsTestWorkspace() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? leads[0] ?? null,
    [leads, selectedLeadId],
  );

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/crm/leads", { cache: "no-store" });
      const data = await readApiJson<{ leads?: CrmLead[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load leads");

      const nextLeads = data.leads ?? [];
      setLeads(nextLeads);
      setSelectedLeadId((current) => {
        if (current && nextLeads.some((lead) => lead.id === current)) return current;
        return nextLeads[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load leads");
      setLeads([]);
      setSelectedLeadId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Test workspace only — not shown in dashboard navigation. Use this page to validate the
        discovery questionnaire before wiring the live CRM Questions button.
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
          <div>
            <h2 className="text-lg font-semibold text-white">CRM leads</h2>
            <p className="mt-1 text-xs text-white/45">Pick a lead to edit discovery questions</p>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center gap-3 text-sm text-white/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading leads…
            </div>
          ) : leads.length === 0 ? (
            <p className="mt-6 text-sm text-white/45">No CRM leads available yet.</p>
          ) : (
            <ul className="mt-4 max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {leads.map((lead) => {
                const selected = lead.id === selectedLead?.id;
                const discoveryCall = isDiscoveryCallLead(lead);

                return (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                        selected
                          ? "border-emerald-400/40 bg-emerald-500/10 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.15)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {lead.companyName}
                          </p>
                          <p className="mt-1 text-xs text-white/45">{lead.contactName}</p>
                          <p className="mt-1 text-[11px] text-white/35">
                            Updated {formatLeadDate(lead.updatedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
                              leadStatusClass(lead.status),
                            )}
                          >
                            {lead.status}
                          </span>
                          {discoveryCall ? (
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                              Discovery
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
          {selectedLead ? (
            <CrmLeadQuestionsPanel
              key={selectedLead.id}
              leadId={selectedLead.id}
              companyName={selectedLead.companyName}
            />
          ) : (
            <p className="text-sm text-white/45">Select a CRM lead to open the questionnaire.</p>
          )}
        </section>
      </div>
    </div>
  );
}
