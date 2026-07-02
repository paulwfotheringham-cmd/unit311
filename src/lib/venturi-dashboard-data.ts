import { IMAGES } from "@/lib/mock-data";
import { VENTURI_CLIENT, VENTURI_PROJECTS, VENTURI_STATS } from "@/lib/venturi-platform-data";

export const venturiProject = {
  name: "Project X",
  client: VENTURI_CLIENT.name,
  industry: "Electric VTOL Development",
  location: "Catalonia",
  siteArea: "",
  completion: 68,
  daysAhead: 0,
  earthworksCompleted: "47",
  issues: 3,
  lastSurvey: "4 Days Ago",
  updated: "4 Days Ago",
  captured: "4 Days Ago",
  targetCompletion: "Q4 2026",
  projectValue: "EU Programme",
  coordinates: "41.35°N · 2.08°E",
  breadcrumb: "Venturi",
};

export const venturiProjectBrief = {
  title: "PROGRAMME BRIEF",
  intro:
    "Project X is Venturi Aeronautical's electric VTOL development programme at Unit311, comprising:",
  items: [
    "Market feasibility & corridor analysis",
    "R&D flight test & payload integration",
    "SORA 2.5 regulatory compliance",
    "Managed test site operations",
  ],
  targetCompletion: "Q4 2026",
  projectValue: "EU Programme",
};

export const venturiKpiMetrics = [
  { value: String(VENTURI_STATS.activeProjects), label: "Active Workstreams", accent: "blue" as const },
  { value: String(VENTURI_STATS.flightHours), label: "Test Site Flight Hours", accent: "cyan" as const },
  { value: String(VENTURI_STATS.certificationTracks), label: "Certification Tracks", accent: "emerald" as const },
  { value: "24 Jun", label: "Next Milestone", accent: "amber" as const },
];

export const venturiAiSummary = {
  title: "AI PROGRAMME SUMMARY",
  meshImage: IMAGES.meshBg,
  paragraphs: [
    `Customised workspace for ${VENTURI_CLIENT.contact} — electric VTOL development spanning feasibility, R&D flight testing, regulatory compliance, and test site operations.`,
    "Feasibility study Phase 2 site validation remains on track at 68% completion.",
    "R&D flight campaign progressing with tethered hover tests complete and envelope expansion in progress.",
    VENTURI_STATS.nextMilestone,
  ],
};

export const venturiZoneProgress = VENTURI_PROJECTS.map((entry) => ({
  zone: entry.title.split(" — ")[0] ?? entry.title,
  progress: entry.progress,
  variance: entry.progress >= 70 ? +4 : entry.progress >= 55 ? 0 : -5,
}));

export const venturiSiteMarkers = [
  { id: 1, label: "Segregated Airspace", x: "28%", y: "30%" },
  { id: 2, label: "Hover Test Pad", x: "52%", y: "48%" },
  { id: 3, label: "Payload Integration Bay", x: "44%", y: "62%" },
  { id: 4, label: "Ops Control Point", x: "72%", y: "34%" },
] as const;

export const venturiPlatformStats = {
  classification: "Venturi Confidential",
  apiVersion: "v3.2.1",
  latency: "42ms",
  uptime: "99.97%",
};

export const venturiReports = [
  { title: "Feasibility Phase 2 Report", generatedAgo: "2 days ago" },
  { title: "Flight Test Campaign Log", generatedAgo: "4 days ago" },
  { title: "SORA 2.5 Ground Risk Analysis", generatedAgo: "5 days ago" },
  { title: "Monthly Ops Review Pack", generatedAgo: "8 days ago" },
];

export const venturiUpcomingActivities = [
  { title: "NAA Pre-submission Review", date: "24 Jun 2026", time: "10:00 CEST" },
  { title: "Envelope Expansion Flight", date: "26 Jun 2026", time: "08:30 CEST" },
  { title: "Payload Integration Sprint", date: "28 Jun 2026", time: "09:00 CEST" },
  { title: "Monthly Ops Review", date: "30 Jun 2026", time: "14:00 CEST" },
];
