import { listInternalClients } from "@/lib/internal-clients-service";
import { listProjects } from "@/lib/internal-projects-service";
import { listLeads } from "@/lib/crm-leads-service";
import { listHrEmployees } from "@/lib/hr-employees-service";
import { vacationDaysRemaining } from "@/lib/hr-data";
import { listExpenses } from "@/lib/financial-expenses-service";
import {
  FINANCIAL_REPORTING_CURRENCY,
  getFinancialOverview,
  resolveTreasuryCash,
} from "@/lib/accounting/overview-service";
import { getWiseConnectionStatus, listWiseBalances } from "@/lib/wise-service";
import { convertToGbp } from "@/lib/treasury/treasury-utils";
import { createInitialAssetRegistry } from "@/lib/asset-management-data";
import { getInventoryMockSnapshot } from "@/lib/inventory-mock-store";
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
  | "assets"
  | "all";

/**
 * Compact live business snapshot for open-ended executive Q&A.
 * Never invents metrics — zeros / empty arrays mean no live data.
 */
export async function buildBusinessSnapshot(
  context: AssistantBusinessContext,
  domain: BusinessSnapshotDomain = "all",
) {
  const want = (name: BusinessSnapshotDomain) => {
    if (domain === name) return true;
    if (domain === "all") return name !== "overview";
    // Overview is a management summary — not a dump of Assets register.
    if (domain === "overview") {
      return (
        name === "overview" ||
        name === "clients" ||
        name === "projects" ||
        name === "crm" ||
        name === "finance" ||
        name === "hr"
      );
    }
    return false;
  };

  const [
    clients,
    projects,
    leads,
    employees,
    expenses,
    invoiceLoad,
    financialOverview,
    wiseCash,
    assetBundle,
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
    want("finance") && context.permissions.canAccessFinancials
      ? (async () => {
          try {
            const status = await getWiseConnectionStatus();
            if (!status.configured) {
              return {
                ok: false as const,
                totalGbp: await resolveTreasuryCash(0),
                balances: [] as Array<{
                  currency: string;
                  amount: number;
                  type: string;
                  amountGbp?: number;
                }>,
                error: "Wise is not configured.",
                connected: false,
              };
            }
            if (!status.connected) {
              const totalGbp = await resolveTreasuryCash(0);
              return {
                ok: false as const,
                totalGbp,
                balances: [] as Array<{
                  currency: string;
                  amount: number;
                  type: string;
                  amountGbp?: number;
                }>,
                error: status.error || "Wise is not connected.",
                connected: false,
              };
            }
            const balances = await listWiseBalances(status.profileId ?? undefined);
            const mapped = balances.map((balance) => ({
              currency: balance.currency,
              amount: balance.amount,
              type: balance.type,
              amountGbp: convertToGbp(balance.amount, balance.currency),
            }));
            const totalGbp = mapped.reduce((sum, row) => sum + row.amountGbp, 0);
            return {
              ok: true as const,
              totalGbp: Math.round(totalGbp * 100) / 100,
              balances: mapped,
              error: null as string | null,
              connected: true,
            };
          } catch (error) {
            return {
              ok: false as const,
              totalGbp: await resolveTreasuryCash(0).catch(() => 0),
              balances: [] as Array<{
                currency: string;
                amount: number;
                type: string;
                amountGbp?: number;
              }>,
              error: error instanceof Error ? error.message : "Wise balances unavailable.",
              connected: false,
            };
          }
        })()
      : Promise.resolve(null),
    want("assets")
      ? Promise.resolve().then(() => {
          const registry = createInitialAssetRegistry();
          const inventory = getInventoryMockSnapshot();
          return {
            physicalAssets: registry.assets,
            categories: registry.categories,
            locations: registry.locations,
            inventoryItems: inventory.assets ?? [],
          };
        })
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
  if (want("finance") && context.permissions.canAccessFinancials && wiseCash && !wiseCash.ok) {
    dataGaps.push(wiseCash.error || "Live Wise balances unavailable.");
  }

  const cashPosition =
    wiseCash?.ok && wiseCash.totalGbp > 0
      ? wiseCash.totalGbp
      : financialOverview?.cashPosition ?? wiseCash?.totalGbp ?? null;

  const physicalAssets = assetBundle?.physicalAssets ?? [];
  const inventoryItems = assetBundle?.inventoryItems ?? [];

  return {
    asOf: new Date().toISOString(),
    organisation: context.organisation.name,
    workspace: context.workspace.name,
    domain,
    overview:
      domain === "assets"
        ? {
            physicalAssetCount: physicalAssets.length,
            inventoryItemCount: inventoryItems.length,
            locations: assetBundle?.locations ?? [],
            categories: assetBundle?.categories ?? [],
          }
        : {
            activeClients: activeClients.length,
            totalClients: clients.length,
            liveProjects: liveProjects.length,
            overdueProjects: overdueProjects.length,
            hotLeads: hotLeads.length,
            totalLeads: leads.length,
            headcount: employees.length,
            outstandingInvoices: invoiceLoad.ok
              ? invoiceLoad.invoices.filter(
                  (i) =>
                    i.status !== "paid" &&
                    i.status !== "cancelled" &&
                    i.status !== "draft",
                ).length
              : null,
            overdueInvoices: invoiceLoad.ok ? invoiceLoad.overdue.length : null,
            unpaidExpenses: context.permissions.canAccessFinancials
              ? unpaidExpenses.length
              : null,
            cashPosition,
            reportingCurrency: FINANCIAL_REPORTING_CURRENCY,
            wiseBalances: wiseCash?.balances ?? null,
            wiseConnected: wiseCash?.connected ?? null,
            revenueYtd: financialOverview?.revenueYtd ?? null,
            netProfit: financialOverview?.netProfit ?? null,
            monthlyBurn: financialOverview?.burnRate.monthly ?? null,
            physicalAssetCount: want("assets") ? physicalAssets.length : null,
          },
    assets: want("assets")
      ? {
          source: "Assets register (Assets, Inventory & Logistics → Assets)",
          total: physicalAssets.length,
          byStatus: physicalAssets.reduce<Record<string, number>>((acc, asset) => {
            acc[asset.operationalStatus] = (acc[asset.operationalStatus] || 0) + 1;
            return acc;
          }, {}),
          byCategory: physicalAssets.reduce<Record<string, number>>((acc, asset) => {
            acc[asset.category] = (acc[asset.category] || 0) + 1;
            return acc;
          }, {}),
          byLocation: physicalAssets.reduce<Record<string, number>>((acc, asset) => {
            acc[asset.location] = (acc[asset.location] || 0) + 1;
            return acc;
          }, {}),
          items: physicalAssets.slice(0, 40).map((asset) => ({
            assetTag: asset.assetTag,
            category: asset.category,
            model: asset.model,
            location: asset.location,
            status: asset.operationalStatus,
            serialNumber: asset.serialNumber,
            nextMaintenanceDue: asset.nextMaintenanceDue,
            notes: asset.notes || null,
          })),
          inventorySample: inventoryItems.slice(0, 15).map((item) => ({
            assetTag: item.assetTag,
            name: item.name,
            category: item.category,
            location: item.location,
            status: item.status,
            currentValue: item.currentValue,
          })),
        }
      : undefined,
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
            reportingCurrency: FINANCIAL_REPORTING_CURRENCY,
            cashPosition: cashPosition ?? 0,
            bankBalanceGbp: cashPosition ?? 0,
            wise: wiseCash
              ? {
                  connected: wiseCash.connected,
                  totalGbp: wiseCash.totalGbp,
                  balances: wiseCash.balances,
                  error: wiseCash.error,
                }
              : null,
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
      domain === "assets"
        ? "The user asked about physical Assets. Answer ONLY from the assets register (tags, models, locations, status). Do NOT report Wise cash, bank balances, clients, or finance unless they also asked."
        : "Answer using only these live figures. For bank/cash questions use Wise balances. For Assets section / physical assets / fleet / drones use the assets register — never confuse Assets with finance. If a field is null/empty/zero, say so plainly.",
  };
}
