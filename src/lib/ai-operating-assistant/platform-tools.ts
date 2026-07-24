import { getFinancialOverview } from "@/lib/accounting/overview-service";
import { listExpenses } from "@/lib/financial-expenses-service";
import { listHrEmployees } from "@/lib/hr-employees-service";
import {
  HR_LEAVE_STATUS_LABELS,
  HR_LEAVE_TYPE_LABELS,
} from "@/lib/hr-leave-data";
import {
  HR_PERFORMANCE_RATING_LABELS,
  HR_REVIEW_STATUS_LABELS,
  HR_REVIEW_TYPE_LABELS,
} from "@/lib/hr-performance-data";
import {
  listCandidates,
  listLeaveRequests,
  listPerformanceReviews,
  listVacancies,
} from "@/lib/hr-mock-store";
import { listInternalClients } from "@/lib/internal-clients-service";
import { listProjects } from "@/lib/internal-projects-service";
import { listLeads } from "@/lib/crm-leads-service";
import { getInventoryMockSnapshot } from "@/lib/inventory-mock-store";
import { calculateLivePayrollSnapshot } from "@/lib/payroll/payroll-service";
import { isLiveInvoiceOverdue, loadLiveInvoices } from "./live-finance";
import type { AssistantToolExecutionContext } from "./tool-result";
import {
  asNumber,
  asString,
  matchesQuery,
  toolError,
  toolForbidden,
  toolOk,
  type AssistantFollowUpAction,
  type AssistantToolResult,
} from "./tool-result";

function nav(href: string, label: string): AssistantFollowUpAction {
  return { id: `nav_${href}`, label, kind: "navigate", href };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function coversToday(startDate: string, endDate: string) {
  const today = todayIso();
  return startDate <= today && endDate >= today;
}

export async function searchPerformanceReviews(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  if (!ctx.business.permissions.canAccessHr) {
    return toolForbidden(
      "searchPerformanceReviews",
      "Your current role cannot access HR performance data.",
    );
  }

  try {
    const query = asString(args.query);
    const status = asString(args.status);
    const employeeId = asString(args.employeeId);
    const reviews = listPerformanceReviews();

    const filtered = reviews.filter((review) => {
      if (employeeId && review.employeeId !== employeeId) return false;
      if (status && review.status !== status) return false;
      const haystack = [
        review.employeeName,
        review.department,
        review.role,
        review.managerName,
        review.reviewPeriod,
        review.summary,
        review.status,
        review.reviewType ?? "",
      ].join(" ");
      return matchesQuery(haystack, query);
    });

    return toolOk(
      "searchPerformanceReviews",
      filtered.map((review) => ({
        id: review.id,
        employeeId: review.employeeId,
        employeeName: review.employeeName,
        department: review.department,
        role: review.role,
        managerName: review.managerName,
        reviewPeriod: review.reviewPeriod,
        reviewType: review.reviewType
          ? HR_REVIEW_TYPE_LABELS[review.reviewType]
          : "Review",
        status: HR_REVIEW_STATUS_LABELS[review.status],
        statusKey: review.status,
        overallRating:
          review.overallRating == null
            ? null
            : HR_PERFORMANCE_RATING_LABELS[review.overallRating],
        nextReviewDate: review.nextReviewDate,
        dueDate: review.dueDate ?? null,
        summary: review.summary,
      })),
      {
        source: ["hr-performance:reviews"],
        pageSize: asNumber(args.pageSize, 100),
        summary: {
          matched: filtered.length,
          totalOnFile: reviews.length,
          message:
            filtered.length === 0
              ? "There are currently no performance reviews."
              : `I found ${filtered.length} performance review${filtered.length === 1 ? "" : "s"}.`,
        },
        followUpActions: [nav("/?view=hr-performance", "Open Performance")],
      },
    );
  } catch (error) {
    return toolError(
      "searchPerformanceReviews",
      error instanceof Error ? error.message : "Failed to load performance reviews.",
    );
  }
}

export async function searchLeave(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  if (!ctx.business.permissions.canAccessHr) {
    return toolForbidden("searchLeave", "Your current role cannot access HR leave data.");
  }

  try {
    const query = asString(args.query);
    const status = asString(args.status);
    const currentlyOnLeave = Boolean(args.currentlyOnLeave ?? args.onLeave);
    const pendingOnly = Boolean(args.pendingOnly);
    const requests = listLeaveRequests();

    const filtered = requests.filter((request) => {
      if (currentlyOnLeave) {
        if (request.status !== "approved") return false;
        if (!coversToday(request.startDate, request.endDate)) return false;
      }
      if (pendingOnly && request.status !== "pending") return false;
      if (status && request.status !== status) return false;
      const haystack = [
        request.employeeName,
        request.department,
        request.role,
        request.managerName,
        request.type,
        request.status,
      ].join(" ");
      return matchesQuery(haystack, query);
    });

    const currentlyCount = requests.filter(
      (request) =>
        request.status === "approved" && coversToday(request.startDate, request.endDate),
    ).length;

    return toolOk(
      "searchLeave",
      filtered.map((request) => ({
        id: request.id,
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        department: request.department,
        role: request.role,
        type: HR_LEAVE_TYPE_LABELS[request.type],
        status: HR_LEAVE_STATUS_LABELS[request.status],
        startDate: request.startDate,
        endDate: request.endDate,
        days: request.days,
        managerName: request.managerName,
      })),
      {
        source: ["hr-leave:requests"],
        pageSize: asNumber(args.pageSize, 100),
        summary: {
          matched: filtered.length,
          currentlyOnLeave: currentlyOnLeave ? filtered.length : currentlyCount,
          pendingApprovals: requests.filter((request) => request.status === "pending").length,
          message:
            filtered.length === 0
              ? currentlyOnLeave
                ? "Nobody is currently on approved leave today."
                : "There are currently no leave requests matching that request."
              : currentlyOnLeave
                ? `I found ${filtered.length} ${filtered.length === 1 ? "person" : "people"} currently on leave.`
                : `I found ${filtered.length} leave request${filtered.length === 1 ? "" : "s"}.`,
        },
        followUpActions: [nav("/?view=hr-leave", "Open Leave")],
      },
    );
  } catch (error) {
    return toolError(
      "searchLeave",
      error instanceof Error ? error.message : "Failed to load leave requests.",
    );
  }
}

export async function searchInvoices(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  if (!ctx.business.permissions.canAccessFinancials) {
    return toolForbidden(
      "searchInvoices",
      "Your current role cannot access accounts receivable.",
    );
  }

  try {
    const load = await loadLiveInvoices();
    const invoices = load.invoices;
    const query = asString(args.query);
    const outstandingOnly = Boolean(args.outstandingOnly ?? true);
    const overdueOnly = Boolean(args.overdueOnly);

    const filtered = invoices.filter((invoice) => {
      const paid = invoice.status === "paid";
      if (outstandingOnly && (paid || invoice.status === "cancelled" || invoice.status === "draft")) {
        return false;
      }
      if (overdueOnly && !isLiveInvoiceOverdue(invoice)) return false;
      const haystack = [
        invoice.clientName ?? "",
        invoice.invoiceNumber,
        invoice.paymentReference,
        invoice.status,
      ].join(" ");
      return matchesQuery(haystack, query);
    });

    const outstandingTotal = filtered.reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0);

    return toolOk(
      "searchInvoices",
      filtered.slice(0, 50).map((invoice) => ({
        id: invoice.id,
        clientName: invoice.clientName ?? "Client",
        number: invoice.invoiceNumber,
        amount: invoice.amount,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        status: invoice.status,
        paid: invoice.status === "paid",
        overdue: isLiveInvoiceOverdue(invoice),
      })),
      {
        source: load.ok ? ["finance:invoices:live"] : ["finance:invoices:error"],
        pageSize: asNumber(args.pageSize, 50),
        summary: {
          matched: filtered.length,
          outstandingTotal: Math.round(outstandingTotal * 100) / 100,
          liveOk: load.ok,
          message:
            filtered.length === 0
              ? "There are currently no outstanding invoices."
              : `I found ${filtered.length} outstanding invoice${filtered.length === 1 ? "" : "s"} totalling ${outstandingTotal.toLocaleString("en-GB", {
                  style: "currency",
                  currency: filtered[0]?.currency ?? "GBP",
                  maximumFractionDigits: 0,
                })}.`,
        },
        dataGaps: load.ok ? undefined : [load.error],
        followUpActions: [nav("/?view=accounts-receivable", "Open Accounts Receivable")],
      },
    );
  } catch (error) {
    return toolError(
      "searchInvoices",
      error instanceof Error ? error.message : "Failed to load invoices.",
    );
  }
}

export async function searchExpenses(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  if (!ctx.business.permissions.canAccessFinancials) {
    return toolForbidden("searchExpenses", "Your current role cannot access expenses.");
  }

  try {
    const expenses = await listExpenses();
    const query = asString(args.query);
    const minAmount = asNumber(args.minAmount, 0);
    const recentOnly = Boolean(args.recentOnly);
    const unpaidOnly = Boolean(args.unpaidOnly);

    let filtered = expenses.filter((expense) => {
      const amount = Number(expense.amount) || 0;
      if (minAmount > 0 && amount < minAmount) return false;
      if (unpaidOnly && expense.paid) return false;
      const haystack = [
        expense.supplier ?? "",
        expense.submitterName ?? "",
        expense.purposeDescription ?? "",
        expense.currency ?? "",
      ].join(" ");
      return matchesQuery(haystack, query);
    });

    if (recentOnly || (!query && minAmount <= 0 && !unpaidOnly)) {
      filtered = [...filtered].sort((a, b) =>
        String(b.expenseDate ?? b.dateSubmitted ?? "").localeCompare(
          String(a.expenseDate ?? a.dateSubmitted ?? ""),
        ),
      );
    }

    const limit = asNumber(args.pageSize, 25);
    const sliced = filtered.slice(0, Math.max(1, Math.min(limit, 100)));
    const total = sliced.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

    return toolOk(
      "searchExpenses",
      sliced.map((expense) => ({
        id: String(expense.id),
        supplier: expense.supplier ?? expense.submitterName ?? "Supplier",
        description: expense.purposeDescription ?? "",
        amount: Number(expense.amount) || 0,
        currency: expense.currency ?? "GBP",
        date: expense.expenseDate ?? expense.dateSubmitted,
        paid: Boolean(expense.paid),
      })),
      {
        source: ["finance:expenses"],
        pageSize: limit,
        summary: {
          matched: filtered.length,
          shown: sliced.length,
          totalAmount: Math.round(total * 100) / 100,
          message:
            sliced.length === 0
              ? "There are currently no expenses matching that request."
              : `I found ${sliced.length} recent expense${sliced.length === 1 ? "" : "s"}.`,
        },
        followUpActions: [nav("/?view=expenses", "Open Expenses")],
      },
    );
  } catch (error) {
    return toolError(
      "searchExpenses",
      error instanceof Error ? error.message : "Failed to load expenses.",
    );
  }
}

export async function getCashPosition(
  _args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  if (!ctx.business.permissions.canAccessFinancials) {
    return toolForbidden("getCashPosition", "Your current role cannot access finance data.");
  }

  try {
    const overview = await getFinancialOverview();
    const cash = overview.cashPosition;
    return toolOk(
      "getCashPosition",
      [
        {
          cashPosition: cash,
          currency: "GBP",
          accountsReceivable: overview.accountsReceivable,
          accountsPayable: overview.accountsPayable,
          monthlyBurn: overview.burnRate.monthly,
          runwayMonths: overview.burnRate.runwayMonths,
          payrollMonthly: overview.payroll.monthly,
        },
      ],
      {
        source: ["finance:overview", "treasury"],
        summary: {
          cashPosition: cash,
          message: `Current bank / cash balance is ${cash.toLocaleString("en-GB", {
            style: "currency",
            currency: "GBP",
            maximumFractionDigits: 0,
          })}.`,
        },
        followUpActions: [
          nav("/?view=financials", "Open Finance"),
          nav("/?view=wise", "Open Bank"),
        ],
      },
    );
  } catch (error) {
    return toolError(
      "getCashPosition",
      error instanceof Error ? error.message : "Failed to load cash position.",
    );
  }
}

export async function getMonthlyPayrollObligation(
  _args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  if (!ctx.business.permissions.canAccessHr && !ctx.business.permissions.canAccessFinancials) {
    return toolForbidden(
      "getMonthlyPayrollObligation",
      "Your current role cannot access payroll figures.",
    );
  }

  try {
    const [snapshot, overview] = await Promise.all([
      calculateLivePayrollSnapshot().catch(() => null),
      getFinancialOverview().catch(() => null),
    ]);

    const monthly = snapshot
      ? Math.round((snapshot.monthlyGross + snapshot.employerTax) * 100) / 100
      : overview?.payroll.monthly ?? 0;
    const employees = snapshot?.employeeCount ?? overview?.payroll.employees ?? 0;
    const nextDate = snapshot?.nextPayrollDate ?? null;
    const currency = snapshot?.currency ?? "GBP";

    return toolOk(
      "getMonthlyPayrollObligation",
      [
        {
          monthly,
          employees,
          nextPayrollDate: nextDate,
          currency,
          liability: monthly,
          gross: snapshot?.monthlyGross ?? monthly,
          employerTax: snapshot?.employerTax ?? 0,
          net: snapshot?.net ?? 0,
        },
      ],
      {
        source: ["payroll:live", "finance:overview"],
        summary: {
          monthly,
          employees,
          nextPayrollDate: nextDate,
          message: `Monthly payroll is ${monthly.toLocaleString("en-GB", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          })} across ${employees} employee${employees === 1 ? "" : "s"}${
            nextDate ? ` (next payroll ${nextDate})` : ""
          }.`,
        },
        followUpActions: [nav("/?view=payroll", "Open Payroll")],
      },
    );
  } catch (error) {
    return toolError(
      "getMonthlyPayrollObligation",
      error instanceof Error ? error.message : "Failed to load payroll obligation.",
    );
  }
}

export async function searchInventory(
  args: Record<string, unknown>,
  _ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  try {
    const query = asString(args.query);
    const assets = getInventoryMockSnapshot().assets.filter((asset) => !asset.archived);
    const filtered = assets.filter((asset) => {
      const haystack = [
        asset.name,
        asset.assetTag,
        asset.category,
        asset.location,
        asset.department,
        asset.assignedTo,
        asset.status,
      ].join(" ");
      return matchesQuery(haystack, query);
    });

    return toolOk(
      "searchInventory",
      filtered.slice(0, 50).map((asset) => ({
        id: asset.id,
        name: asset.name,
        assetTag: asset.assetTag,
        category: asset.category,
        location: asset.location,
        status: asset.status,
        assignedTo: asset.assignedTo,
      })),
      {
        source: ["inventory"],
        pageSize: asNumber(args.pageSize, 50),
        summary: {
          matched: filtered.length,
          total: assets.length,
          message:
            filtered.length === 0
              ? "There are currently no inventory assets matching that request."
              : `I found ${filtered.length} inventory asset${filtered.length === 1 ? "" : "s"}.`,
        },
        followUpActions: [nav("/?view=inventory-management", "Open Inventory")],
      },
    );
  } catch (error) {
    return toolError(
      "searchInventory",
      error instanceof Error ? error.message : "Failed to load inventory.",
    );
  }
}

export async function platformSearch(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  const query = asString(args.query);
  if (!query) {
    return toolError("platformSearch", "Provide a search query (e.g. a person or company name).");
  }

  try {
    const [employees, clients, projects, leads, invoiceLoad] = await Promise.all([
      ctx.business.permissions.canAccessHr
        ? listHrEmployees().catch(() => [])
        : Promise.resolve([]),
      listInternalClients().catch(() => []),
      listProjects().catch(() => []),
      listLeads().catch(() => []),
      ctx.business.permissions.canAccessFinancials
        ? loadLiveInvoices()
        : Promise.resolve({ ok: true as const, invoices: [], overdue: [] }),
    ]);

    const reviews = ctx.business.permissions.canAccessHr ? listPerformanceReviews() : [];
    const leave = ctx.business.permissions.canAccessHr ? listLeaveRequests() : [];
    const vacancies = ctx.business.permissions.canAccessHr ? listVacancies() : [];
    const candidates = ctx.business.permissions.canAccessHr ? listCandidates() : [];
    const invoices = invoiceLoad.invoices;

    const hits: Array<Record<string, unknown>> = [];

    for (const employee of employees) {
      if (
        matchesQuery(
          [employee.fullName, employee.email, employee.role, employee.department].join(" "),
          query,
        )
      ) {
        hits.push({
          module: "Employees",
          id: employee.id,
          label: employee.fullName,
          detail: `${employee.role} · ${employee.department}`,
          href: "/?view=hr",
        });
      }
    }

    for (const review of reviews) {
      if (matchesQuery([review.employeeName, review.department, review.summary].join(" "), query)) {
        hits.push({
          module: "Performance",
          id: review.id,
          label: `${review.employeeName} — ${review.reviewPeriod}`,
          detail: HR_REVIEW_STATUS_LABELS[review.status],
          href: "/?view=hr-performance",
        });
      }
    }

    for (const request of leave) {
      if (matchesQuery([request.employeeName, request.department].join(" "), query)) {
        hits.push({
          module: "Leave",
          id: request.id,
          label: request.employeeName,
          detail: `${HR_LEAVE_TYPE_LABELS[request.type]} · ${request.startDate} → ${request.endDate}`,
          href: "/?view=hr-leave",
        });
      }
    }

    for (const client of clients) {
      if (
        matchesQuery(
          [
            client.companyName,
            client.primaryContact,
            client.email,
            client.region,
            client.companyCountry ?? "",
          ].join(" "),
          query,
        )
      ) {
        hits.push({
          module: "Clients",
          id: client.id,
          label: client.companyName,
          detail: `${client.primaryContact} · ${client.accountStatus}`,
          href: "/?view=clients",
        });
      }
    }

    for (const project of projects) {
      if (matchesQuery([project.name, project.clientName ?? "", project.notes ?? ""].join(" "), query)) {
        hits.push({
          module: "Projects",
          id: project.id,
          label: project.name,
          detail: `${project.clientName ?? "Internal"} · ${project.phase}`,
          href: "/?view=projects",
        });
      }
    }

    for (const lead of leads) {
      if (
        matchesQuery(
          [lead.contactName, lead.companyName ?? "", lead.email ?? "", lead.role ?? ""].join(" "),
          query,
        )
      ) {
        hits.push({
          module: "CRM",
          id: lead.id,
          label: lead.contactName,
          detail: `${lead.companyName ?? "Lead"} · ${lead.status ?? ""}`,
          href: "/?view=crm",
        });
      }
    }

    for (const vacancy of vacancies) {
      if (matchesQuery([vacancy.title, vacancy.department, vacancy.location].join(" "), query)) {
        hits.push({
          module: "Recruitment",
          id: vacancy.id,
          label: vacancy.title,
          detail: `${vacancy.department} · ${vacancy.status}`,
          href: "/?view=hr-recruitment",
        });
      }
    }

    for (const candidate of candidates) {
      if (matchesQuery([candidate.name, candidate.email, candidate.role].join(" "), query)) {
        hits.push({
          module: "Recruitment",
          id: candidate.id,
          label: candidate.name,
          detail: `${candidate.role} · ${candidate.stage}`,
          href: "/?view=hr-recruitment",
        });
      }
    }

    for (const invoice of invoices) {
      const clientName = invoice.clientName ?? "";
      if (matchesQuery([clientName, invoice.invoiceNumber].join(" "), query)) {
        hits.push({
          module: "Finance",
          id: invoice.id,
          label: clientName || invoice.invoiceNumber,
          detail: `Invoice ${invoice.invoiceNumber} · ${invoice.status}`,
          href: "/?view=accounts-receivable",
        });
      }
    }

    return toolOk(
      "platformSearch",
      hits.slice(0, 40),
      {
        source: ["platform:cross-module-search"],
        pageSize: 40,
        summary: {
          matched: hits.length,
          query,
          message:
            hits.length === 0
              ? `No employees, clients, or projects matched “${query}”. I can still prepare a meeting brief if you confirm who they are.`
              : `I found ${hits.length} match${hits.length === 1 ? "" : "es"} for “${query}” across Unit311.`,
        },
        followUpActions:
          hits.length === 0
            ? [
                {
                  id: "fu_search_employees",
                  label: "Show employees",
                  kind: "generate",
                },
                {
                  id: "fu_search_clients",
                  label: "Show clients",
                  kind: "generate",
                },
                {
                  id: "fu_crm",
                  label: "Show my biggest opportunities",
                  kind: "generate",
                },
              ]
            : hits
                .slice(0, 3)
                .filter((hit) => typeof hit.href === "string" && hit.href)
                .map((hit) =>
                  nav(String(hit.href), `Open ${String(hit.label ?? "record")}`),
                ),
      },
    );
  } catch (error) {
    return toolError(
      "platformSearch",
      error instanceof Error ? error.message : "Platform search failed.",
    );
  }
}
