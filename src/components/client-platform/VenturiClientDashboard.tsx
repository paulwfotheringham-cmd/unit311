"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  VENTURI_CERTIFICATION_SERVICES,
  VENTURI_CLIENT,
  VENTURI_PROJECTS,
  VENTURI_STATS,
  VENTURI_TESTING_CHECKLIST,
  type VenturiProjectView,
} from "@/lib/venturi-platform-data";
import { cn } from "@/lib/utils";
import VenturiClientShell from "./VenturiClientShell";

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

function OverviewContent() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-sky-950/40 to-[#0D1B2A]/80 p-5 sm:p-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">
          Client intelligence platform
        </p>
        <h1 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{VENTURI_CLIENT.name}</h1>
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
        {VENTURI_PROJECTS.map((project) => (
          <ProjectCard key={project.id} {...project} />
        ))}
      </div>
    </div>
  );
}

function CertificationContent() {
  return (
    <div className="space-y-6">
      <Panel title="End-to-end certification process">
        <p className="text-sm leading-relaxed text-white/60">
          In Europe, compliance is key. Whether targeting Open, Specific, or Certified categories,
          drone operations must meet strict regulatory requirements — often including CE marking, a
          Class Identification Label, or proof of conformity with predefined technical standards.
        </p>
        <p className="mt-3 text-sm text-white/50">
          Unit311 supports UAS manufacturers through a complete, step-by-step certification
          process. Content sourced from{" "}
          <a
            href="https://www.unit311.com/drone-certification/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300"
          >
            unit311.com/drone-certification
          </a>
          .
        </p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {VENTURI_CERTIFICATION_SERVICES.map((service) => (
          <div
            key={service.title}
            className="rounded-2xl border border-white/[0.08] bg-[#0D1B2A]/60 p-4 sm:p-5"
          >
            <h3 className="text-sm font-semibold text-white">{service.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/55">{service.description}</p>
            <p className="mt-3 text-xs text-amber-300/90">Venturi track — evidence gathering</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestingContent() {
  return (
    <div className="space-y-6">
      <Panel title="Venturi client testing programme">
        <p className="text-sm text-white/55">
          Dedicated client test campaign at the Unit311 operations hub — separate from internal operator
          flight simulator and weather testing tools. Progress tracked per test card with sign-off
          status.
        </p>
      </Panel>

      <div className="space-y-2">
        {VENTURI_TESTING_CHECKLIST.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0D1B2A]/50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {item.status === "Passed" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : item.status === "In progress" ? (
                <Clock className="h-4 w-4 text-sky-400" />
              ) : (
                <Circle className="h-4 w-4 text-white/25" />
              )}
              <div>
                <p className="text-sm text-white/85">{item.label}</p>
                <p className="text-xs text-white/40">{item.date}</p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px]",
                item.status === "Passed"
                  ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                  : item.status === "In progress"
                    ? "border-sky-400/40 bg-sky-500/15 text-sky-300"
                    : "border-white/15 bg-white/5 text-white/45",
              )}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectDetailContent({ projectId }: { projectId: string }) {
  const project = VENTURI_PROJECTS.find((entry) => entry.id === projectId);
  if (!project) return null;
  return <ProjectCard {...project} />;
}

export default function VenturiClientDashboard() {
  const [activeView, setActiveView] = useState<VenturiProjectView>("overview");

  return (
    <VenturiClientShell activeView={activeView} onViewChange={setActiveView}>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {activeView === "overview" && <OverviewContent />}
          {activeView === "feasibility" && <ProjectDetailContent projectId="feasibility" />}
          {activeView === "rnd" && <ProjectDetailContent projectId="rnd" />}
          {activeView === "regulatory" && <ProjectDetailContent projectId="regulatory" />}
          {activeView === "operations" && <ProjectDetailContent projectId="operations" />}
          {activeView === "certification" && <CertificationContent />}
          {activeView === "testing" && <TestingContent />}
        </div>
      </ScrollArea>
    </VenturiClientShell>
  );
}
