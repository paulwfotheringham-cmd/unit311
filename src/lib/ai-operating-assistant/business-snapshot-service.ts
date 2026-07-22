import { listInternalClients } from "@/lib/internal-clients-service";
import { listProjects } from "@/lib/internal-projects-service";
import { listLeads } from "@/lib/crm-leads-service";
import { listHrEmployees } from "@/lib/hr-employees-service";
import { vacationDaysRemaining } from "@/lib/hr-data";
import { listExpenses } from "@/lib/financial-expenses-service";
import { getFinancialOverview } from "@/lib/accounting/overview-service";
import { loadLiveInvoices } from "./live-finance";
import { isOverdue } from "./tool-result";
import type { AssistantBusinessContext } from "./types";

export type BusinessSnapshotDomain =
  | "overview"
  | "clients"
  | "projects"
  | "finance"
  | "hr"
  | "crm"
  | "all";

/**
 * Compact live business snapshot for open-ended executive Q&A.
 * Never invents metrics — zeros / empty arrays mean no live data.
 */
export async function buildBusinessSnapshot(
  context: AssistantBusinessContext,
  domain: BusinessSnapshotDomain = "all",
) {
  const want = (name: BusinessSnapshotDomain) =>
    domain === "all" || domain === "overview" || domain === name;

  const [
    clients,
    projects,
    leads,
    employees,
    expenses,
    invoiceLoad,
    financialOverview,
  ] = await Promise.all([
    want("clients") || want("overview")
      ? listInternalClients().catch(() => [])
      : Promise.resolve([]),
    want("projects") || want("overview")
      ? listProjects().catch(() => [])
      : Promise.resolve([]),
    want("crm") || want("overview") ? listLeads("All").catch(() => []) : Promise.resolve([]),
    want("hr") && context.permissions.canAccessHr
      ? listHrEmployees().catch(() => [])
      : Promise.resolve([]),
    want("finance") && context.permissions.canAccessFinancials
      ? listExpenses().catch(() => [])
      : Promise.resolve([]),
    want("finance") && context.permissions.canAccessFinancials
      ? loadLiveInvoices()
      : Promise.resolve({
          ok: false as const,
          invoices: [] as [],
          overdue: [] as [],
          error: "Finance restricted or not requested",
        }),
    want("finance") && context.permissions.canAccessFinancials
      ? getFinancialOverview(
          context.workspace.id ? { workspaceId: context.workspace.id } : undefined,
        ).catch(() => null)
      : Promise.resolve(null),
  ]);

  const activeClients = clients.filter((client) => client.accountStatus === "Active");
  const liveProjects = projects.filter((project) => project.phase === "live");
  const overdueProjects = projects.filter((project) => isOverdue(project.endDate));
  const hotLeads = leads.filter((lead) => lead.status === "Hot");
  const unpaidExpenses = expenses.filter((expense) => !expense.paid);

  const dataGaps: string[] = [];
  if (want("finance") && !context.permissions.canAccessFinancials) {
    dataGaps.push("Finance data hidden for current role.");
  }
  if (want("hr") && !context.permissions.canAccessHr) {
    dataGaps.push("HR data hidden for current role.");
  }
  if (want("finance") && context.permissions.canAccessFinancials && !invoiceLoad.ok) {
    dataGaps.push(invoiceLoad.error || "Invoice ledger unavailable.");
  }

  return {
    asOf: new Date().toISOString(),
    organisation: context.organisation.name,
    workspace: context.workspace.name,
    domain,
    overview: {
      activeClients: activeClients.length,
      totalClients: clients.length,
      liveProjects: liveProjects.length,
      overdueProjects: overdueProjects.length,
      hotLeads: hotLeads.length,
      totalLeads: leads.length,
      headcount: employees.length,
      outstandingInvoices: invoiceLoad.ok ? invoiceLoad.invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled" && i.status !== "draft").length : null,
      overdueInvoices: invoiceLoad.ok ? invoiceLoad.overdue.length : null,
      unpaidExpenses: context.permissions.canAccessFinancials ? unpaidExpenses.length : null,
      cashPosition: financialOverview?.cashPosition ?? null,
      revenueYtd: financialOverview?.revenueYtd ?? null,
      netProfit: financialOverview?.netProfit ?? null,
      monthlyBurn: financialOverview?.burnRate.monthly ?? null,
    },
    clients: want("clients")
      ? {
          active: activeClients.slice(0, 20).map((client) => ({
            name: client.companyName,
            status: client.accountStatus,
            contact: client.primaryContact,
            projects: client.activeProjects,
            industry: client.industry,
          })),
          inactiveSample: clients
            .filter((client) => client.accountStatus !== "Active")
            .slice(0, 10)
            .map((client) => ({
              name: client.companyName,
              status: client.accountStatus,
            })),
        }
      : undefined,
    projects: want("projects")
      ? {
          live: liveProjects.slice(0, 20).map((project) => ({
            name: project.name,
            client: project.clientName,
            phase: project.phase,
            endDate: project.endDate,
            overdue: isOverdue(project.endDate),
          })),
          overdue: overdueProjects.slice(0, 15).map((project) => ({
            name: project.name,
            client: project.clientName,
            endDate: project.endDate,
          })),
        }
      : undefined,
    crm: want("crm")
      ? {
          hot: hotLeads.slice(0, 15).map((lead) => ({
            name: lead.contactName,
            company: lead.companyName,
            status: lead.status,
            value: lead.estimatedValue,
            nextAction: lead.nextAction,
          })),
          byStatus: leads.reduce<Record<string, number>>((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
          }, {}),
        }
      : undefined,
    hr: want("hr")
      ? context.permissions.canAccessHr
        ? {
            headcount: employees.length,
            byDepartment: employees.reduce<Record<string, number>>((acc, employee) => {
              const key = employee.department || "Unassigned";
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {}),
            lowLeaveBalance: employees
              .filter((employee) => vacationDaysRemaining(employee) <= 2)
              .slice(0, 10)
              .map((employee) => ({
                name: employee.fullName,
                department: employee.department,
                leaveRemaining: vacationDaysRemaining(employee),
              })),
            sample: employees.slice(0, 15).map((employee) => ({
              name: employee.fullName,
              role: employee.role,
              department: employee.department,
              location: employee.location,
            })),
          }
        : { restricted: true }
      : undefined,
    finance: want("finance")
      ? context.permissions.canAccessFinancials
        ? {
            cashPosition: financialOverview?.cashPosition ?? 0,
            revenueYtd: financialOverview?.revenueYtd ?? 0,
            netProfit: financialOverview?.netProfit ?? 0,
            accountsReceivable: financialOverview?.accountsReceivable ?? 0,
            accountsPayable: financialOverview?.accountsPayable ?? 0,
            monthlyBurn: financialOverview?.burnRate.monthly ?? 0,
            runwayMonths: financialOverview?.burnRate.runwayMonths ?? null,
            invoices: invoiceLoad.ok
              ? {
                  total: invoiceLoad.invoices.length,
                  overdue: invoiceLoad.overdue.length,
                  overdueSample: invoiceLoad.overdue.slice(0, 8).map((invoice) => ({
                    client: invoice.clientName ?? invoice.invoiceNumber,
                    amount: invoice.amount,
                    currency: invoice.currency,
                    dueDate: invoice.dueDate,
                  })),
                }
              : { unavailable: true },
            unpaidExpenses: unpaidExpenses.slice(0, 8).map((expense) => ({
              supplier: expense.supplier,
              amount: expense.amount,
              purpose: expense.purposeDescription,
            })),
          }
        : { restricted: true }
      : undefined,
    dataGaps,
    guidance:
      "Answer the user's question using only these live figures. If a field is null/empty/zero, say so plainly — do not invent numbers.",
  };
}
