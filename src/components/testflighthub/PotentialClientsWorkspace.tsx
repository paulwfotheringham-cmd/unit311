"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Check,
  Globe2,
  Pencil,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";

import {
  DEFAULT_POTENTIAL_CLIENTS_COUNTRY_ID,
  formatPotentialClientsCount,
  formatPotentialClientsPercent,
  isPotentialClientsCountryId,
  POTENTIAL_CLIENTS_COUNTRIES,
  type PotentialClientsCountryId,
  type PotentialClientsCountrySnapshot,
  type PotentialClientsIndustryCategory,
} from "@/lib/potential-clients-data";
import { cn } from "@/lib/utils";

type EditableSection = "intro" | "summary" | "country" | "industries" | null;

type IntroContent = {
  eyebrow: string;
  title: string;
  description: string;
};

function panelClassName() {
  return "rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_16px_48px_rgba(0,0,0,0.28)]";
}

function metricCardClassName() {
  return "rounded-xl border border-white/10 bg-[#0b1524]/70 px-4 py-3";
}

function inputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
}

function numberInputClassName() {
  return cn(
    inputClassName(),
    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

function EditSectionButton({
  editing,
  onEdit,
  onSave,
  onCancel,
}: {
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (editing) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 text-[11px] font-semibold text-white/70 hover:bg-white/[0.08]"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/25"
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 text-[11px] font-semibold text-white/70 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
    >
      <Pencil className="h-3.5 w-3.5" />
      Edit
    </button>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Building2;
}) {
  return (
    <div className={metricCardClassName()}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-white/45">{hint}</p> : null}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-500/10">
          <Icon className="h-4 w-4 text-sky-300" />
        </div>
      </div>
    </div>
  );
}

function cloneCountries(source: PotentialClientsCountrySnapshot[]) {
  return source.map((country) => ({
    ...country,
    industries: country.industries.map((industry) => ({ ...industry })),
    source: { ...country.source },
  }));
}

export default function PotentialClientsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [countries, setCountries] = useState(() => cloneCountries(POTENTIAL_CLIENTS_COUNTRIES));
  const [intro, setIntro] = useState<IntroContent>({
    eyebrow: "Strategy · Market sizing",
    title: "Potential Clients",
    description:
      "Target markets for Unit311 outreach in English. Use the country tabs below for detail; the summary table compares all eight markets on 2025 formation and SME metrics.",
  });

  const [editingSection, setEditingSection] = useState<EditableSection>(null);
  const [draftIntro, setDraftIntro] = useState<IntroContent | null>(null);
  const [draftCountries, setDraftCountries] = useState<PotentialClientsCountrySnapshot[] | null>(
    null,
  );

  const selectedCountryId = useMemo(() => {
    const fromUrl = searchParams.get("country");
    return isPotentialClientsCountryId(fromUrl)
      ? fromUrl
      : DEFAULT_POTENTIAL_CLIENTS_COUNTRY_ID;
  }, [searchParams]);

  const selectCountry = useCallback(
    (countryId: PotentialClientsCountryId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", "potential-clients");
      params.set("country", countryId);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const workingCountries = draftCountries ?? countries;

  const country = useMemo(
    () => workingCountries.find((entry) => entry.id === selectedCountryId)!,
    [workingCountries, selectedCountryId],
  );

  const summaryTotals = useMemo(
    () =>
      workingCountries.reduce(
        (totals, entry) => ({
          startups2025: totals.startups2025 + entry.startups2025,
          startups2025MultiDirector:
            totals.startups2025MultiDirector + entry.startups2025MultiDirector,
          startupsFundedOver100k:
            totals.startupsFundedOver100k + entry.startupsFundedOver100k,
          smesOver6Months: totals.smesOver6Months + entry.smesOver6Months,
          smesEmployees10to200: totals.smesEmployees10to200 + entry.smesEmployees10to200,
        }),
        {
          startups2025: 0,
          startups2025MultiDirector: 0,
          startupsFundedOver100k: 0,
          smesOver6Months: 0,
          smesEmployees10to200: 0,
        },
      ),
    [workingCountries],
  );

  const multiDirectorRate =
    country.startups2025 > 0
      ? (country.startups2025MultiDirector / country.startups2025) * 100
      : 0;
  const fundedRate =
    country.startups2025 > 0
      ? (country.startupsFundedOver100k / country.startups2025) * 100
      : 0;

  function beginEdit(section: EditableSection) {
    if (section === "intro") {
      setDraftIntro({ ...intro });
      setDraftCountries(null);
    } else {
      setDraftCountries(cloneCountries(countries));
      setDraftIntro(null);
    }
    setEditingSection(section);
  }

  function cancelEdit() {
    setEditingSection(null);
    setDraftIntro(null);
    setDraftCountries(null);
  }

  function saveEdit() {
    if (editingSection === "intro" && draftIntro) {
      setIntro(draftIntro);
    }
    if (
      (editingSection === "summary" ||
        editingSection === "country" ||
        editingSection === "industries") &&
      draftCountries
    ) {
      setCountries(cloneCountries(draftCountries));
    }
    setEditingSection(null);
    setDraftIntro(null);
    setDraftCountries(null);
  }

  function updateDraftCountry(
    countryId: PotentialClientsCountryId,
    patch: Partial<PotentialClientsCountrySnapshot>,
  ) {
    setDraftCountries((current) => {
      if (!current) return current;
      return current.map((entry) =>
        entry.id === countryId ? { ...entry, ...patch } : entry,
      );
    });
  }

  function updateDraftMetric(
    countryId: PotentialClientsCountryId,
    field:
      | "startups2025"
      | "startups2025MultiDirector"
      | "startupsFundedOver100k"
      | "smesOver6Months"
      | "smesEmployees10to200",
    value: string,
  ) {
    const parsed = Number(value.replace(/,/g, ""));
    updateDraftCountry(countryId, {
      [field]: Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0,
    });
  }

  function updateDraftIndustry(
    industryId: string,
    patch: Partial<PotentialClientsIndustryCategory>,
  ) {
    setDraftCountries((current) => {
      if (!current) return current;
      return current.map((entry) => {
        if (entry.id !== selectedCountryId) return entry;
        return {
          ...entry,
          industries: entry.industries.map((industry) =>
            industry.id === industryId ? { ...industry, ...patch } : industry,
          ),
        };
      });
    });
  }

  const displayIntro = draftIntro ?? intro;

  return (
    <div className="space-y-4">
      <section className={cn(panelClassName(), "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editingSection === "intro" && draftIntro ? (
              <div className="space-y-3">
                <div>
                  <FieldLabel>Eyebrow</FieldLabel>
                  <input
                    className={inputClassName()}
                    value={draftIntro.eyebrow}
                    onChange={(event) =>
                      setDraftIntro({ ...draftIntro, eyebrow: event.target.value })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Title</FieldLabel>
                  <input
                    className={inputClassName()}
                    value={draftIntro.title}
                    onChange={(event) =>
                      setDraftIntro({ ...draftIntro, title: event.target.value })
                    }
                  />
                </div>
                <div>
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    rows={3}
                    className={cn(inputClassName(), "resize-y")}
                    value={draftIntro.description}
                    onChange={(event) =>
                      setDraftIntro({ ...draftIntro, description: event.target.value })
                    }
                  />
                </div>
              </div>
            ) : displayIntro.description ? (
              <p className="max-w-3xl text-sm text-white/60">{displayIntro.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55">
              <Globe2 className="h-4 w-4 text-sky-300" />
              {workingCountries.length} countries · English
            </div>
            <EditSectionButton
              editing={editingSection === "intro"}
              onEdit={() => beginEdit("intro")}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
          </div>
        </div>
      </section>

      <section className={cn(panelClassName(), "overflow-hidden")}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">All countries summary</h3>
            <p className="mt-1 text-xs text-white/50">
              Combined view across United States, Canada, United Kingdom, France, Germany, South
              Korea, Japan, and Australia.
            </p>
          </div>
          <EditSectionButton
            editing={editingSection === "summary"}
            onEdit={() => beginEdit("summary")}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">
                <th className="px-5 py-2.5 font-medium sm:px-6">Country</th>
                <th className="px-3 py-2.5 font-medium text-right">New registrations</th>
                <th className="px-3 py-2.5 font-medium text-right">Multi-director</th>
                <th className="px-3 py-2.5 font-medium text-right">Funded &gt;$100k</th>
                <th className="px-3 py-2.5 font-medium text-right">SMEs 6mo+</th>
                <th className="px-5 py-2.5 font-medium text-right sm:px-6">SMEs 10–200</th>
              </tr>
            </thead>
            <tbody>
              {workingCountries.map((entry) => {
                const active = entry.id === selectedCountryId;
                const editingSummary = editingSection === "summary";
                return (
                  <tr
                    key={entry.id}
                    className={cn(
                      "border-b border-white/[0.05] last:border-0",
                      active && "bg-emerald-500/[0.06]",
                    )}
                  >
                    <td className="px-5 py-2.5 font-medium text-white/90 sm:px-6">
                      <button
                        type="button"
                        onClick={() => selectCountry(entry.id)}
                        className={cn(
                          "text-left transition-colors hover:text-emerald-100",
                          active && "text-emerald-100",
                        )}
                      >
                        {entry.label}
                      </button>
                    </td>
                    {(
                      [
                        "startups2025",
                        "startups2025MultiDirector",
                        "startupsFundedOver100k",
                        "smesOver6Months",
                        "smesEmployees10to200",
                      ] as const
                    ).map((field, index) => (
                      <td
                        key={field}
                        className={cn(
                          "px-3 py-2.5 text-right font-mono text-white/70",
                          index === 4 && "px-5 sm:px-6",
                        )}
                      >
                        {editingSummary ? (
                          <input
                            className={cn(numberInputClassName(), "mt-0 text-right")}
                            value={entry[field]}
                            onChange={(event) =>
                              updateDraftMetric(entry.id, field, event.target.value)
                            }
                          />
                        ) : (
                          formatPotentialClientsCount(entry[field])
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.02]">
                <td className="px-5 py-3 text-sm font-semibold text-white sm:px-6">All markets</td>
                <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-emerald-200">
                  {formatPotentialClientsCount(summaryTotals.startups2025)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-white/85">
                  {formatPotentialClientsCount(summaryTotals.startups2025MultiDirector)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-white/85">
                  {formatPotentialClientsCount(summaryTotals.startupsFundedOver100k)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-white/85">
                  {formatPotentialClientsCount(summaryTotals.smesOver6Months)}
                </td>
                <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-white/85 sm:px-6">
                  {formatPotentialClientsCount(summaryTotals.smesEmployees10to200)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className={cn(panelClassName(), "overflow-hidden")}>
        <div
          role="tablist"
          aria-label="Potential client countries"
          className="flex gap-0 overflow-x-auto border-b border-white/10"
        >
          {workingCountries.map((entry) => {
            const active = entry.id === selectedCountryId;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectCountry(entry.id)}
                className={cn(
                  "shrink-0 border-b-2 px-4 py-3 text-xs font-medium transition-colors sm:px-5 sm:text-sm",
                  active
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                    : "border-transparent text-white/55 hover:border-white/20 hover:bg-white/[0.03] hover:text-white",
                )}
              >
                {entry.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {editingSection === "country" ? (
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Region note</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={country.regionNote}
                      onChange={(event) =>
                        updateDraftCountry(country.id, { regionNote: event.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {(
                      [
                        ["startups2025", "New business registrations in 2025"],
                        ["startups2025MultiDirector", "With multiple directors / corporate form"],
                        ["startupsFundedOver100k", "Estimated funding over $100,000"],
                        ["smesOver6Months", "SMEs established over 6 months"],
                        ["smesEmployees10to200", "SMEs with 10–200 employees"],
                      ] as const
                    ).map(([field, label]) => (
                      <div key={field}>
                        <FieldLabel>{label}</FieldLabel>
                        <input
                          className={numberInputClassName()}
                          value={country[field]}
                          onChange={(event) =>
                            updateDraftMetric(country.id, field, event.target.value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <FieldLabel>Source name</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={country.source.name}
                      onChange={(event) =>
                        updateDraftCountry(country.id, {
                          source: { ...country.source, name: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Source URL</FieldLabel>
                    <input
                      className={inputClassName()}
                      value={country.source.url}
                      onChange={(event) =>
                        updateDraftCountry(country.id, {
                          source: { ...country.source, url: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>Methodology note</FieldLabel>
                    <textarea
                      rows={3}
                      className={cn(inputClassName(), "resize-y")}
                      value={country.methodologyNote}
                      onChange={(event) =>
                        updateDraftCountry(country.id, {
                          methodologyNote: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{country.label}</h3>
                      <p className="mt-1 text-sm text-white/50">{country.regionNote}</p>
                    </div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
                      2025 snapshot
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <MetricCard
                      icon={Building2}
                      label="New business registrations in 2025"
                      value={formatPotentialClientsCount(country.startups2025)}
                    />
                    <MetricCard
                      icon={Users}
                      label="With multiple directors / corporate form"
                      value={formatPotentialClientsCount(country.startups2025MultiDirector)}
                      hint={`${formatPotentialClientsPercent(multiDirectorRate)} of new registrations`}
                    />
                    <MetricCard
                      icon={Wallet}
                      label="Estimated funding over $100,000"
                      value={formatPotentialClientsCount(country.startupsFundedOver100k)}
                      hint={`${formatPotentialClientsPercent(fundedRate)} of new registrations (est.)`}
                    />
                    <MetricCard
                      icon={TrendingUp}
                      label="SMEs established over 6 months"
                      value={formatPotentialClientsCount(country.smesOver6Months)}
                    />
                    <MetricCard
                      icon={Users}
                      label="SMEs with 10–200 employees"
                      value={formatPotentialClientsCount(country.smesEmployees10to200)}
                    />
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-white/45">
                    Source:{" "}
                    <a
                      href={country.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-300/90 underline decoration-sky-400/30 underline-offset-2 hover:text-sky-200"
                    >
                      {country.source.name}
                    </a>
                    . {country.methodologyNote}
                  </p>
                </>
              )}
            </div>
            <EditSectionButton
              editing={editingSection === "country"}
              onEdit={() => beginEdit("country")}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
          </div>
        </div>
      </section>

      <section className={cn(panelClassName(), "overflow-hidden")}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">
              Industry breakdown · {country.label}
            </h3>
            <p className="mt-1 text-xs text-white/50">
              Ten industry categories — startup counts and share of the local 2025 startup pool.
            </p>
          </div>
          <EditSectionButton
            editing={editingSection === "industries"}
            onEdit={() => beginEdit("industries")}
            onSave={saveEdit}
            onCancel={cancelEdit}
          />
        </div>

        <div className="hidden gap-2 border-b border-white/10 px-5 py-2 text-[9px] font-medium uppercase tracking-[0.12em] text-white/40 sm:grid sm:grid-cols-[minmax(0,1.4fr)_7rem_6rem] sm:px-6">
          <span>Industry</span>
          <span className="text-right">Startups</span>
          <span className="text-right">Share</span>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {country.industries.map((industry) => (
            <div
              key={industry.id}
              className="grid gap-2 px-5 py-3 sm:grid-cols-[minmax(0,1.4fr)_7rem_6rem] sm:items-center sm:px-6"
            >
              {editingSection === "industries" ? (
                <>
                  <input
                    className={cn(inputClassName(), "mt-0")}
                    value={industry.label}
                    onChange={(event) =>
                      updateDraftIndustry(industry.id, { label: event.target.value })
                    }
                  />
                  <input
                    className={cn(numberInputClassName(), "mt-0 text-right")}
                    value={industry.startupCount}
                    onChange={(event) => {
                      const parsed = Number(event.target.value.replace(/,/g, ""));
                      updateDraftIndustry(industry.id, {
                        startupCount: Number.isFinite(parsed)
                          ? Math.max(0, Math.round(parsed))
                          : 0,
                      });
                    }}
                  />
                  <input
                    className={cn(numberInputClassName(), "mt-0 text-right")}
                    value={industry.sharePercent}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      updateDraftIndustry(industry.id, {
                        sharePercent: Number.isFinite(parsed)
                          ? Math.min(100, Math.max(0, parsed))
                          : 0,
                      });
                    }}
                  />
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-white">{industry.label}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10 sm:max-w-md">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-sky-400/80"
                        style={{ width: `${Math.min(industry.sharePercent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm tabular-nums text-white/85 sm:text-right">
                    {formatPotentialClientsCount(industry.startupCount)}
                  </p>
                  <p className="text-sm tabular-nums text-white/55 sm:text-right">
                    {formatPotentialClientsPercent(industry.sharePercent)}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
