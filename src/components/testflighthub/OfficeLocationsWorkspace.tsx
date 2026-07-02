"use client";

import { OFFICE_LOCATIONS } from "@/lib/office-locations-data";
import { Building2, Clock, MapPin, Users } from "lucide-react";

export default function OfficeLocationsWorkspace() {
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
        {OFFICE_LOCATIONS.map((site) => (
          <article
            key={site.id}
            className="rounded-2xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/15">
                <Building2 className="h-4 w-4 text-sky-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white">{site.name}</h3>
                <p className="mt-0.5 text-sm text-white/55">
                  {site.city}, {site.country}
                </p>
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
          </article>
        ))}
      </div>
    </div>
  );
}
