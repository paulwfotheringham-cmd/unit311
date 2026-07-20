import type { LeadStatus } from "@/lib/crm-data";
import { listLeads } from "@/lib/crm-leads-service";
import { listClientOnboardingRecords } from "@/lib/client-onboarding-service";
import { listExpenses } from "@/lib/financial-expenses-service";
import { listInternalClients } from "@/lib/internal-clients-service";
import { listOpenActionItems } from "@/lib/internal-action-items-service";
import { listProjects } from "@/lib/internal-projects-service";
import { listStrategyItems } from "@/lib/strategy-items-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace-context";

export type ExecutivePlatformSnapshot = {
  generatedAt: string;
  dataAvailable: boolean;
  crm: {
    totalLeads: number;
    byStatus: Record<LeadStatus, number>;
    openPipelineValue: number;
    hotLeads: Array<{ company: string; value: number | null; nextAction: string }>;
  } | null;
  clients: {
    total: number;
    active: number;
    clientCreated: number;
    workspaceProvisioned: number;
    onboarding: number;
    dormant: number;
    archived: number;
    topActive: string[];
  } | null;
  projects: {
    total: number;
    live: number;
    upcoming: number;
    recentLive: Array<{ name: string; client: string; progressPct: number }>;
  } | null;
  expenses: {
    totalRecorded: number;
    unpaidCount: number;
    byCurrency: Record<string, { paidTotal: number; unpaidTotal: number; last30Days: number }>;
  } | null;
  onboarding: {
    inProgress: number;
    platformLive: number;
    recentSignups: Array<{ company: string; stage: string; status: string }>;
  } | null;
  actionItems: {
    openCount: number;
    topItems: Array<{ task: string; due: string; priority: string }>;
  } | null;
  strategy: {
    initiativeCount: number;
    categories: string[];
  } | null;
  unavailableModules: string[];
};

async function loadModule<T>(
  label: string,
  loader: () => Promise<T>,
  unavailable: string[],
): Promise<T | null> {
  try {
    return await loader();
  } catch {
    unavailable.push(label);
    return null;
  }
}

function sumEstimatedPipeline(
  leads: Awaited<ReturnType<typeof listLeads>>,
): number {
  return leads
    .filter((lead) => lead.status !== "Won" && lead.status !== "Lost")
    .reduce((total, lead) => total + (lead.estimatedValue ?? 0), 0);
}

function expenseTotals(expenses: Awaited<ReturnType<typeof listExpenses>>) {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const byCurrency: Record<string, { paidTotal: number; unpaidTotal: number; last30Days: number }> =
    {};
  let unpaidCount = 0;

  for (const expense of expenses) {
    const amount = Number.isFinite(expense.amount) ? expense.amount : 0;
    const currency = expense.currency || "EUR";

    if (!byCurrency[currency]) {
      byCurrency[currency] = { paidTotal: 0, unpaidTotal: 0, last30Days: 0 };
    }

    if (expense.paid) {
      byCurrency[currency].paidTotal += amount;
    } else {
      unpaidCount += 1;
      byCurrency[currency].unpaidTotal += amount;
    }

    const submittedAt = new Date(expense.dateSubmitted).getTime();
    if (!Number.isNaN(submittedAt) && now - submittedAt <= thirtyDaysMs) {
      byCurrency[currency].last30Days += amount;
    }
  }

  for (const currency of Object.keys(byCurrency)) {
    byCurrency[currency] = {
      paidTotal: Math.round(byCurrency[currency].paidTotal),
      unpaidTotal: Math.round(byCurrency[currency].unpaidTotal),
      last30Days: Math.round(byCurrency[currency].last30Days),
    };
  }

  return { unpaidCount, byCurrency };
}

export async function buildExecutivePlatformSnapshot(): Promise<ExecutivePlatformSnapshot> {
  const unavailableModules: string[] = [];
  const generatedAt = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    return {
      generatedAt,
      dataAvailable: false,
      crm: null,
      clients: null,
      projects: null,
      expenses: null,
      onboarding: null,
      actionItems: null,
      strategy: null,
      unavailableModules: ["all (database not configured)"],
    };
  }

  const workspace = await getCurrentWorkspace();
  const workspaceId = workspace?.id;

  const [leads, clients, projects, expenses, onboardingRecords, actionItems, strategyItems] =
    await Promise.all([
      loadModule("crm", () => listLeads("All"), unavailableModules),
      loadModule("clients", () => listInternalClients(), unavailableModules),
      loadModule("projects", () => listProjects(), unavailableModules),
      loadModule("expenses", () => listExpenses(), unavailableModules),
      loadModule(
        "onboarding",
        () =>
          workspaceId
            ? listClientOnboardingRecords({ status: "all", workspaceId })
            : Promise.resolve([]),
        unavailableModules,
      ),
      loadModule("action_items", () => listOpenActionItems(8), unavailableModules),
      loadModule("strategy", () => listStrategyItems(), unavailableModules),
    ]);

  const crm =
    leads === null
      ? null
      : {
          totalLeads: leads.length,
          byStatus: {
            Cold: leads.filter((lead) => lead.status === "Cold").length,
            Warm: leads.filter((lead) => lead.status === "Warm").length,
            Hot: leads.filter((lead) => lead.status === "Hot").length,
            Won: leads.filter((lead) => lead.status === "Won").length,
            "Active Customer": leads.filter((lead) => lead.status === "Active Customer").length,
            Lost: leads.filter((lead) => lead.status === "Lost").length,
          },
          openPipelineValue: Math.round(sumEstimatedPipeline(leads)),
          hotLeads: leads
            .filter((lead) => lead.status === "Hot")
            .slice(0, 5)
            .map((lead) => ({
              company: lead.companyName,
              value: lead.estimatedValue,
              nextAction: lead.nextAction || "None set",
            })),
        };

  const clientsSnapshot =
    clients === null
      ? null
      : {
          total: clients.length,
          active: clients.filter((client) => client.accountStatus === "Active").length,
          clientCreated: clients.filter((client) => client.accountStatus === "Client Created")
            .length,
          workspaceProvisioned: clients.filter(
            (client) => client.accountStatus === "Workspace Provisioned",
          ).length,
          onboarding: clients.filter((client) => client.accountStatus === "Onboarding").length,
          dormant: clients.filter((client) => client.accountStatus === "Dormant").length,
          archived: clients.filter((client) => client.accountStatus === "Archived").length,
          topActive: clients
            .filter((client) => client.accountStatus === "Active")
            .slice(0, 8)
            .map((client) => client.companyName),
        };

  const projectsSnapshot =
    projects === null
      ? null
      : {
          total: projects.length,
          live: projects.filter((project) => project.phase === "live").length,
          upcoming: projects.filter((project) => project.phase === "upcoming").length,
          recentLive: projects
            .filter((project) => project.phase === "live")
            .slice(0, 5)
            .map((project) => ({
              name: project.name,
              client: project.clientName,
              progressPct: project.progressPct,
            })),
        };

  const expensesSnapshot =
    expenses === null
      ? null
      : {
          totalRecorded: expenses.length,
          ...expenseTotals(expenses),
        };

  const onboardingSnapshot =
    onboardingRecords === null
      ? null
      : {
          inProgress: onboardingRecords.filter((record) => record.currentStatus === "In Progress")
            .length,
          platformLive: onboardingRecords.filter((record) => record.currentStatus === "Platform Live")
            .length,
          recentSignups: onboardingRecords.slice(0, 5).map((record) => ({
            company: record.companyName,
            stage: record.currentStage,
            status: record.currentStatus,
          })),
        };

  const actionItemsSnapshot =
    actionItems === null
      ? null
      : {
          openCount: actionItems.length,
          topItems: actionItems.slice(0, 5).map((item) => ({
            task: item.task,
            due: item.due,
            priority: item.priority,
          })),
        };

  const strategySnapshot =
    strategyItems === null
      ? null
      : {
          initiativeCount: strategyItems.length,
          categories: [...new Set(strategyItems.map((item) => item.category))].slice(0, 8),
        };

  const dataAvailable = Boolean(
    crm || clientsSnapshot || projectsSnapshot || expensesSnapshot || onboardingSnapshot,
  );

  return {
    generatedAt,
    dataAvailable,
    crm,
    clients: clientsSnapshot,
    projects: projectsSnapshot,
    expenses: expensesSnapshot,
    onboarding: onboardingSnapshot,
    actionItems: actionItemsSnapshot,
    strategy: strategySnapshot,
    unavailableModules,
  };
}

export function formatExecutivePlatformSnapshot(snapshot: ExecutivePlatformSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}
