"use client";

import { useState } from "react";

import { OFFICE_LOCATIONS } from "@/lib/office-locations-data";
import { OFFICE_STAFF } from "@/lib/office-staff-data";
import { cn } from "@/lib/utils";
import { Building2, ChevronDown, Clock, MapPin, Users } from "lucide-react";

export default function OfficeLocationsWorkspace() {
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);

  const selectedOffice = OFFICE_LOCATIONS.find((site) => site.id === selectedOfficeId) ?? null;
  const selectedStaff = selectedOfficeId ? (OFFICE_STAFF[selectedOfficeId] ?? []) : [];

  function toggleOffice(officeId: string) {
    setSelectedOfficeId((current) => (current === officeId ? null : officeId));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
              Business Central
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Office locations</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              Unit311 hubs across Spain, Portugal, and the United Kingdom.
            </p>
          </div>
          <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-sky-200/80">Sites</p>
            <p className="text-lg font-semibold text-white">{OFFICE_LOCATIONS.length}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {OFFICE_LOCATIONS.map((site) => {
          const selected = selectedOfficeId === site.id;

          return (
            <button
              key={site.id}
              type="button"
              onClick={() => toggleOffice(site.id)}
              className={cn(
                "rounded-2xl border p-4 text-left shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-colors sm:p-5",
                selected
                  ? "border-sky-400/40 bg-sky-500/10 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.15)]"
                  : "border-white/15 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.06]",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/15">
                  <Building2 className="h-4 w-4 text-sky-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-white">{site.name}</h3>
                      <p className="mt-0.5 text-sm text-white/55">
                        {site.city}, {site.country}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 text-white/40 transition-transform",
                        selected && "rotate-180 text-sky-300",
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/80" />
                  <p className="text-sm leading-relaxed text-white/70">{site.address}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-white/45">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0b1524]/70 px-2.5 py-1">
                    <Users className="h-3.5 w-3.5 text-emerald-300/80" />
                    {site.staffCount} staff
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0b1524]/70 px-2.5 py-1">
                    <Clock className="h-3.5 w-3.5 text-violet-300/80" />
                    {site.timezone}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedOffice && (
        <section className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                Staff directory
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">{selectedOffice.name}</h3>
              <p className="mt-1 text-sm text-white/50">
                {selectedStaff.length} team members on site
              </p>
            </div>
          </div>

          {selectedStaff.length === 0 ? (
            <p className="mt-4 text-sm text-white/45">No staff records for this location.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10 bg-[#0b1524]/40">
              {selectedStaff.map((member) => (
                <li
                  key={member.id}
                  className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                >
                  <p className="text-sm font-medium text-white">{member.name}</p>
                  <p className="text-xs text-white/55">{member.role}</p>
                  <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-white/45">
                    {member.department}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
