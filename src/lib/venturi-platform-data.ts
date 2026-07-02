export type VenturiProjectView =
  | "overview"
  | "feasibility"
  | "rnd"
  | "regulatory"
  | "operations"
  | "certification"
  | "testing";

export const VENTURI_CLIENT = {
  name: "Venturi Aeronautical",
  contact: "Eduard Gómez",
  location: "Barcelona, Spain",
  tagline: "Electric VTOL platform development & EU market entry",
} as const;

export const VENTURI_NAV_ITEMS: readonly {
  id: VenturiProjectView;
  label: string;
  icon: string;
}[] = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard" },
  { id: "feasibility", label: "Feasibility Study", icon: "Search" },
  { id: "rnd", label: "R&D Programme", icon: "FlaskConical" },
  { id: "regulatory", label: "Regulatory Compliance", icon: "ShieldCheck" },
  { id: "operations", label: "Operations as a Service", icon: "Radio" },
  { id: "certification", label: "Certification", icon: "BadgeCheck" },
  { id: "testing", label: "Client Testing", icon: "TestTube2" },
];

export const VENTURI_PROJECTS = [
  {
    id: "feasibility",
    title: "VTOL Market Feasibility Study",
    phase: "Phase 2 — Site validation",
    progress: 68,
    status: "On track",
    summary:
      "Assessment of European urban air mobility corridors, payload envelopes, and test site suitability for electric VTOL prototypes.",
    milestones: [
      "Airspace corridor analysis — complete",
      "Payload–range trade study — complete",
      "Test site integration plan — in progress",
      "Stakeholder briefing pack — scheduled",
    ],
  },
  {
    id: "rnd",
    title: "R&D — Flight Test & Payload Integration",
    phase: "Active flight campaign",
    progress: 54,
    status: "In flight test",
    summary:
      "Structured R&D programme for avionics integration, redundancy testing, and progressive envelope expansion at the Unit311 operations hub.",
    milestones: [
      "Avionics bench validation — complete",
      "Tethered hover tests — complete",
      "Progressive envelope expansion — in progress",
      "Payload integration sprint — planned",
    ],
  },
  {
    id: "regulatory",
    title: "Regulatory Compliance — SORA & Operational Authorisation",
    phase: "SORA 2.5 documentation",
    progress: 72,
    status: "NAA review prep",
    summary:
      "End-to-end regulatory pathway for Specific Category operations including SORA 2.5, CONOPS, and NAA submission package.",
    milestones: [
      "Operational concept (CONOPS) — complete",
      "SORA 2.5 ground risk analysis — complete",
      "Air risk mitigation evidence — in progress",
      "NAA pre-submission review — scheduled",
    ],
  },
  {
    id: "operations",
    title: "Ongoing Operations as a Service",
    phase: "Monthly retainer",
    progress: 91,
    status: "Active",
    summary:
      "Managed test site operations — segregated airspace booking, flight logging, meteorological briefings, and on-site engineering support.",
    milestones: [
      "Test site access & scheduling — active",
      "Flight operations logging — active",
      "Weather & NOTAM briefings — active",
      "Monthly ops review — recurring",
    ],
  },
] as const;

export const VENTURI_CERTIFICATION_SERVICES = [
  {
    title: "CE Marking & Class Identification Label",
    description:
      "Streamlined process to obtain the Class Identification Label required for Open Category or Standard Scenario commercialisation in the EU.",
  },
  {
    title: "Enhanced Containment",
    description:
      "Compliance support for operations in controlled airspace or near populated areas via EASA Design Verification or NAA evidence packages.",
  },
  {
    title: "GRC M2 Medium/High Robustness",
    description:
      "Validated parachute recovery systems for urban environments and emergency recovery — EASA DVR or NAA evidence pathways.",
  },
  {
    title: "SAIL III UAS Compliance",
    description:
      "Navigate applicable SAIL III OSO requirements and prepare evidence and declarations for National Aviation Authority submission.",
  },
  {
    title: "SAIL IV UAS DVR",
    description:
      "Guide through EASA Design Verification Report process for SAIL IV Specific Category operations — application to final approval.",
  },
] as const;

export const VENTURI_TESTING_CHECKLIST = [
  { label: "Pre-flight systems check", status: "Passed", date: "12 Jun 2026" },
  { label: "Redundancy failover — flight controller", status: "Passed", date: "13 Jun 2026" },
  { label: "Envelope expansion — hover to 30 m AGL", status: "In progress", date: "14 Jun 2026" },
  { label: "Payload vibration characterisation", status: "Scheduled", date: "16 Jun 2026" },
  { label: "Lost-link procedure validation", status: "Scheduled", date: "17 Jun 2026" },
  { label: "Night operations assessment", status: "Planned", date: "19 Jun 2026" },
] as const;

export const VENTURI_STATS = {
  activeProjects: 4,
  flightHours: 47,
  certificationTracks: 3,
  nextMilestone: "NAA pre-submission review — 24 Jun 2026",
} as const;
