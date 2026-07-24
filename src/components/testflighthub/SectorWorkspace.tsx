"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ExternalLink, Layers } from "lucide-react";

import {
  formatSectorWebsiteHref,
  getSectorCountryLabel,
  getSectorProfile,
  getSectorSubSectorMeta,
  SECTOR_COUNTRIES,
  SECTOR_SUB_SECTORS,
  type SectorCountry,
  type SectorSubSector,
} from "@/lib/sector-data";
import { cn } from "@/lib/utils";

const SectorSitesMap = dynamic(() => import("./SectorSitesMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-white/10 bg-[#0b1524] text-sm text-white/50">
      Loading map…
    </div>
  ),
});

function selectClassName() {
  return "h-10 w-full min-w-[180px] rounded-xl border border-white/10 bg-[#0b1524] px-3 text-sm text-white outline-none transition-colors focus:border-sky-400/50 sm:w-auto";
}

export default function SectorWorkspace() {
  const [selectedCountry, setSelectedCountry] = useState<SectorCountry | null>(null);
  const [selectedSubSector, setSelectedSubSector] = useState<SectorSubSector | null>(null);

  const profile = useMemo(() => {
    if (!selectedCountry || !selectedSubSector) return null;
    return getSectorProfile(selectedCountry, selectedSubSector);
  }, [selectedCountry, selectedSubSector]);

  const subSectorMeta = selectedSubSector ? getSectorSubSectorMeta(selectedSubSector) : null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-8">
        <div className="flex flex-wrap items-end justify-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="sector-country-select"
              className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45"
            >
              Country
            </label>
            <select
              id="sector-country-select"
              value={selectedCountry ?? ""}
              onChange={(event) => {
                const value = event.target.value as SectorCountry | "";
                setSelectedCountry(value || null);
                setSelectedSubSector(null);
              }}
              className={selectClassName()}
            >
              <option value="">Choose country…</option>
              {SECTOR_COUNTRIES.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCountry && (
          <div className="mt-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Sub-sector · {getSectorCountryLabel(selectedCountry)}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {SECTOR_SUB_SECTORS.map((subSector) => {
                const active = selectedSubSector === subSector.id;
                return (
                  <button
                    key={subSector.id}
                    type="button"
                    onClick={() => setSelectedSubSector(subSector.id)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition-colors",
                      active
                        ? "border-sky-400/40 bg-sky-500/10"
                        : "border-white/10 bg-[#0b1524]/60 hover:border-white/20 hover:bg-[#0b1524]",
                    )}
                  >
                    <p className="text-sm font-semibold text-white">{subSector.label}</p>
                    <p className="mt-1 text-xs leading-snug text-white/50">{subSector.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {!selectedCountry && (
        <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
          <Layers className="mx-auto h-8 w-8 text-white/25" />
          <p className="mt-3 text-sm text-white/50">Choose a country to see available sub-sectors.</p>
        </section>
      )}

      {selectedCountry && !selectedSubSector && (
        <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-white/50">
            Select a sub-sector above to load sector intelligence for{" "}
            {getSectorCountryLabel(selectedCountry)}.
          </p>
        </section>
      )}

      {profile && subSectorMeta && (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-400">
                Tile 1 · Site footprint
              </p>
              <h3 className="mt-2 text-3xl font-semibold text-white">{profile.siteCount}</h3>
              <p className="mt-1 text-sm text-white/60">
                sizeable {profile.siteLabel} in {getSectorCountryLabel(profile.country)}
              </p>
              <p className="mt-2 text-xs text-white/45">{profile.siteBreakdown}</p>
              <div className="mt-4">
                <SectorSitesMap
                  organizations={profile.organizations}
                  center={profile.mapCenter}
                  zoom={profile.mapZoom}
                  compact
                />
              </div>
            </section>

            <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-400">
                Tile 2 · Top 10 organisations
              </p>
              <h3 className="mt-2 text-base font-semibold text-white">{subSectorMeta.label}</h3>
              <p className="mt-1 text-xs text-white/45">
                Name · website · current drone use
              </p>
              <ul className="mt-4 max-h-[min(52vh,420px)] space-y-3 overflow-y-auto pr-1">
                {profile.organizations.map((org) => {
                  const href = formatSectorWebsiteHref(org.website);
                  return (
                    <li
                      key={`${org.rank}-${org.name}`}
                      className="rounded-xl border border-white/10 bg-[#0b1524]/70 px-3 py-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 font-mono text-[10px] text-white/40">{org.rank}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{org.name}</p>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200"
                            >
                              {org.website}
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : null}
                          <p className="mt-1 text-[11px] leading-snug text-white/50">{org.detail}</p>
                          <p className="mt-1.5 text-[11px] text-violet-200/90">
                            Drones: {org.droneUse}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                Tile 3 · Unit311 services
              </p>
              <h3 className="mt-2 text-base font-semibold text-white">
                What we can offer {subSectorMeta.label.toLowerCase()}
              </h3>
              <p className="mt-1 text-xs text-white/45">
                {getSectorCountryLabel(profile.country)} · tailored to sector needs
              </p>
              <ul className="mt-4 space-y-2.5">
                {profile.servicesOffered.map((service) => (
                  <li
                    key={service}
                    className="flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-3 py-2.5 text-sm leading-snug text-white/75"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    {service}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
