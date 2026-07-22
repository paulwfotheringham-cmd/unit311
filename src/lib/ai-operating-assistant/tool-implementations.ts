import { listInternalClients } from "@/lib/internal-clients-service";
import { listProjects } from "@/lib/internal-projects-service";
import { listHrEmployees } from "@/lib/hr-employees-service";
import { vacationDaysRemaining } from "@/lib/hr-data";
import { listLeads } from "@/lib/crm-leads-service";
import { browseFolder, getFileDownloadUrl } from "@/lib/internal-files-service";
import { listExpenses } from "@/lib/financial-expenses-service";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { INTERNAL_FILES_BUCKET } from "@/lib/internal-files-data";
import { loadLiveInvoices } from "./live-finance";

import { actionFollowUps } from "./action-service";
import type { AssistantToolExecutionContext } from "./tool-result";
import {
  asNumber,
  asString,
  isOverdue,
  matchesQuery,
  parseDate,
  toolError,
  toolForbidden,
  toolOk,
  type AssistantFollowUpAction,
  type AssistantToolResult,
} from "./tool-result";

function nav(href: string, label: string): AssistantFollowUpAction {
  return { id: `nav_${href}`, label, kind: "navigate", href };
}

/** Contextual navigate-only follow-ups — never fake Excel/PDF/Email menus. */
function exportActions(_entity: string): AssistantFollowUpAction[] {
  return [];
}

function resolveClientFilter(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  return (
    asString(args.clientId) ||
    ctx.business.selection.clientId ||
    undefined
  );
}

function resolveClientName(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  return asString(args.clientName) || ctx.business.selection.clientName || undefined;
}

export async function searchClients(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  try {
    const clients = await listInternalClients();
    const query = asString(args.query);
    const status = asString(args.status);
    const inactiveDays = asNumber(args.inactiveDays, 0);
    const selectedId = resolveClientFilter(args, ctx);

    let filtered = clients.filter((client) => {
      if (selectedId && client.id === selectedId && !query && !status) return true;
      if (status && client.accountStatus.toLowerCase() !== status.toLowerCase()) return false;
      const haystack = [
        client.companyName,
        client.primaryContact,
        client.email,
        client.industry,
        client.region,
        client.notes,
      ].join(" ");
      return matchesQuery(haystack, query);
    });

    if (selectedId && (query || status)) {
      // keep broader search, but prefer selected when no query
    } else if (selectedId && !query && !status) {
      filtered = clients.filter((client) => client.id === selectedId);
    }

    if (inactiveDays > 0) {
      // No last-activity column — approximate via dormant/archived status + zero projects.
      filtered = filtered.filter(
        (client) =>
          client.accountStatus === "Dormant" ||
          client.accountStatus === "Archived" ||
          client.activeProjects === 0,
      );
    }

    const activeCount = clients.filter((client) => client.accountStatus === "Active").length;

    return toolOk(
      "searchClients",
      filtered.map((client) => ({
        id: client.id,
        companyName: client.companyName,
        accountStatus: client.accountStatus,
        industry: client.industry,
        region: client.region,
        contractType: client.contractType,
        primaryContact: client.primaryContact,
        email: client.email,
        activeProjects: client.activeProjects,
        filesFolderId: client.filesFolderId ?? null,
      })),
      {
        source: ["supabase:internal_clients"],
        page: asNumber(args.page, 1),
        pageSize: asNumber(args.pageSize, 20),
        summary: {
          activeClients: activeCount,
          matched: filtered.length,
          totalClients: clients.length,
        },
        dataGaps:
          inactiveDays > 0
            ? [
                "Client last-activity timestamps are not stored yet; inactive filter uses status and activeProjects.",
              ]
            : undefined,
        followUpActions: [
          nav("/internaldashboard?view=clients", "View Clients"),
          ...exportActions("clients"),
          ...actionFollowUps(["create_client"]),
        ],
        citations: filtered.slice(0, 10).map((client) => ({
          type: "client",
          id: client.id,
          label: client.companyName,
        })),
        appliedContext: {
          clientId: selectedId ?? null,
          clientName: resolveClientName(args, ctx) ?? null,
          activeView: ctx.business.page.activeView,
        },
      },
    );
  } catch (error) {
    return toolError(
      "searchClients",
      error instanceof Error ? error.message : "Failed to search clients",
      ["supabase:internal_clients"],
    );
  }
}

export async function searchProjects(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  try {
    const projects = await listProjects();
    const query = asString(args.query);
    const phase = asString(args.phase) ?? "all";
    const overdueOnly = args.overdue === true || args.overdue === "true";
    const clientId = resolveClientFilter(args, ctx);
    const clientName = resolveClientName(args, ctx);
    const selectedProjectId =
      asString(args.projectId) || ctx.business.selection.projectId || undefined;

    const filtered = projects.filter((project) => {
      if (selectedProjectId && project.id !== selectedProjectId && !query) return false;
      if (phase !== "all" && project.phase !== phase) return false;
      if (clientId && project.clientId !== clientId) return false;
      if (clientName && !matchesQuery(project.clientName, clientName)) return false;
      if (overdueOnly && !isOverdue(project.endDate)) return false;
      const haystack = [
        project.name,
        project.clientName,
        project.site ?? "",
        project.region ?? "",
        project.operator ?? "",
        project.notes ?? "",
      ].join(" ");
      return matchesQuery(haystack, query);
    });

    const overdue = projects.filter((project) => isOverdue(project.endDate));

    return toolOk(
      "searchProjects",
      filtered.map((project) => ({
        id: project.id,
        name: project.name,
        clientId: project.clientId,
        clientName: project.clientName,
        phase: project.phase,
        startDate: project.startDate,
        endDate: project.endDate,
        progressPct: project.progressPct,
        overdue: isOverdue(project.endDate),
        operator: project.operator,
        region: project.region,
      })),
      {
        source: ["supabase:internal_projects"],
        page: asNumber(args.page, 1),
        pageSize: asNumber(args.pageSize, 20),
        summary: {
          matched: filtered.length,
          live: projects.filter((project) => project.phase === "live").length,
          upcoming: projects.filter((project) => project.phase === "upcoming").length,
          overdueCount: overdue.length,
        },
        followUpActions: [
          nav("/internaldashboard?view=projects", "View Projects"),
          ...exportActions("projects"),
          ...(filtered[0]
            ? [
                nav(
                  `/internaldashboard?view=projects`,
                  `Open Project · ${filtered[0].name}`,
                ),
              ]
            : []),
          ...actionFollowUps(["create_project"]),
        ],
        citations: filtered.slice(0, 10).map((project) => ({
          type: "project",
          id: project.id,
          label: project.name,
        })),
        appliedContext: {
          clientId: clientId ?? null,
          clientName: clientName ?? null,
          projectId: selectedProjectId ?? null,
          activeView: ctx.business.page.activeView,
        },
      },
    );
  } catch (error) {
    return toolError(
      "searchProjects",
      error instanceof Error ? error.message : "Failed to search projects",
      ["supabase:internal_projects"],
    );
  }
}

export async function searchEmployees(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  if (!ctx.business.permissions.canAccessHr) {
    return toolForbidden(
      "searchEmployees",
      "Your current role cannot access HR employee data.",
    );
  }

  try {
    const employees = await listHrEmployees();
    const query = asString(args.query);
    const onLeave = args.onLeave === true || args.onLeave === "true";
    const selectedId =
      asString(args.employeeId) || ctx.business.selection.employeeId || undefined;
    const includeCompensation = false;

    let filtered = employees.filter((employee) => {
      if (selectedId) return employee.id === selectedId;
      const haystack = [
        employee.fullName,
        employee.email,
        employee.role,
        employee.department,
        employee.manager,
        employee.location,
      ].join(" ");
      return matchesQuery(haystack, query);
    });

    if (onLeave) {
      // No leave-request calendar — approximate with zero remaining vacation days.
      filtered = filtered.filter((employee) => vacationDaysRemaining(employee) <= 0);
    }

    const openingsUnavailable =
      "Careers openings are not connected to live storage — open recruitment count is unavailable.";

    return toolOk(
      "searchEmployees",
      filtered.map((employee) => ({
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        manager: employee.manager,
        location: employee.location,
        vacationDaysRemaining: vacationDaysRemaining(employee),
        vacationDaysTaken: employee.vacationDaysTaken,
        vacationDaysPerYear: employee.vacationDaysPerYear,
        ...(includeCompensation
          ? {
              salaryCurrent: employee.salaryCurrent,
              bonus: employee.bonus,
            }
          : {}),
      })),
      {
        source: ["supabase:hr_employees"],
        page: asNumber(args.page, 1),
        pageSize: asNumber(args.pageSize, 20),
        summary: {
          matched: filtered.length,
          headcount: employees.length,
          openRecruitmentPositions: null,
          openRoles: [] as string[],
        },
        dataGaps: [
          "Dated leave requests are not stored; onLeave approximates employees with no remaining vacation days.",
          openingsUnavailable,
        ],
        followUpActions: [
          {
            id: "generate_employee_pdf",
            label: "Generate PDF",
            kind: "generate",
            actionId: "generateEmployeeListPdf",
          },
        ],
        citations: filtered.slice(0, 10).map((employee) => ({
          type: "employee",
          id: employee.id,
          label: employee.fullName,
        })),
        appliedContext: {
          employeeId: selectedId ?? null,
          employeeName: ctx.business.selection.employeeName,
          activeView: ctx.business.page.activeView,
        },
      },
    );
  } catch (error) {
    return toolError(
      "searchEmployees",
      error instanceof Error ? error.message : "Failed to search employees",
      ["supabase:hr_employees"],
    );
  }
}

export async function searchTasks(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  try {
    const query = asString(args.query);
    const overdueOnly = args.overdue === true || args.overdue === "true";
    const status = asString(args.status);
    const now = new Date();

    const leads = await listLeads("All").catch(() => []);
    const crmTasks = leads
      .filter((lead) => lead.nextAction?.trim())
      .map((lead) => ({
        id: `crm-task-${lead.id}`,
        title: lead.nextAction,
        assignedTo: "Unassigned",
        due: lead.nextActionDate || null,
        priority: lead.status === "Hot" ? "high" : "medium",
        status: isOverdue(lead.nextActionDate, now) ? "overdue" : "open",
        source: "crm_next_action",
        href: "/internaldashboard?view=crm",
        projectId: null as string | null,
        clientId: null as string | null,
        companyName: lead.companyName,
      }));

    let items = [...crmTasks];
    if (status) {
      items = items.filter((item) => item.status === status.toLowerCase());
    }
    if (overdueOnly) {
      items = items.filter((item) => item.status === "overdue");
    }
    if (query) {
      items = items.filter((item) =>
        matchesQuery(`${item.title} ${item.assignedTo} ${item.source}`, query),
      );
    }

    const workload = new Map<string, number>();
    for (const item of items) {
      workload.set(item.assignedTo, (workload.get(item.assignedTo) ?? 0) + 1);
    }
    const highestWorkload = [...workload.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

    return toolOk("searchTasks", items, {
      source: ["supabase:crm_leads.next_action"],
      page: asNumber(args.page, 1),
      pageSize: asNumber(args.pageSize, 20),
      summary: {
        matched: items.length,
        overdueCount: items.filter((item) => item.status === "overdue").length,
        highestWorkload: highestWorkload
          ? { assignee: highestWorkload[0], openTasks: highestWorkload[1] }
          : null,
      },
      dataGaps: [
        "Dedicated tasks table is not live; results use CRM next actions only.",
      ],
      followUpActions: [
        nav("/internaldashboard", "View Tasks"),
        ...exportActions("tasks"),
        nav("/internaldashboard?view=projects", "Open Project"),
        nav("/internaldashboard?view=crm", "Open CRM"),
      ],
      citations: items.slice(0, 10).map((item) => ({
        type: "task",
        id: item.id,
        label: item.title,
      })),
      appliedContext: {
        clientId: ctx.business.selection.clientId,
        projectId: ctx.business.selection.projectId,
        activeView: ctx.business.page.activeView,
      },
      status: "partial",
    });
  } catch (error) {
    return toolError(
      "searchTasks",
      error instanceof Error ? error.message : "Failed to search tasks",
    );
  }
}

export async function searchFiles(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  try {
    const query = asString(args.query);
    const fileId =
      asString(args.fileId) || ctx.business.selection.fileId || undefined;
    const analyze = args.analyze === true || args.analyze === "true" || Boolean(fileId);
    const mention = asString(args.mention) || query;

    if (fileId && analyze) {
      const content = await readFileTextSnippet(fileId);
      const download = await getFileDownloadUrl(fileId).catch(() => null);
      return toolOk(
        "searchFiles",
        [
          {
            id: fileId,
            name: download?.name ?? fileId,
            mimeType: download?.mimeType ?? null,
            downloadUrl: download?.url ?? null,
            textExcerpt: content.excerpt,
            analysisHints: buildDocumentHints(content.excerpt, mention),
          },
        ],
        {
          source: ["supabase:file_objects", "supabase:storage"],
          page: 1,
          pageSize: 1,
          summary: {
            analyzed: true,
            bytesRead: content.bytesRead,
            truncated: content.truncated,
          },
          dataGaps: content.dataGaps,
          followUpActions: [
            nav("/internaldashboard?view=files-internal", "View Files"),
          ],
          citations: [
            {
              type: "file",
              id: fileId,
              label: download?.name ?? fileId,
            },
          ],
          appliedContext: {
            fileId,
            fileName: download?.name ?? ctx.business.selection.fileName,
            activeView: ctx.business.page.activeView,
          },
        },
      );
    }

    const browse = await browseFolder({ query: mention });
    const files = browse.entries
      .filter((entry) => entry.kind === "file")
      .map((entry) => entry.item);
    const filtered = mention
      ? files.filter((entry) => matchesQuery(entry.name, mention))
      : files;

    return toolOk(
      "searchFiles",
      filtered.map((entry) => ({
        id: entry.id,
        name: entry.name,
        folderId: entry.folderId,
        mimeType: entry.mimeType,
        extension: entry.extension,
        sizeBytes: entry.sizeBytes,
      })),
      {
        source: ["supabase:file_objects", "supabase:file_folders"],
        page: asNumber(args.page, 1),
        pageSize: asNumber(args.pageSize, 20),
        summary: { matched: filtered.length },
        followUpActions: [
          nav("/internaldashboard?view=files-internal", "View Files"),
          ...exportActions("files"),
        ],
        citations: filtered.slice(0, 10).map((entry) => ({
          type: "file",
          id: entry.id,
          label: entry.name,
        })),
        appliedContext: {
          fileId: ctx.business.selection.fileId,
          activeView: ctx.business.page.activeView,
        },
      },
    );
  } catch (error) {
    return toolError(
      "searchFiles",
      error instanceof Error ? error.message : "Failed to search files",
      ["supabase:file_objects"],
    );
  }
}

export async function searchContracts(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  try {
    const clients = await listInternalClients();
    const employees = ctx.business.permissions.canAccessHr
      ? await listHrEmployees().catch(() => [])
      : [];
    const query = asString(args.query);
    const clientId = resolveClientFilter(args, ctx);
    const expireWithinDays = asNumber(args.expireWithinDays, 0);
    const selectedContractId =
      asString(args.contractId) || ctx.business.selection.contractId || undefined;

    const commercial = clients
      .filter((client) => !clientId || client.id === clientId)
      .map((client) => ({
        id: `client-contract-${client.id}`,
        kind: "commercial" as const,
        clientId: client.id,
        clientName: client.companyName,
        contractType: client.contractType,
        accountStatus: client.accountStatus,
        expiresOn: null as string | null,
        title: `${client.companyName} · ${client.contractType}`,
      }));

    // Employment contracts live on HrEmployeeDetail documents; list path has no embedded contract.
    const employment: Array<{
      id: string;
      kind: "employment";
      clientId: string | null;
      clientName: string | null;
      employeeId: string;
      employeeName: string;
      contractType: string;
      accountStatus: string | null;
      expiresOn: string | null;
      title: string;
      fileName: string | null;
    }> = [];

    let items = [...commercial, ...employment];
    if (selectedContractId) {
      items = items.filter((item) => item.id === selectedContractId);
    }
    if (query) {
      items = items.filter((item) => matchesQuery(JSON.stringify(item), query));
    }
    if (expireWithinDays > 0) {
      // No expiry column yet — return empty with explicit gap rather than invent dates.
      items = [];
    }

    return toolOk("searchContracts", items, {
      source: ["supabase:internal_clients.contract_type", "supabase:hr_employees.documents"],
      page: asNumber(args.page, 1),
      pageSize: asNumber(args.pageSize, 20),
      summary: {
        matched: items.length,
        commercialCount: commercial.length,
        employmentCount: employment.length,
      },
      dataGaps: [
        "Contract expiry dates are not stored on clients yet; expireWithinDays cannot be computed from live data.",
        "Commercial contracts are represented by client.contractType until a contracts module is live.",
      ],
      followUpActions: [
        nav("/internaldashboard?view=clients", "View Clients"),
        nav("/internaldashboard?view=files-internal", "View Files"),
        ...exportActions("contracts"),
      ],
      citations: items.slice(0, 10).map((item) => ({
        type: "contract",
        id: item.id,
        label: item.title,
      })),
      appliedContext: {
        clientId: clientId ?? null,
        clientName: resolveClientName(args, ctx) ?? null,
        contractId: selectedContractId ?? null,
        activeView: ctx.business.page.activeView,
      },
      status: expireWithinDays > 0 ? "partial" : "ok",
    });
  } catch (error) {
    return toolError(
      "searchContracts",
      error instanceof Error ? error.message : "Failed to search contracts",
    );
  }
}

export async function searchCRM(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  try {
    const statusFilter = asString(args.status);
    const leads = await listLeads(
      statusFilter && ["Cold", "Warm", "Hot", "Won", "Lost"].includes(statusFilter)
        ? (statusFilter as "Cold" | "Warm" | "Hot" | "Won" | "Lost")
        : "All",
    );
    const query = asString(args.query);
    const filtered = leads.filter((lead) => {
      const haystack = [
        lead.companyName,
        lead.contactName,
        lead.email,
        lead.status,
        lead.source,
        lead.nextAction,
        lead.notes,
      ].join(" ");
      return matchesQuery(haystack, query);
    });

    const openPipelineValue = filtered
      .filter((lead) => lead.status !== "Won" && lead.status !== "Lost")
      .reduce((sum, lead) => sum + (lead.estimatedValue ?? 0), 0);

    return toolOk(
      "searchCRM",
      filtered.map((lead) => ({
        id: lead.id,
        companyName: lead.companyName,
        contactName: lead.contactName,
        status: lead.status,
        assignedTo: "Unassigned",
        nextAction: lead.nextAction,
        nextActionDate: lead.nextActionDate,
        estimatedValue: lead.estimatedValue,
        source: lead.source,
      })),
      {
        source: ["supabase:crm_leads"],
        page: asNumber(args.page, 1),
        pageSize: asNumber(args.pageSize, 20),
        summary: {
          matched: filtered.length,
          openPipelineValue: Math.round(openPipelineValue),
          byStatus: {
            Cold: filtered.filter((lead) => lead.status === "Cold").length,
            Warm: filtered.filter((lead) => lead.status === "Warm").length,
            Hot: filtered.filter((lead) => lead.status === "Hot").length,
            Won: filtered.filter((lead) => lead.status === "Won").length,
            Lost: filtered.filter((lead) => lead.status === "Lost").length,
          },
        },
        followUpActions: [
          nav("/internaldashboard?view=crm", "View CRM"),
          ...exportActions("crm"),
        ],
        citations: filtered.slice(0, 10).map((lead) => ({
          type: "crm_lead",
          id: lead.id,
          label: lead.companyName,
        })),
        appliedContext: { activeView: ctx.business.page.activeView },
      },
    );
  } catch (error) {
    return toolError(
      "searchCRM",
      error instanceof Error ? error.message : "Failed to search CRM",
      ["supabase:crm_leads"],
    );
  }
}

export async function generateReport(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  const reportType = asString(args.reportType) ?? "board";
  const focus = asString(args.focus);

  try {
    if (reportType === "finance" && !ctx.business.permissions.canAccessFinancials) {
      return toolForbidden("generateReport", "Your role cannot access financial reports.");
    }
    if (reportType === "hr" && !ctx.business.permissions.canAccessHr) {
      return toolForbidden("generateReport", "Your role cannot access HR reports.");
    }

    const [clients, projects, leads, expenses, employees] = await Promise.all([
      listInternalClients().catch(() => []),
      listProjects().catch(() => []),
      listLeads("All").catch(() => []),
      ctx.business.permissions.canAccessFinancials
        ? listExpenses().catch(() => [])
        : Promise.resolve([]),
      ctx.business.permissions.canAccessHr
        ? listHrEmployees().catch(() => [])
        : Promise.resolve([]),
    ]);

    const overdueProjects = projects.filter((project) => isOverdue(project.endDate));
    const unpaidExpenses = expenses.filter((expense) => !expense.paid);
    const invoiceLoad = ctx.business.permissions.canAccessFinancials
      ? await loadLiveInvoices()
      : { ok: false as const, invoices: [], overdue: [], error: "Finance restricted" };

    const sections: Array<{ title: string; bullets: string[]; citations: string[] }> = [];

    if (reportType === "board" || reportType === "weekly" || reportType === "executive") {
      sections.push({
        title: "Executive summary",
        bullets: [
          `${clients.filter((client) => client.accountStatus === "Active").length} active clients`,
          `${projects.filter((project) => project.phase === "live").length} live projects (${overdueProjects.length} overdue by end date)`,
          `${leads.filter((lead) => lead.status === "Hot").length} hot CRM opportunities`,
        ],
        citations: ["internal_clients", "internal_projects", "crm_leads"],
      });
    }

    if (reportType === "client" || reportType === "board") {
      const clientId = resolveClientFilter(args, ctx);
      const client = clientId
        ? clients.find((entry) => entry.id === clientId)
        : clients.find((entry) => entry.companyName === resolveClientName(args, ctx));
      sections.push({
        title: "Client summary",
        bullets: client
          ? [
              `${client.companyName} · ${client.accountStatus} · ${client.contractType}`,
              `${client.activeProjects} active projects on record`,
              `Primary contact ${client.primaryContact} (${client.email})`,
            ]
          : [
              `${clients.length} clients in directory`,
              `${clients.filter((entry) => entry.accountStatus === "Active").length} active`,
            ],
        citations: ["internal_clients"],
      });
    }

    if (reportType === "project" || reportType === "board") {
      sections.push({
        title: "Project summary",
        bullets: [
          `${projects.length} projects total`,
          `${overdueProjects.length} overdue by end date`,
          ...overdueProjects.slice(0, 5).map((project) => `${project.name} · due ${project.endDate}`),
        ],
        citations: ["internal_projects"],
      });
    }

    if (reportType === "finance" || reportType === "board") {
      sections.push({
        title: "Financial summary",
        bullets: invoiceLoad.ok
          ? [
              `${unpaidExpenses.length} unpaid expense records (live)`,
              `${invoiceLoad.invoices.length} invoices in the live ledger`,
              `${invoiceLoad.overdue.length} overdue invoices`,
              ...invoiceLoad.overdue.slice(0, 5).map(
                (invoice) =>
                  `${invoice.clientName ?? invoice.invoiceNumber} · ${invoice.currency} ${invoice.amount} · due ${invoice.dueDate}`,
              ),
            ]
          : [
              `${unpaidExpenses.length} unpaid expense records (live)`,
              "No information available yet — live invoice ledger could not be loaded.",
            ],
        citations: invoiceLoad.ok
          ? ["financial_expenses", "invoices"]
          : ["financial_expenses"],
      });
    }

    if (reportType === "hr" || reportType === "board") {
      sections.push({
        title: "HR summary",
        bullets: [
          `${employees.length} employees (live)`,
          "No information available yet — careers openings and applicants are not connected to live storage.",
        ],
        citations: ["hr_employees"],
      });
    }

    if (focus) {
      sections.push({
        title: "Focus",
        bullets: [`User focus: ${focus}`],
        citations: [],
      });
    }

    return toolOk(
      "generateReport",
      sections,
      {
        source: [
          "supabase:internal_clients",
          "supabase:internal_projects",
          "supabase:crm_leads",
          "supabase:financial_expenses",
          "supabase:hr_employees",
          ...(invoiceLoad.ok ? ["supabase:invoices"] : []),
        ],
        page: 1,
        pageSize: sections.length,
        summary: {
          reportType,
          generatedAt: new Date().toISOString(),
          organisation: ctx.business.organisation.name,
          workspace: ctx.business.workspace.name,
        },
        dataGaps: [
          ...(invoiceLoad.ok ? [] : ["Live invoice ledger unavailable for this report."]),
          "Careers openings/applicants are not connected to live storage.",
          "Board narrative text must be written from these figures only — do not invent metrics.",
        ],
        followUpActions: [],
        appliedContext: {
          clientId: ctx.business.selection.clientId,
          projectId: ctx.business.selection.projectId,
          activeView: ctx.business.page.activeView,
        },
      },
    );
  } catch (error) {
    return toolError(
      "generateReport",
      error instanceof Error ? error.message : "Failed to generate report",
    );
  }
}

async function readFileTextSnippet(fileId: string) {
  if (!isSupabaseConfigured()) {
    return {
      excerpt: "",
      bytesRead: 0,
      truncated: false,
      dataGaps: ["Supabase is not configured; file content unavailable."],
    };
  }

  const supabase = createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("file_objects")
    .select("id, name, storage_path, mime_type, extension")
    .eq("id", fileId)
    .maybeSingle();

  if (error || !row) {
    throw new Error(error?.message || "File not found");
  }

  const storagePath = String((row as { storage_path?: string }).storage_path || "");
  const mimeType = String((row as { mime_type?: string | null }).mime_type || "");
  const extension = String((row as { extension?: string | null }).extension || "").toLowerCase();

  const textLike =
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    ["txt", "md", "csv", "json", "log"].includes(extension);

  if (!textLike) {
    return {
      excerpt: "",
      bytesRead: 0,
      truncated: false,
      dataGaps: [
        `File ${String((row as { name?: string }).name || fileId)} is ${mimeType || extension || "binary"}; text extraction for PDF/DOCX is not enabled yet. Metadata is available via searchFiles.`,
      ],
    };
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(INTERNAL_FILES_BUCKET)
    .download(storagePath);

  if (downloadError || !blob) {
    throw new Error(downloadError?.message || "Failed to download file");
  }

  const text = await blob.text();
  const limit = 12_000;
  return {
    excerpt: text.slice(0, limit),
    bytesRead: text.length,
    truncated: text.length > limit,
    dataGaps: text.length > limit ? ["Excerpt truncated for model context limits."] : [],
  };
}

function buildDocumentHints(excerpt: string, mention?: string) {
  const lower = excerpt.toLowerCase();
  const hints: string[] = [];
  if (!excerpt.trim()) {
    hints.push("No text excerpt available for analysis.");
    return hints;
  }
  if (mention && lower.includes(mention.toLowerCase())) {
    hints.push(`Document mentions “${mention}”.`);
  }
  if (lower.includes("iso 13485")) hints.push("Contains ISO 13485 reference.");
  if (lower.includes("payment") || lower.includes("net 30") || lower.includes("invoice")) {
    hints.push("Possible payment terms language detected in excerpt.");
  }
  if (lower.includes("risk") || lower.includes("liability")) {
    hints.push("Risk/liability language detected in excerpt.");
  }
  if (lower.includes("expir")) hints.push("Expiry-related language detected in excerpt.");
  if (hints.length === 0) hints.push("Excerpt available — summarise only from provided text.");
  return hints;
}
