"use client";

import { useCallback, useEffect, useMemo, useState, Fragment, startTransition } from "react";

import {
  COMPETITOR_REGIONS,
  type Competitor,
  type CompetitorRegion,
} from "@/lib/competitors-data";
import {
  inferServiceCategoriesFromText,
  parseServiceCategories,
  serializeServiceCategories,
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_ORDER,
  sortCompetitorsByRevenue,
  type ServiceCategory,
} from "@/lib/competitors-utils";
import { cn } from "@/lib/utils";
import {
  Check,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

async function readApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

type CompetitorDraft = Pick<
  Competitor,
  "companyName" | "website" | "droneTechnology" | "lastRevenue" | "notes"
> & {
  serviceCategories: ServiceCategory[];
};

type RegionOption = {
  id: CompetitorRegion;
  title: string;
  subtitle: string;
};

const CUSTOM_REGIONS_STORAGE_KEY = "unit311-custom-competitor-regions";

function slugifyRegionId(name: string): CompetitorRegion {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return (slug || "custom") as CompetitorRegion;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function cellInputClassName() {
  return "w-full rounded-lg border border-white/10 bg-[#0b1524] px-2.5 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
}

function selectClassName() {
  return "h-10 w-full min-w-[160px] rounded-xl border border-white/10 bg-[#0b1524] px-3 text-sm text-white outline-none transition-colors focus:border-sky-400/50 sm:w-auto";
}

function formatWebsiteHref(website: string) {
  const trimmed = website.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function serviceBadgeLabel(category: ServiceCategory) {
  return SERVICE_CATEGORY_LABELS[category];
}

function serviceBadgeClass(category: ServiceCategory) {
  switch (category) {
    case "surveying":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "inspection":
      return "border-sky-400/30 bg-sky-500/10 text-sky-200";
    case "media":
      return "border-violet-400/30 bg-violet-500/10 text-violet-200";
    default:
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  }
}

function resolveServiceCategories(competitor: Competitor) {
  const parsed = parseServiceCategories(competitor.serviceCategories);
  if (parsed.length > 0) return parsed;
  return inferServiceCategoriesFromText(competitor.services);
}

function formatWebsiteDisplay(website: string) {
  const trimmed = website.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(formatWebsiteHref(trimmed) ?? trimmed);
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

const TABLE_MIN_WIDTH = "min-w-[96rem]";

export default function CompetitorsWorkspace() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<CompetitorRegion>("uk");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CompetitorDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customRegions, setCustomRegions] = useState<RegionOption[]>([]);
  const [newRegionName, setNewRegionName] = useState("");

  const regionOptions = useMemo(() => {
    const merged = new Map<string, RegionOption>();
    for (const region of COMPETITOR_REGIONS) merged.set(region.id, region);
    for (const region of customRegions) merged.set(region.id, region);
    return Array.from(merged.values());
  }, [customRegions]);

  const regionMeta = useMemo(
    () => regionOptions.find((region) => region.id === selectedRegion) ?? regionOptions[0],
    [regionOptions, selectedRegion],
  );

  const regionCompetitors = useMemo(
    () =>
      sortCompetitorsByRevenue(
        competitors.filter((competitor) => competitor.region === selectedRegion),
      ),
    [competitors, selectedRegion],
  );

  const loadCompetitors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/competitors", { cache: "no-store" });
      const data = await readApiJson<{ competitors?: Competitor[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to load competitors");
      setCompetitors(data.competitors ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load competitors");
      setCompetitors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadCompetitors();
    });
  }, [loadCompetitors]);

  useEffect(() => {
    startTransition(() => {
      try {
        const stored = window.localStorage.getItem(CUSTOM_REGIONS_STORAGE_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored) as RegionOption[];
        if (Array.isArray(parsed)) setCustomRegions(parsed);
      } catch {
        setCustomRegions([]);
      }
    });
  }, []);

  useEffect(() => {
    startTransition(() => {
      setEditingId(null);
      setDraft(null);
    });
  }, [selectedRegion]);

  function startEdit(competitor: Competitor) {
    setEditingId(competitor.id);
    setDraft({
      companyName: competitor.companyName,
      website: competitor.website,
      droneTechnology: competitor.droneTechnology,
      serviceCategories: resolveServiceCategories(competitor),
      lastRevenue: competitor.lastRevenue,
      notes: competitor.notes,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function patchDraft(patch: Partial<CompetitorDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function toggleDraftCategory(category: ServiceCategory) {
    setDraft((current) => {
      if (!current) return current;
      const selected = new Set(current.serviceCategories);
      if (selected.has(category)) selected.delete(category);
      else selected.add(category);
      return {
        ...current,
        serviceCategories: SERVICE_CATEGORY_ORDER.filter((item) => selected.has(item)),
      };
    });
  }

  function handleAddRegion() {
    const trimmed = newRegionName.trim();
    if (!trimmed) return;

    const id = slugifyRegionId(trimmed);
    const nextRegion: RegionOption = { id, title: trimmed, subtitle: "" };
    const exists = regionOptions.some(
      (region) => region.id === id || region.title.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      setSelectedRegion(id);
      setNewRegionName("");
      return;
    }

    const nextRegions = [nextRegion, ...customRegions];
    setCustomRegions(nextRegions);
    window.localStorage.setItem(CUSTOM_REGIONS_STORAGE_KEY, JSON.stringify(nextRegions));
    setSelectedRegion(id);
    setNewRegionName("");
  }

  async function saveEdit(competitorId: string) {
    if (!draft) return;

    setSavingId(competitorId);
    setError(null);

    try {
      const response = await fetch(`/api/competitors/${competitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: draft.companyName,
          website: draft.website,
          services: draft.serviceCategories
            .map((category) => SERVICE_CATEGORY_LABELS[category])
            .join(", "),
          serviceCategories: serializeServiceCategories(draft.serviceCategories),
          droneTechnology: draft.droneTechnology,
          lastRevenue: draft.lastRevenue,
          notes: draft.notes,
        }),
      });

      const data = await readApiJson<{ competitor?: Competitor; error?: string }>(response);
      if (!response.ok || !data.competitor) throw new Error(data.error ?? "Failed to save");

      setCompetitors((current) =>
        current.map((row) => (row.id === data.competitor!.id ? data.competitor! : row)),
      );
      cancelEdit();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save");
    } finally {
      setSavingId(null);
    }
  }

  async function handleAddCompetitor() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: selectedRegion }),
      });

      const data = await readApiJson<{ competitor?: Competitor; error?: string }>(response);
      if (!response.ok || !data.competitor) throw new Error(data.error ?? "Failed to create competitor");

      setCompetitors((current) => [data.competitor!, ...current]);
      startEdit(data.competitor!);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create competitor");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCompetitor(competitor: Competitor) {
    if (!window.confirm(`Delete "${competitor.companyName}"?`)) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/competitors/${competitor.id}`, { method: "DELETE" });
      const data = await readApiJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error ?? "Failed to delete competitor");

      setCompetitors((current) => current.filter((item) => item.id !== competitor.id));
      if (editingId === competitor.id) cancelEdit();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete competitor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-end justify-end gap-4">
          <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
            <div className="min-w-[160px] flex-1 sm:flex-none">
              <FieldLabel>Country</FieldLabel>
              <select
                value={selectedRegion}
                onChange={(event) => setSelectedRegion(event.target.value as CompetitorRegion)}
                className={selectClassName()}
              >
                {regionOptions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[12rem] flex-1 sm:flex-none">
              <FieldLabel>Add country/region</FieldLabel>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={newRegionName}
                  onChange={(event) => setNewRegionName(event.target.value)}
                  placeholder="e.g. France"
                  className={cellInputClassName()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddRegion();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddRegion}
                  disabled={!newRegionName.trim()}
                  className="inline-flex h-10 shrink-0 items-center rounded-xl border border-white/10 px-3 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.05] disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleAddCompetitor()}
              disabled={busy}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 text-sm font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.04] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div>
            <h3 className="text-sm font-semibold text-white sm:text-[15px]">{regionMeta.title}</h3>
            {regionMeta.subtitle ? (
              <p className="mt-0.5 text-xs text-white/45">{regionMeta.subtitle}</p>
            ) : null}
          </div>
          <p className="text-xs text-white/45">
            {loading ? "Loading…" : `${regionCompetitors.length} listed · ranked by revenue`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-4 py-10 text-sm text-white/55 sm:px-5">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading competitors…
          </div>
        ) : regionCompetitors.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-white/40 sm:px-5">
            No competitors listed for {regionMeta.title} yet. Click Add to create one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={cn("w-full table-fixed border-collapse text-left", TABLE_MIN_WIDTH)}>
              <colgroup>
                <col className="min-w-[14rem] w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-[22%]" />
                <col className="w-[18%]" />
                <col className="w-[10%]" />
                <col className="w-[14%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
                  <th className="px-4 py-2.5 font-medium sm:px-5" scope="col">
                    Name
                  </th>
                  <th className="px-4 py-2.5 font-medium sm:px-5" scope="col">
                    Website
                  </th>
                  <th className="px-4 py-2.5 font-medium sm:px-5" scope="col">
                    Services
                  </th>
                  <th className="px-4 py-2.5 font-medium sm:px-5" scope="col">
                    Drone technology
                  </th>
                  <th className="px-4 py-2.5 font-medium sm:px-5" scope="col">
                    Revenue
                  </th>
                  <th className="px-4 py-2.5 font-medium sm:px-5" scope="col">
                    Notes
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium sm:px-5" scope="col">
                    Edit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {regionCompetitors.map((competitor) => {
                  const isEditing = editingId === competitor.id;
                  const href = formatWebsiteHref(isEditing ? draft?.website ?? "" : competitor.website);
                  const row = isEditing && draft ? draft : competitor;
                  const categories = isEditing && draft
                    ? draft.serviceCategories
                    : resolveServiceCategories(competitor);

                  return (
                    <Fragment key={competitor.id}>
                      <tr className="align-top">
                      <td className="min-w-[14rem] px-4 py-3 sm:px-5">
                        {isEditing ? (
                          <input
                            value={row.companyName}
                            onChange={(event) => patchDraft({ companyName: event.target.value })}
                            className={cellInputClassName()}
                          />
                        ) : (
                          <p className="text-sm font-semibold leading-snug text-white">
                            {competitor.companyName}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 sm:px-5">
                        {isEditing ? (
                          <input
                            value={row.website}
                            onChange={(event) => patchDraft({ website: event.target.value })}
                            placeholder="example.com"
                            className={cellInputClassName()}
                          />
                        ) : href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={competitor.website.trim()}
                            className="group inline-flex max-w-full items-start gap-1.5 text-sm text-sky-300 underline decoration-sky-400/40 underline-offset-2 transition-colors hover:text-sky-200"
                          >
                            <span className="min-w-0 break-all leading-snug">
                              {formatWebsiteDisplay(competitor.website)}
                            </span>
                            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                          </a>
                        ) : (
                          <p className="text-sm text-white/45">—</p>
                        )}
                      </td>

                      <td className="px-4 py-3 sm:px-5">
                        {isEditing ? (
                          <div className="flex flex-wrap gap-1.5">
                            {SERVICE_CATEGORY_ORDER.map((category) => {
                              const selected = draft?.serviceCategories.includes(category) ?? false;
                              return (
                                <button
                                  key={category}
                                  type="button"
                                  title={SERVICE_CATEGORY_LABELS[category]}
                                  onClick={() => toggleDraftCategory(category)}
                                  className={cn(
                                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] transition-colors",
                                    selected
                                      ? serviceBadgeClass(category)
                                      : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20",
                                  )}
                                >
                                  {serviceBadgeLabel(category)}
                                </button>
                              );
                            })}
                          </div>
                        ) : categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {categories.map((category) => (
                              <span
                                key={category}
                                title={SERVICE_CATEGORY_LABELS[category]}
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.04em]",
                                  serviceBadgeClass(category),
                                )}
                              >
                                {serviceBadgeLabel(category)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span
                            title="Other"
                            className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-amber-200"
                          >
                            Other
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 sm:px-5">
                        {isEditing ? (
                          <input
                            value={draft?.droneTechnology ?? ""}
                            onChange={(event) => patchDraft({ droneTechnology: event.target.value })}
                            placeholder="e.g. DJI Matrice 350 RTK"
                            className={cellInputClassName()}
                          />
                        ) : (
                          <p className="text-sm leading-snug text-white/65">
                            {competitor.droneTechnology.trim() || "—"}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 sm:px-5">
                        {isEditing ? (
                          <input
                            value={row.lastRevenue}
                            onChange={(event) => patchDraft({ lastRevenue: event.target.value })}
                            placeholder="e.g. £2.4M (2024)"
                            className={cellInputClassName()}
                          />
                        ) : (
                          <p className="text-sm font-medium leading-snug text-white/80">
                            {competitor.lastRevenue.trim() || "—"}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 sm:px-5">
                        {isEditing ? (
                          <textarea
                            value={draft?.notes ?? ""}
                            rows={3}
                            onChange={(event) => patchDraft({ notes: event.target.value })}
                            placeholder="Intel, pricing, strengths, weaknesses…"
                            className={cn(cellInputClassName(), "min-h-[4.5rem] resize-y")}
                          />
                        ) : (
                          <p
                            className={cn(
                              "text-sm leading-snug text-white/65",
                              competitor.notes.trim() ? "whitespace-pre-wrap" : "text-white/45",
                            )}
                          >
                            {competitor.notes.trim() || "—"}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void saveEdit(competitor.id)}
                                disabled={savingId === competitor.id}
                                className="rounded-lg border border-sky-500/40 bg-sky-500/15 p-2 text-sky-300 transition-colors hover:bg-sky-500/25 disabled:opacity-50"
                                aria-label={`Save ${competitor.companyName}`}
                              >
                                {savingId === competitor.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-lg border border-white/10 p-2 text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white"
                                aria-label="Cancel edit"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(competitor)}
                                className="rounded-lg border border-white/10 p-2 text-white/45 transition-colors hover:border-sky-400/30 hover:bg-sky-500/10 hover:text-sky-200"
                                aria-label={`Edit ${competitor.companyName}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteCompetitor(competitor)}
                                disabled={busy}
                                className="rounded-lg border border-white/10 p-2 text-white/45 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200 disabled:opacity-50"
                                aria-label={`Delete ${competitor.companyName}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
