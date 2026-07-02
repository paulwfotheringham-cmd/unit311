"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import SectionHoverInfo from "./SectionHoverInfo";
import { HomeDashboardFlightPathPanel, HomeDashboardFpvPanel } from "./HomeDashboardLivePanels";
import { cn } from "@/lib/utils";

const SITE_IMAGE = "/images/westport-site.jpg";

const SIDEBAR_NAV = [
  {
    label: "Dashboard",
    active: true,
    info: "Mission control home with live KPIs, maps, and deliverable status.",
  },
  {
    label: "Analytics",
    active: false,
    info: "Volume trends, progress variance, and earthworks analytics across zones.",
  },
  {
    label: "Site Maps",
    active: false,
    info: "Orthomosaics, DSM layers, and annotated site intelligence products.",
  },
  {
    label: "Reports",
    active: false,
    info: "Published PDF packs and stakeholder-ready intelligence exports.",
  },
  {
    label: "Documents",
    active: false,
    info: "Contracts, flight logs, compliance records, and project files.",
  },
  {
    label: "Alerts",
    active: false,
    info: "Inspection findings, survey exceptions, and operational notifications.",
  },
  {
    label: "Settings",
    active: false,
    info: "User access, project configuration, and integration preferences.",
  },
] as const;

const KPI_DETAILS = [
  {
    label: "Projects",
    value: "24",
    dot: "bg-emerald-400",
    info: "Active client projects with live survey schedules and deliverable tracking.",
  },
  {
    label: "Milestones",
    value: "156",
    dot: "bg-sky-400",
    info: "Completed delivery milestones indexed by workstream, date, and owner.",
  },
  {
    label: "Issues",
    value: "8",
    dot: "bg-amber-400",
    info: "Open findings flagged from inspections or analytics, prioritised by severity.",
  },
  {
    label: "Reports",
    value: "142",
    dot: "bg-blue-500",
    info: "Published PDF and data exports available through the secure client portal.",
  },
] as const;

const ZONE_PROGRESS = [
  {
    label: "North Warehouse",
    value: 82,
    info: "Structural shell complete; internal fit-out and MEP inspections underway.",
  },
  {
    label: "South Warehouse",
    value: 49,
    info: "Earthworks and slab pour in progress; behind plan on cladding package.",
  },
  {
    label: "Utilities Corridor",
    value: 61,
    info: "Duct banks and substation civils advancing; thermal survey scheduled.",
  },
  {
    label: "Truck Yard",
    value: 78,
    info: "Paving and drainage largely complete; line marking and commissioning next.",
  },
] as const;

const SITE_ZONES = [
  { label: "North Warehouse", className: "left-[18%] top-[22%]" },
  { label: "Utility Corridor", className: "left-[44%] top-[38%]" },
  { label: "South Warehouse", className: "left-[62%] top-[58%]" },
  { label: "Truck Yard", className: "left-[28%] top-[68%]" },
] as const;

const REPORTS = [
  {
    title: "June Progress Report",
    age: "Generated 2 days ago",
    info: "Executive progress summary with zone completion charts and programme commentary.",
  },
  {
    title: "Earthworks Analysis",
    age: "Generated 4 days ago",
    info: "Cut-and-fill volumes reconciled against design surfaces and survey epochs.",
  },
  {
    title: "Executive Summary",
    age: "Generated 5 days ago",
    info: "Board-ready overview of risk, progress, and upcoming survey milestones.",
  },
  {
    title: "Monthly Progress Pack",
    age: "Generated 8 days ago",
    info: "Full stakeholder pack with orthophotos, issues log, and annotated site maps.",
  },
] as const;

const EARTHWORKS = [42, 58, 51, 67, 74, 63];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

function Shell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/[0.14] bg-gradient-to-br from-[#171d28] to-[#121820]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function HoverTile({
  title,
  description,
  placement = "bottom",
  highlight = true,
  className,
  children,
}: {
  title: string;
  description: string;
  placement?: "top" | "bottom";
  highlight?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <SectionHoverInfo
      title={title}
      description={description}
      variant="soft"
      placement={placement}
      highlight={highlight}
      className={className}
    >
      {children}
    </SectionHoverInfo>
  );
}

function SidebarIcon({ active = false }: { active?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded",
        active ? "text-[#60a5fa]" : "text-white/35",
      )}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
        <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" />
        <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" opacity="0.55" />
        <rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.55" />
        <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.35" />
      </svg>
    </span>
  );
}

function EarthworksChart() {
  const max = Math.max(...EARTHWORKS);
  return (
    <div className="mt-2 flex h-[84px] items-end gap-1.5">
      {EARTHWORKS.map((value, index) => (
        <div key={MONTHS[index]} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-sm bg-gradient-to-t from-[#0ea5e9] to-[#38bdf8]"
            style={{ height: `${(value / max) * 68}px` }}
          />
          <span className="text-[8px] text-white/40">{MONTHS[index]}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressVsPlanChart() {
  const actual = [32, 38, 45, 52, 61, 68, 74];
  const planned = [30, 36, 44, 50, 58, 66, 72];
  const width = 160;
  const height = 64;
  const toPoints = (values: number[]) =>
    values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - (value / 100) * height;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-[84px] w-full" aria-hidden>
      {[16, 32, 48].map((y) => (
        <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      ))}
      <polyline
        points={toPoints(planned)}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <polyline
        points={toPoints(actual)}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

type GeospatialDashboardProps = {
  className?: string;
};

export default function GeospatialDashboard({ className }: GeospatialDashboardProps) {
  return (
    <div className={cn("relative mx-auto w-full", className)}>
      <div
        className="pointer-events-none absolute -inset-3 rounded-[28px] bg-gradient-to-br from-sky-500/25 via-blue-600/10 to-indigo-500/20 blur-2xl sm:-inset-5"
        aria-hidden
      />

      <div className="relative overflow-visible rounded-[22px] border border-white/20 bg-gradient-to-br from-[#0e1522] via-[#0b1118] to-[#080d14] shadow-[0_32px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(56,189,248,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.05) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />

        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-[#0a1019]/95 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <p className="hidden text-[11px] text-white/45 sm:block">
              North Campus Programme · Acme Holdings
            </p>
          </div>
        </div>

        <div className="relative flex min-h-[640px]">
          <aside className="hidden h-full min-h-[640px] shrink-0 flex-col border-r border-white/10 bg-[#0a0f18]/90 lg:flex lg:w-[196px]">
              <div className="border-b border-white/10 px-4 py-4">
                <div className="rounded-lg bg-white px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
                  <span className="text-[13px] font-bold tracking-[-0.02em] text-[#1a2b4a]">
                    Unit<span className="text-[#2563eb]">311</span>
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-[10px]">
                  <div>
                    <p className="font-semibold uppercase tracking-[0.12em] text-white/35">Client</p>
                    <p className="mt-0.5 font-medium text-white/80">Acme Holdings</p>
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-[0.12em] text-white/35">Project</p>
                    <p className="mt-0.5 font-medium text-white/80">North Campus Programme</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 space-y-0.5 px-2 py-3">
                {SIDEBAR_NAV.map((item) => (
                  <HoverTile
                    key={item.label}
                    title={item.label}
                    description={item.info}
                    placement="bottom"
                  >
                    <div
                      className={cn(
                        "flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-[11px]",
                        item.active
                          ? "bg-[#2563eb]/15 text-[#93c5fd]"
                          : "text-white/45",
                      )}
                    >
                      <SidebarIcon active={item.active} />
                      <span>{item.label}</span>
                    </div>
                  </HoverTile>
                ))}
              </nav>

              <HoverTile
                title="Test Lab"
                description="Internal sandbox for flight simulation, telemetry replay, and platform QA."
                placement="top"
              >
                <div className="cursor-default border-t border-white/10 px-4 py-3 text-[11px] text-white/40">
                  Test Lab
                </div>
              </HoverTile>
            </aside>

          <main className="relative min-w-0 flex-1 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {KPI_DETAILS.map((kpi) => (
                <HoverTile key={kpi.label} title={kpi.label} description={kpi.info}>
                  <Shell className="cursor-default px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]", kpi.dot)} />
                      <p className="text-[11px] text-white/55">{kpi.label}</p>
                    </div>
                    <p className="mt-1 text-[20px] font-semibold tracking-tight text-white">{kpi.value}</p>
                  </Shell>
                </HoverTile>
              ))}
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
              <HoverTile
                title="Site Intelligence"
                description="Annotated orthomosaic with warehouse zones, haul routes, capture metadata, and interactive map layers."
              >
                <Shell className="relative cursor-default overflow-hidden p-0">
                  <div className="relative min-h-[220px] sm:min-h-[260px]">
                    <Image src={SITE_IMAGE} alt="" fill className="object-cover" sizes="(max-width:1280px) 100vw, 60vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/50 via-transparent to-[#020617]/15" />
                    {SITE_ZONES.map((zone) => (
                      <HoverTile
                        key={zone.label}
                        title={zone.label}
                        description={`Surveyed zone with progress tracking, inspection overlays, and volume analytics for ${zone.label}.`}
                        placement="top"
                        highlight={false}
                        className={cn("absolute", zone.className)}
                      >
                        <span className="inline-flex cursor-default rounded border border-sky-300/60 bg-sky-500/25 px-2 py-0.5 text-[9px] font-medium text-white shadow-[0_4px_16px_rgba(14,165,233,0.25)] backdrop-blur-sm">
                          {zone.label}
                        </span>
                      </HoverTile>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0a1019]/80 px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[9px] text-white/70">
                        Captured 4 days ago
                      </span>
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[9px] text-emerald-300">
                        RGB Active
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="rounded border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[9px] text-sky-200">
                        Open Interactive Map
                      </span>
                      <span className="rounded border border-white/10 px-2 py-0.5 text-[9px] text-white/55">
                        View Orthomosaic
                      </span>
                    </div>
                  </div>
                </Shell>
              </HoverTile>

              <HoverTile
                title="Progress by Zone"
                description="Completion percentage and variance vs planned progress across each major site zone."
              >
                <Shell className="cursor-default p-3">
                  <p className="text-[12px] font-semibold text-white">Progress by Zone</p>
                  <p className="mt-0.5 text-[10px] text-white/45">
                    Completion percentage and variance vs planned progress
                  </p>
                  <ul className="mt-3 space-y-3">
                    {ZONE_PROGRESS.map((zone) => (
                      <li key={zone.label}>
                        <HoverTile title={zone.label} description={zone.info} placement="top" highlight={false}>
                          <div className="cursor-default">
                            <div className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="text-white/75">{zone.label}</span>
                              <span className="font-semibold text-white">{zone.value}%</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8]"
                                style={{ width: `${zone.value}%` }}
                              />
                            </div>
                          </div>
                        </HoverTile>
                      </li>
                    ))}
                  </ul>
                </Shell>
              </HoverTile>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HoverTile
                title="Earthworks Volume"
                description="Monthly delivery volumes and programme variance across active workstreams."
              >
                <Shell className="cursor-default p-3">
                  <p className="text-[11px] font-medium text-white/70">Earthworks Volume</p>
                  <EarthworksChart />
                </Shell>
              </HoverTile>

              <HoverTile
                title="Progress vs Plan"
                description="Programme performance comparing actual site progress against the baseline schedule."
              >
                <Shell className="cursor-default p-3">
                  <p className="text-[11px] font-medium text-white/70">Progress vs Plan</p>
                  <ProgressVsPlanChart />
                </Shell>
              </HoverTile>

              <HoverTile
                title="Flight path map"
                description="Live programme map with planned routes, completed work packages, and operational status."
                placement="top"
              >
                <HomeDashboardFlightPathPanel />
              </HoverTile>

              <HoverTile
                title="Live operations view"
                description="Simulated first-person view from the Matrice 4T with terrain-linked chase camera and OSD telemetry."
                placement="top"
              >
                <HomeDashboardFpvPanel />
              </HoverTile>
            </div>

            <div className="mt-4">
              <HoverTile
                title="Reports"
                description="Intelligence deliverables for project stakeholders — progress packs, earthworks analysis, and executive summaries."
                placement="top"
              >
                <div className="cursor-default">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                    Reports
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/55">
                    Intelligence deliverables for project stakeholders
                  </p>
                </div>
              </HoverTile>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {REPORTS.map((report) => (
                  <HoverTile
                    key={report.title}
                    title={report.title}
                    description={report.info}
                    placement="top"
                  >
                    <Shell className="cursor-default p-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-red-500/15 text-[10px] text-red-300">
                          PDF
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-white">{report.title}</p>
                          <p className="mt-0.5 text-[9px] text-white/45">{report.age}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex gap-1.5">
                        <span className="rounded border border-white/10 px-2 py-0.5 text-[9px] text-white/55">
                          View Report
                        </span>
                        <span className="rounded border border-white/10 px-2 py-0.5 text-[9px] text-white/55">
                          Download
                        </span>
                      </div>
                    </Shell>
                  </HoverTile>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
