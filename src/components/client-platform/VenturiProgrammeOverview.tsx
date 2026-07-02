import { CheckCircle2 } from "lucide-react";

import {
  VENTURI_CLIENT,
  VENTURI_PROJECTS,
  VENTURI_STATS,
} from "@/lib/venturi-platform-data";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0D1B2A]/60 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
          {title}
        </h2>
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

function ProjectCard({
  title,
  phase,
  progress,
  status,
  summary,
  milestones,
}: (typeof VENTURI_PROJECTS)[number]) {
  return (
    <Panel title={title}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-sky-300">
          {phase}
        </span>
        <span className="text-white/45">{status}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/65">{summary}</p>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[11px] text-white/40">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {milestones.map((milestone) => (
          <li key={milestone} className="flex items-start gap-2 text-xs text-white/55">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
            {milestone}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function VenturiProgrammeOverview() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-sky-950/40 to-[#0D1B2A]/80 p-5 sm:p-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">
          Client intelligence platform
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{VENTURI_CLIENT.name}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
          Customised workspace for {VENTURI_CLIENT.contact} — electric VTOL development programme
          spanning feasibility, R&D flight testing, regulatory compliance, certification support,
          and managed test site operations at Unit311.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Active workstreams", value: String(VENTURI_STATS.activeProjects) },
            { label: "Test site flight hours", value: String(VENTURI_STATS.flightHours) },
            { label: "Certification tracks", value: String(VENTURI_STATS.certificationTracks) },
            { label: "Next milestone", value: "24 Jun" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/[0.08] bg-black/20 px-3 py-3"
            >
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-white/40">{VENTURI_STATS.nextMilestone}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {VENTURI_PROJECTS.map((entry) => (
          <ProjectCard key={entry.id} {...entry} />
        ))}
      </div>
    </div>
  );
}
