import { listInternalClients } from "@/lib/internal-clients-service";
import { listProjects } from "@/lib/internal-projects-service";
import { listHrEmployees } from "@/lib/hr-employees-service";
import { vacationDaysRemaining } from "@/lib/hr-data";
import { listLeads } from "@/lib/crm-leads-service";
import { daysOverdue, loadLiveInvoices } from "./live-finance";
import { isOverdue, parseDate, type AssistantFollowUpAction } from "./tool-result";
import type { AssistantBusinessContext } from "./types";
import type { ExecutiveInsight, ProactiveNotification } from "./executive-types";
import {
  filterInsightsForRole,
  resolveExecutivePersona,
} from "./role-awareness";
import {
  buildExplanation,
  inferDrillDown,
  type AiEvidenceItem,
  type AiExplanation,
} from "./explainability";

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(iso: string | null | undefined, now = new Date()) {
  const date = parseDate(iso);
  if (!date) return null;
  return daysBetween(now, date);
}

function daysSince(iso: string | null | undefined, now = new Date()) {
  const date = parseDate(iso);
  if (!date) return null;
  return daysBetween(date, now);
}

function nav(href: string, label: string): AssistantFollowUpAction {
  return { id: `nav_${href}_${label}`, label, kind: "navigate", href };
}

function actions(...entries: AssistantFollowUpAction[]): AssistantFollowUpAction[] {
  return entries;
}

function defaultSources(category: ExecutiveInsight["category"]): string[] {
  switch (category) {
    case "projects":
      return ["supabase:internal_projects"];
    case "clients":
    case "contracts":
      return ["supabase:internal_clients"];
    case "finance":
      return ["supabase:invoices"];
    case "hr":
    case "recruitment":
      return ["supabase:hr_employees"];
    case "crm":
      return ["supabase:crm_leads"];
    case "operations":
      return ["supabase:crm_leads.next_action"];
    case "compliance":
      return ["ai:compliance-watch"];
    default:
      return ["live-platform"];
  }
}

function insight(
  partial: Omit<ExecutiveInsight, "generatedAt" | "explanation"> & {
    generatedAt?: string;
    explanation?: AiExplanation;
    evidence?: AiEvidenceItem[];
    dataSources?: string[];
    reasoningSummary?: string;
    assumptions?: string[];
    confidence?: number;
  },
): ExecutiveInsight {
  const recommendedActions = partial.recommendedActions;
  const href = recommendedActions.find((action) => action.href)?.href;
  const explanation =
    partial.explanation ??
    buildExplanation({
      confidence: partial.confidence,
      severity: partial.severity,
      evidence:
        partial.evidence ??
        [{ label: partial.summary, recordType: partial.entityType, recordId: partial.entityId, href }],
      dataSources: partial.dataSources ?? defaultSources(partial.category),
      reasoningSummary: partial.reasoningSummary ?? partial.summary,
      assumptions: partial.assumptions,
      recommendedActions,
      dataGaps: partial.dataGaps,
      drillDown: inferDrillDown({
        entityType: partial.entityType,
        entityId: partial.entityId,
        entityLabel: partial.entityLabel,
        href,
      }),
    });

  return {
    id: partial.id,
    category: partial.category,
    severity: partial.severity,
    title: partial.title,
    summary: partial.summary,
    entityType: partial.entityType,
    entityId: partial.entityId,
    entityLabel: partial.entityLabel,
    recommendedActions,
    relatedWorkflowId: partial.relatedWorkflowId,
    dataGaps: partial.dataGaps,
    explanation,
    generatedAt: partial.generatedAt ?? new Date().toISOString(),
  };
}

/**
 * Smart Insights — continuous analysis of live platform data.
 * Deterministic; LLM only narrates / prioritises via tools.
 */
export async function analysePlatformInsights(
  context: AssistantBusinessContext,
): Promise<{ insights: ExecutiveInsight[]; dataGaps: string[] }> {
  const now = new Date();
  const insights: ExecutiveInsight[] = [];
  const dataGaps: string[] = [];

  const [clients, projects, leads] = await Promise.all([
    listInternalClients().catch(() => []),
    listProjects().catch(() => []),
    listLeads().catch(() => []),
  ]);

  let employees: Awaited<ReturnType<typeof listHrEmployees>> = [];
  if (context.permissions.canAccessHr) {
    employees = await listHrEmployees().catch(() => []);
  }

  // Projects at risk: overdue end date or no update for 14+ days while live
  for (const project of projects) {
    if (project.phase === "live" && isOverdue(project.endDate)) {
      const overdueDays = daysSince(project.endDate, now) ?? 0;
      const staleDays = daysSince(project.updatedAt, now);
      insights.push(
        insight({
          id: `project_overdue_${project.id}`,
          category: "projects",
          severity: "critical",
          title: `${project.name} is past its end date`,
          summary: `Live project for ${project.clientName} is overdue${project.endDate ? ` (ended ${project.endDate})` : ""}.`,
          entityType: "project",
          entityId: project.id,
          entityLabel: project.name,
          relatedWorkflowId: "close_project",
          confidence: 92,
          evidence: [
            {
              label: `Milestone / end date overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
              detail: project.endDate ? `End date ${project.endDate}` : "End date missing",
              recordType: "project",
              recordId: project.id,
              href: "/internaldashboard?view=projects",
            },
            ...(staleDays != null
              ? [
                  {
                    label: `No activity for ${staleDays} day${staleDays === 1 ? "" : "s"}`,
                    detail: `Last update ${project.updatedAt.slice(0, 10)}`,
                    recordType: "project",
                    recordId: project.id,
                    href: "/internaldashboard?view=projects",
                  },
                ]
              : []),
            {
              label: `Phase is live with progress at ${project.progressPct}%`,
              detail: project.progressPct >= 95 ? "Capacity / completion pressure high" : undefined,
              recordType: "project",
              recordId: project.id,
            },
          ],
          reasoningSummary: `${project.name} remains live after its planned end date, so delivery risk is elevated until status is corrected or the project is closed.`,
          assumptions: [
            "End date on the project record is the authoritative milestone.",
            "updated_at is used as the activity signal.",
          ],
          recommendedActions: actions(
            nav("/internaldashboard?view=projects", "Open Project"),
            {
              id: "email_pm",
              label: "Email Project Manager",
              kind: "email",
            },
            { id: "schedule_review", label: "Schedule Review", kind: "generate" },
            { id: "risk_report", label: "Generate Risk Report", kind: "generate" },
          ),
        }),
      );
    }

    const staleDays = daysSince(project.updatedAt, now);
    if (project.phase === "live" && staleDays != null && staleDays >= 14) {
      insights.push(
        insight({
          id: `project_stale_${project.id}`,
          category: "projects",
          severity: staleDays >= 30 ? "high" : "medium",
          title: `${project.name} has had no activity for ${staleDays} days`,
          summary: `No project updates since ${project.updatedAt.slice(0, 10)}. Delivery risk may be rising.`,
          entityType: "project",
          entityId: project.id,
          entityLabel: project.name,
          relatedWorkflowId: "close_project",
          evidence: [
            {
              label: `No activity for ${staleDays} days`,
              detail: `Last update ${project.updatedAt.slice(0, 10)}`,
              recordType: "project",
              recordId: project.id,
              href: "/internaldashboard?view=projects",
            },
            {
              label: "Project phase is still live",
              recordType: "project",
              recordId: project.id,
            },
          ],
          reasoningSummary: `Live projects without recent updates often indicate blocked work or missing status discipline.`,
          assumptions: ["updated_at reflects meaningful project activity."],
          recommendedActions: actions(
            nav("/internaldashboard?view=projects", "Open Project"),
            { id: "email_pm", label: "Email Project Manager", kind: "email" },
            { id: "schedule_review", label: "Schedule Review", kind: "generate" },
          ),
        }),
      );
    }

    const untilEnd = daysUntil(project.endDate, now);
    if (
      project.phase === "live" &&
      untilEnd != null &&
      untilEnd >= 0 &&
      untilEnd <= 14
    ) {
      insights.push(
        insight({
          id: `project_deadline_${project.id}`,
          category: "projects",
          severity: untilEnd <= 3 ? "high" : "medium",
          title: `${project.name} deadline in ${untilEnd} day${untilEnd === 1 ? "" : "s"}`,
          summary: `Upcoming end date ${project.endDate} for ${project.clientName}.`,
          entityType: "project",
          entityId: project.id,
          entityLabel: project.name,
          recommendedActions: actions(
            nav("/internaldashboard?view=projects", "Open Project"),
            { id: "schedule_review", label: "Schedule Review", kind: "generate" },
          ),
        }),
      );
    }
  }

  // Clients inactive / not contacted — approximate via status + zero projects
  for (const client of clients) {
    if (
      client.accountStatus === "Active" &&
      client.activeProjects === 0
    ) {
      insights.push(
        insight({
          id: `client_inactive_${client.id}`,
          category: "clients",
          severity: "medium",
          title: `${client.companyName} has no active projects`,
          summary:
            "Active client with zero live projects — possible 45+ day contact gap (last-contact timestamps not stored yet).",
          entityType: "client",
          entityId: client.id,
          entityLabel: client.companyName,
          dataGaps: [
            "Client last-contact timestamps are not stored; using activeProjects as a proxy.",
          ],
          relatedWorkflowId: "create_project",
          recommendedActions: actions(
            nav("/internaldashboard?view=clients", "Open Client"),
            { id: "email_client", label: "Email Client", kind: "email" },
            nav("/internaldashboard?view=crm", "Open CRM"),
          ),
        }),
      );
    }

    if (client.accountStatus === "Dormant" || client.accountStatus === "Archived") {
      insights.push(
        insight({
          id: `client_dormant_${client.id}`,
          category: "clients",
          severity: "low",
          title: `${client.companyName} is ${client.accountStatus}`,
          summary: "Customer inactive — consider re-engagement or archive.",
          entityType: "client",
          entityId: client.id,
          entityLabel: client.companyName,
          recommendedActions: actions(
            nav("/internaldashboard?view=clients", "Open Client"),
            nav("/internaldashboard?view=crm", "Log CRM action"),
          ),
        }),
      );
    }

    // Contract nearing expiry — no expiry column; flag Trial / Project-based as review-needed
    if (client.contractType === "Trial") {
      insights.push(
        insight({
          id: `contract_trial_${client.id}`,
          category: "contracts",
          severity: "medium",
          title: `${client.companyName} is on a Trial contract`,
          summary:
            "Trial agreements typically need renewal within ~30 days — confirm expiry in Files.",
          entityType: "client",
          entityId: client.id,
          entityLabel: client.companyName,
          dataGaps: ["Contract expiry dates are not stored as structured fields yet."],
          relatedWorkflowId: "onboard_client",
          recommendedActions: actions(
            nav("/internaldashboard?view=clients", "Open Client"),
            nav("/internaldashboard?view=files-internal", "Upload / find contract"),
          ),
        }),
      );
    }
  }

  // Operational tasks — live CRM next-actions only (no mock command-centre tasks)
  for (const lead of leads) {
    const next = (lead.nextAction ?? "").trim();
    if (!next) continue;
    const due = lead.nextActionDate ?? null;
    const overdueNext = due ? isOverdue(due) : false;
    if (!overdueNext) continue;
    insights.push(
      insight({
        id: `crm_task_${lead.id}`,
        category: "operations",
        severity: "high",
        title: next,
        summary: `CRM next action overdue for ${lead.companyName || lead.contactName}${due ? ` · due ${due}` : ""}`,
        entityType: "lead",
        entityId: lead.id,
        entityLabel: lead.companyName || lead.contactName,
        dataSources: ["supabase:crm_leads.next_action"],
        recommendedActions: actions(
          nav("/internaldashboard?view=crm", "Open CRM"),
          { id: `email_${lead.id}`, label: "Email Contact", kind: "email" },
        ),
      }),
    );
  }

  // Finance — live overdue invoices only
  if (context.permissions.canAccessFinancials) {
    const invoiceLoad = await loadLiveInvoices();
    if (!invoiceLoad.ok) {
      dataGaps.push("Live invoice ledger unavailable — financial pulse is waiting for live business data.");
    } else if (invoiceLoad.overdue.length === 0) {
      // no fabricated “all clear” insight — absence is reported via brief/health gaps
    } else {
      for (const invoice of invoiceLoad.overdue.slice(0, 12)) {
        const days = daysOverdue(invoice);
        insights.push(
          insight({
            id: `invoice_${invoice.id}`,
            category: "finance",
            severity: days >= 30 ? "critical" : "high",
            title: `Invoice overdue · ${invoice.clientName ?? invoice.invoiceNumber}`,
            summary: `${invoice.invoiceNumber} · ${invoice.currency} ${invoice.amount.toLocaleString()} · ${days} days overdue`,
            entityType: "invoice",
            entityId: invoice.id,
            entityLabel: invoice.clientName ?? invoice.invoiceNumber,
            dataSources: ["supabase:invoices"],
            relatedWorkflowId: "chase_overdue_invoice",
            recommendedActions: actions(
              nav("/internaldashboard?view=financials", "Open Finance"),
              nav("/internaldashboard?view=debtors", "Open Debtors"),
              { id: "email_accounts", label: "Email Accounts Contact", kind: "email" },
            ),
          }),
        );
      }
    }
  }

  // HR — leave / capacity / training proxy
  if (context.permissions.canAccessHr) {
    for (const employee of employees) {
      const remaining = vacationDaysRemaining(employee);
      if (remaining <= 0) {
        insights.push(
          insight({
            id: `leave_${employee.id}`,
            category: "hr",
            severity: "medium",
            title: `${employee.fullName} may be on leave / no vacation remaining`,
            summary: "Leave calendar is not stored; zero remaining days used as proxy for leave today.",
            entityType: "employee",
            entityId: employee.id,
            entityLabel: employee.fullName,
            dataGaps: ["Dated leave requests are not stored yet."],
            relatedWorkflowId: "approve_leave",
            recommendedActions: actions(
              nav("/internaldashboard?view=hr", "Open HR"),
              { id: "approve_leave", label: "Approve Leave", kind: "confirm_action", actionId: "approve_leave", requiresConfirmation: true },
            ),
          }),
        );
      }

      // Workload proxy: managers with many direct reports not available — use role keywords
      if (
        /lead|manager|director|head/i.test(employee.role) &&
        employees.filter((row) => row.manager === employee.fullName).length >= 6
      ) {
        const reports = employees.filter((row) => row.manager === employee.fullName).length;
        insights.push(
          insight({
            id: `workload_${employee.id}`,
            category: "hr",
            severity: "medium",
            title: `${employee.fullName} workload may exceed capacity`,
            summary: `${reports} direct reports listed — review capacity before new assignments.`,
            entityType: "employee",
            entityId: employee.id,
            entityLabel: employee.fullName,
            recommendedActions: actions(
              nav("/internaldashboard?view=hr", "Open HR"),
              nav("/internaldashboard?view=projects", "Review Projects"),
            ),
          }),
        );
      }
    }

    dataGaps.push(
      "Careers / recruitment applicant pipeline is not connected to live storage — recruitment metrics show no information available yet.",
    );

    insights.push(
      insight({
        id: "training_compliance_watch",
        category: "compliance",
        severity: "low",
        title: "Mandatory training expiry watch",
        summary:
          "Training expiry dates are not fully structured yet — review QMS Training next month.",
        dataGaps: ["Mandatory training expiry dates are not stored as a dedicated field."],
        recommendedActions: actions(
          nav("/internaldashboard?view=qms-training", "Open QMS Training"),
          nav("/internaldashboard?view=training", "Open Training"),
        ),
      }),
    );
  }

  // CRM hot leads without next action
  for (const lead of leads) {
    const status = (lead.status ?? "").toLowerCase();
    if (status.includes("hot") || status === "qualified") {
      const next = (lead.nextAction ?? "").trim();
      if (!next) {
        insights.push(
          insight({
            id: `crm_hot_${lead.id}`,
            category: "crm",
            severity: "medium",
            title: `Hot lead needs next action · ${lead.companyName || lead.contactName}`,
            summary: "Pipeline opportunity has no logged next action.",
            entityType: "lead",
            entityId: lead.id,
            entityLabel: lead.companyName || lead.contactName,
            recommendedActions: actions(
              nav("/internaldashboard?view=crm", "Open CRM"),
              { id: "email_lead", label: "Email Contact", kind: "email" },
            ),
          }),
        );
      }
    }
  }

  const persona = resolveExecutivePersona(
    context.permissions.roleView,
    context.user.displayName,
  );
  const filtered = filterInsightsForRole(insights, persona, 40);

  const uniqueGaps = [
    ...new Set([
      ...dataGaps,
      ...filtered.flatMap((entry) => entry.dataGaps ?? []),
    ]),
  ];

  return { insights: filtered, dataGaps: uniqueGaps };
}

export function insightsToNotifications(
  insights: ExecutiveInsight[],
  limit = 5,
): ProactiveNotification[] {
  return insights
    .filter((entry) => entry.severity === "critical" || entry.severity === "high")
    .slice(0, limit)
    .map((entry) => ({
      id: `notif_${entry.id}`,
      insightId: entry.id,
      severity: entry.severity,
      title: entry.title,
      body: entry.summary,
      href: entry.explanation.drillDown?.href ?? entry.recommendedActions.find((action) => action.href)?.href,
      workflowId: entry.relatedWorkflowId,
      confidence: entry.explanation.confidence,
      explanation: entry.explanation,
      createdAt: entry.generatedAt,
    }));
}
