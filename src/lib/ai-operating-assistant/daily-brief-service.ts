import { listProjects } from "@/lib/internal-projects-service";
import { listInternalClients } from "@/lib/internal-clients-service";
import { listLeads } from "@/lib/crm-leads-service";
import { listHrEmployees } from "@/lib/hr-employees-service";
import { vacationDaysRemaining } from "@/lib/hr-data";
import { loadLiveInvoices } from "./live-finance";
import { isOverdue } from "./tool-result";
import type { AssistantBusinessContext } from "./types";
import type { DailyExecutiveBrief } from "./executive-types";
import { briefDateKey } from "./date-keys";
import { analysePlatformInsights } from "./insight-service";
import {
  filterWorkflowsForRole,
  getRoleFocusProfile,
  resolveExecutivePersona,
} from "./role-awareness";
import { workflowsForPermissions } from "./workflow-registry";

export { briefDateKey } from "./date-keys";

/**
 * Daily Executive Brief — personalised, concise, actionable.
 * Generated from live platform data only (no mock revenue / debtors / careers).
 */
export async function buildDailyExecutiveBrief(
  context: AssistantBusinessContext,
  precomputed?: { insights: Awaited<ReturnType<typeof analysePlatformInsights>>["insights"]; dataGaps: string[] },
): Promise<DailyExecutiveBrief> {
  const persona = resolveExecutivePersona(
    context.permissions.roleView,
    context.user.displayName,
  );
  const focus = getRoleFocusProfile(persona);
  const pack = precomputed ?? (await analysePlatformInsights(context));
  const insights = pack.insights;
  const dataGaps = [...pack.dataGaps];

  const [projects, clients, leads] = await Promise.all([
    listProjects().catch(() => []),
    listInternalClients().catch(() => []),
    listLeads().catch(() => []),
  ]);

  const overdueProjects = projects.filter((project) => isOverdue(project.endDate));
  const upcomingDeadlines = projects.filter((project) => {
    if (!project.endDate || project.phase !== "live") return false;
    const end = new Date(`${project.endDate}T12:00:00`);
    const days = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 14;
  });

  const criticalInsights = insights.filter(
    (entry) => entry.severity === "critical" || entry.severity === "high",
  );

  const priorities = [
    ...criticalInsights.slice(0, 3).map((entry) => entry.title),
    ...overdueProjects.slice(0, 2).map((project) => `At risk: ${project.name}`),
  ].slice(0, 5);

  const sections: DailyExecutiveBrief["sections"] = [
    {
      id: "priorities",
      title: "Today's priorities",
      bullets: priorities,
      insightIds: criticalInsights.slice(0, 3).map((entry) => entry.id),
    },
    {
      id: "projects_at_risk",
      title: "Projects at risk",
      bullets:
        overdueProjects.length > 0
          ? overdueProjects.slice(0, 5).map((project) => `${project.name} · ${project.clientName}`)
          : ["No overdue projects in the current live dataset."],
    },
    {
      id: "overdue_tasks",
      title: "Overdue tasks",
      bullets: insights
        .filter((entry) => entry.category === "operations")
        .slice(0, 5)
        .map((entry) => entry.title),
    },
    {
      id: "upcoming_deadlines",
      title: "Upcoming deadlines",
      bullets:
        upcomingDeadlines.length > 0
          ? upcomingDeadlines
              .slice(0, 5)
              .map((project) => `${project.name} · ends ${project.endDate}`)
          : ["No project deadlines in the next 14 days."],
    },
  ];

  if (sections.find((section) => section.id === "overdue_tasks")?.bullets.length === 0) {
    sections.find((section) => section.id === "overdue_tasks")!.bullets = [
      "No overdue CRM next-actions flagged from live leads.",
    ];
  }

  sections.push({
    id: "contracts",
    title: "Contracts nearing expiry",
    bullets: insights
      .filter((entry) => entry.category === "contracts")
      .slice(0, 4)
      .map((entry) => entry.title),
  });
  if ((sections.at(-1)?.bullets.length ?? 0) === 0) {
    sections[sections.length - 1]!.bullets = [
      "No structured contract expiry dates — review Trial accounts and Files.",
    ];
  }

  if (context.permissions.canAccessHr) {
    const employees = await listHrEmployees().catch(() => []);
    const leaveToday = employees.filter((employee) => vacationDaysRemaining(employee) <= 0);

    sections.push({
      id: "recruitment",
      title: "Recruitment activity",
      bullets: ["Waiting for live business data — careers applicant storage is not connected yet."],
    });
    dataGaps.push("Careers applicant pipeline is not connected to live storage.");

    sections.push({
      id: "leave",
      title: "Leave today",
      bullets:
        leaveToday.length > 0
          ? leaveToday.slice(0, 5).map((employee) => employee.fullName)
          : ["No leave signals from vacation balances (dated leave calendar not stored)."],
    });
  }

  if (context.permissions.canAccessFinancials) {
    const invoiceLoad = await loadLiveInvoices();
    if (!invoiceLoad.ok) {
      sections.push({
        id: "finance",
        title: "Financial highlights",
        bullets: ["Waiting for live business data — invoice ledger could not be loaded."],
      });
      dataGaps.push(invoiceLoad.error);
    } else {
      sections.push({
        id: "finance",
        title: "Financial highlights",
        bullets: [
          `${invoiceLoad.invoices.length} invoices in the live ledger`,
          invoiceLoad.overdue.length > 0
            ? `${invoiceLoad.overdue.length} overdue invoice${invoiceLoad.overdue.length === 1 ? "" : "s"}`
            : "No overdue invoices in the live ledger.",
          ...invoiceLoad.overdue.slice(0, 2).map((invoice) => {
            return `${invoice.clientName ?? invoice.invoiceNumber}: ${invoice.currency} ${invoice.amount.toLocaleString()} · due ${invoice.dueDate}`;
          }),
        ],
      });
    }
  }

  const recentClients = clients.slice(0, 3);
  const recentLeads = leads.slice(0, 3);
  sections.push({
    id: "customer_activity",
    title: "Recent customer activity",
    bullets: [
      ...recentClients.map(
        (client) => `Client · ${client.companyName} · ${client.accountStatus}`,
      ),
      ...recentLeads.map(
        (lead) => `CRM · ${lead.companyName || lead.contactName} · ${lead.status}`,
      ),
    ].slice(0, 6),
  });
  if ((sections.at(-1)?.bullets.length ?? 0) === 0) {
    sections[sections.length - 1]!.bullets = ["No recent client/CRM rows available."];
  }

  sections.push({
    id: "ai_recommendations",
    title: "Recent AI recommendations",
    bullets: insights.slice(0, 4).map((entry) => {
      const action = entry.recommendedActions[0]?.label;
      return action ? `${entry.title} → ${action}` : entry.title;
    }),
  });

  const workflows = filterWorkflowsForRole(
    workflowsForPermissions(context.permissions),
    persona,
  )
    .slice(0, 4)
    .map((workflow) => workflow.id);

  const firstName = context.user.displayName.trim().split(/\s+/)[0] || "there";
  const attentionCount = priorities.length + criticalInsights.length;

  return {
    id: `brief_${briefDateKey()}_${context.user.id}`,
    dateKey: briefDateKey(),
    greeting: firstName,
    headline:
      attentionCount > 0
        ? `Today’s operating picture · ${focus.label}`
        : `All clear for now · ${focus.label}`,
    priorities,
    sections,
    insights: insights.slice(0, 12),
    recommendedWorkflows: workflows,
    followUpActions: [
      {
        id: "tour_home",
        label: "Show Me Around",
        kind: "navigate",
        href: "guided://start_tour?view=home",
      },
      ...insights
        .slice(0, 2)
        .flatMap((entry) => entry.recommendedActions.slice(0, 1)),
    ],
    dataGaps,
    generatedAt: new Date().toISOString(),
  };
}
