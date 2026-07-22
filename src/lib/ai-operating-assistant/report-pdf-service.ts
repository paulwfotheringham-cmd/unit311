import { jsPDF } from "jspdf";

import type { FinancialOverviewSnapshot } from "@/lib/accounting/types";
import type { ManagedClient } from "@/lib/client-management-data";
import type { HrEmployee } from "@/lib/hr-data";
import type { InternalProject } from "@/lib/projects-data";
import {
  createArtifactId,
  putAssistantArtifact,
  type AssistantStoredArtifact,
} from "@/lib/ai-operating-assistant/artifact-store";
import {
  reportDisplayMeta,
  type AssistantReportType,
} from "@/lib/ai-operating-assistant/report-intent";

type ReportSection = {
  heading: string;
  rows: Array<{ label: string; value: string }>;
  bullets?: string[];
};

function isOverdue(endDate: string | null | undefined) {
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

function money(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `$${(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
}

function drawBrandedHeader(
  doc: jsPDF,
  organisationName: string | null | undefined,
  title: string,
  subtitle: string,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(14, 165, 233);
  doc.roundedRect(40, 36, 28, 28, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("U3", 48, 54);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text("Unit311", 78, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(organisationName?.trim() || "Central", 78, 62);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 40, 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 40, 116);
  doc.text(
    new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    pageWidth - 40,
    116,
    { align: "right" },
  );
}

function renderSections(doc: jsPDF, sections: ReportSection[]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 40;
  const usable = pageWidth - 80;
  let y = 140;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 48) {
      doc.addPage();
      y = 48;
    }
  };

  for (const section of sections) {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(section.heading, left, y);
    y += 16;

    for (const row of section.rows) {
      ensureSpace(28);
      doc.setFillColor(248, 250, 252);
      doc.rect(left, y - 12, usable, 22, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const labelLines = doc.splitTextToSize(row.label, usable * 0.62);
      doc.text(labelLines[0] ?? "", left + 8, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(row.value, left + usable - 8, y, { align: "right" });
      y += 26;
    }

    for (const bullet of section.bullets ?? []) {
      ensureSpace(22);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(`• ${bullet}`, usable - 8);
      doc.text(lines, left + 4, y);
      y += Math.max(18, lines.length * 12);
    }

    y += 10;
  }

  ensureSpace(24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Figures sourced from live Unit311 workspace data. Empty sections mean no records — not estimates.",
    left,
    y,
    { maxWidth: usable },
  );
}

function buildEngineeringSections(projects: InternalProject[]): ReportSection[] {
  const live = projects.filter((project) => project.phase === "live");
  const upcoming = projects.filter((project) => project.phase === "upcoming");
  const overdue = projects.filter((project) => isOverdue(project.endDate));
  const atRisk = live.filter(
    (project) => project.progressPct < 40 || isOverdue(project.endDate),
  );

  return [
    {
      heading: "Delivery overview",
      rows: [
        { label: "Active / live projects", value: String(live.length) },
        { label: "Upcoming work", value: String(upcoming.length) },
        { label: "Overdue by end date", value: String(overdue.length) },
        { label: "At-risk delivery", value: String(atRisk.length) },
      ],
    },
    {
      heading: "Active projects & status",
      rows: [],
      bullets:
        live.length > 0
          ? live.slice(0, 12).map((project) => {
              const due = project.endDate ? ` · due ${project.endDate}` : "";
              const risk = isOverdue(project.endDate) ? " · OVERDUE" : "";
              return `${project.name} (${project.clientName}) · ${project.progressPct}%${due}${risk}`;
            })
          : ["No live projects on record."],
    },
    {
      heading: "Milestones & risks",
      rows: [],
      bullets: [
        ...(overdue.length > 0
          ? overdue
              .slice(0, 8)
              .map(
                (project) =>
                  `Risk: ${project.name} past end date ${project.endDate ?? "—"}`,
              )
          : ["No overdue milestones."]),
        ...(atRisk
          .filter((project) => !isOverdue(project.endDate))
          .slice(0, 6)
          .map(
            (project) =>
              `Watch: ${project.name} at ${project.progressPct}% progress`,
          )),
      ],
    },
    {
      heading: "Outstanding issues",
      rows: [],
      bullets: (() => {
        const notes = projects
          .filter((project) => Boolean(project.notes?.trim()))
          .slice(0, 8)
          .map((project) => `${project.name}: ${project.notes!.trim()}`);
        return notes.length > 0 ? notes : ["No open project notes recorded."];
      })(),
    },
    {
      heading: "Upcoming work",
      rows: [],
      bullets:
        upcoming.length > 0
          ? upcoming
              .slice(0, 10)
              .map(
                (project) =>
                  `${project.name} · ${project.clientName}${
                    project.startDate ? ` · starts ${project.startDate}` : ""
                  }`,
              )
          : ["No upcoming projects scheduled."],
    },
  ];
}

function buildBoardSections(input: {
  projects: InternalProject[];
  clients: ManagedClient[];
  employees: HrEmployee[];
  overview: FinancialOverviewSnapshot | null;
}): ReportSection[] {
  const liveProjects = input.projects.filter((project) => project.phase === "live");
  const activeClients = input.clients.filter(
    (client) => client.accountStatus === "Active",
  );
  const sections: ReportSection[] = [
    {
      heading: "Executive snapshot",
      rows: [
        { label: "Active clients", value: String(activeClients.length) },
        { label: "Live projects", value: String(liveProjects.length) },
        {
          label: "Overdue projects",
          value: String(input.projects.filter((p) => isOverdue(p.endDate)).length),
        },
        { label: "Headcount", value: String(input.employees.length) },
      ],
    },
  ];

  if (input.overview) {
    sections.push({
      heading: "Financial signals",
      rows: [
        { label: "Monthly revenue", value: money(input.overview.monthlyRevenue) },
        { label: "Monthly expenses", value: money(input.overview.monthlyExpenses) },
        { label: "Cash position", value: money(input.overview.cashPosition) },
        {
          label: "Accounts receivable",
          value: money(input.overview.accountsReceivable),
        },
        {
          label: "Accounts payable",
          value: money(input.overview.accountsPayable),
        },
      ],
    });
  }

  sections.push({
    heading: "Delivery focus",
    rows: [],
    bullets: liveProjects.slice(0, 8).map(
      (project) =>
        `${project.name} · ${project.progressPct}% · ${project.clientName}`,
    ),
  });

  return sections;
}

function buildProjectSections(projects: InternalProject[]): ReportSection[] {
  const live = projects.filter((project) => project.phase === "live");
  const upcoming = projects.filter((project) => project.phase === "upcoming");
  return [
    {
      heading: "Portfolio summary",
      rows: [
        { label: "Total projects", value: String(projects.length) },
        { label: "Live", value: String(live.length) },
        { label: "Upcoming", value: String(upcoming.length) },
        {
          label: "Overdue",
          value: String(projects.filter((p) => isOverdue(p.endDate)).length),
        },
      ],
    },
    {
      heading: "Live portfolio",
      rows: [],
      bullets:
        live.length > 0
          ? live.map(
              (project) =>
                `${project.name} · ${project.clientName} · ${project.progressPct}%${
                  project.endDate ? ` · due ${project.endDate}` : ""
                }`,
            )
          : ["No live projects."],
    },
    {
      heading: "Upcoming",
      rows: [],
      bullets:
        upcoming.length > 0
          ? upcoming.map(
              (project) =>
                `${project.name} · ${project.clientName}${
                  project.startDate ? ` · ${project.startDate}` : ""
                }`,
            )
          : ["No upcoming projects."],
    },
  ];
}

function buildClientSections(
  clients: ManagedClient[],
  projects: InternalProject[],
): ReportSection[] {
  const active = clients.filter((client) => client.accountStatus === "Active");
  const onboarding = clients.filter(
    (client) =>
      client.accountStatus === "Onboarding" ||
      client.accountStatus === "Workspace Provisioned" ||
      client.accountStatus === "Client Created" ||
      Boolean(client.onboardingStage),
  );
  const renewals = clients
    .filter((client) => Boolean(client.renewalDate))
    .sort((a, b) => String(a.renewalDate).localeCompare(String(b.renewalDate)));

  return [
    {
      heading: "Client overview",
      rows: [
        { label: "Total clients", value: String(clients.length) },
        { label: "Active", value: String(active.length) },
        { label: "Onboarding / provisioning", value: String(onboarding.length) },
        {
          label: "With renewal dates",
          value: String(renewals.length),
        },
      ],
    },
    {
      heading: "Active clients",
      rows: [],
      bullets:
        active.length > 0
          ? active.slice(0, 15).map((client) => {
              const linked = projects.filter(
                (project) =>
                  project.clientId === client.id ||
                  project.clientName === client.companyName,
              ).length;
              return `${client.companyName} · ${client.contractType || "—"} · ${linked} projects`;
            })
          : ["No active clients."],
    },
    {
      heading: "Onboarding",
      rows: [],
      bullets:
        onboarding.length > 0
          ? onboarding.slice(0, 10).map(
              (client) =>
                `${client.companyName} · ${client.accountStatus}${
                  client.onboardingStage ? ` · ${client.onboardingStage}` : ""
                }`,
            )
          : ["No clients in onboarding."],
    },
    {
      heading: "Renewals",
      rows: [],
      bullets:
        renewals.length > 0
          ? renewals
              .slice(0, 10)
              .map(
                (client) =>
                  `${client.companyName} · renewal ${client.renewalDate}${
                    client.subscriptionStatus ? ` · ${client.subscriptionStatus}` : ""
                  }`,
              )
          : ["No renewal dates on file."],
    },
    {
      heading: "Support / notes",
      rows: [],
      bullets: clients
        .filter((client) => Boolean(client.notes?.trim()))
        .slice(0, 8)
        .map((client) => `${client.companyName}: ${client.notes.trim()}`),
    },
  ];
}

export async function generateTypedReportPdf(input: {
  reportType: Exclude<AssistantReportType, "financial" | "employee">;
  userId: string;
  organisationName?: string | null;
  title?: string;
  filename?: string;
  projects: InternalProject[];
  clients: ManagedClient[];
  employees: HrEmployee[];
  overview?: FinancialOverviewSnapshot | null;
}): Promise<AssistantStoredArtifact> {
  const meta = reportDisplayMeta(input.reportType);
  const title = input.title?.trim() || meta.title;
  const filename = input.filename?.trim() || meta.filename;

  let sections: ReportSection[];
  let subtitle: string;
  switch (input.reportType) {
    case "engineering":
      sections = buildEngineeringSections(input.projects);
      subtitle = "Live engineering delivery status";
      break;
    case "board":
      sections = buildBoardSections({
        projects: input.projects,
        clients: input.clients,
        employees: input.employees,
        overview: input.overview ?? null,
      });
      subtitle = "Board operating pack from live workspace data";
      break;
    case "project":
      sections = buildProjectSections(input.projects);
      subtitle = "Project portfolio from live records";
      break;
    case "client":
      sections = buildClientSections(input.clients, input.projects);
      subtitle = "Client portfolio from live directory";
      break;
    default: {
      const _exhaustive: never = input.reportType;
      throw new Error(`Unsupported report type: ${_exhaustive}`);
    }
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  drawBrandedHeader(doc, input.organisationName, title, subtitle);
  renderSections(doc, sections);

  const arrayBuffer = doc.output("arraybuffer");
  const bytes = Buffer.from(arrayBuffer);
  const id = createArtifactId();

  return putAssistantArtifact({
    id,
    kind: "pdf",
    title,
    filename,
    mimeType: "application/pdf",
    bytes,
    userId: input.userId,
    meta: {
      reportType: input.reportType,
      generatedAt: new Date().toISOString(),
    },
  });
}
