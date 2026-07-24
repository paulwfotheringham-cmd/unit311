import { normalizeKpiRow } from "./composition";
import type { WorkspaceDashboardConfig } from "./types";

/**
 * Example compositions — prove the framework can drive any workspace
 * without bespoke page structure. Not wired into live routes yet.
 */

export const businessCentralDashboardConfig: WorkspaceDashboardConfig = {
  id: "business-central-dashboard",
  workspaceId: "business-central",
  version: 1,
  sections: [
    {
      id: "header",
      slot: "header",
      widgets: [
        {
          id: "bc-header",
          type: "header",
          workspaceName: "Business Central",
          eyebrow: "Commercial operations",
          description: "Clients, pipeline and delivery status for the commercial estate.",
        },
      ],
    },
    {
      id: "ai",
      slot: "ai-summary",
      widgets: [
        {
          id: "bc-ai",
          type: "ai-summary",
          title: "AI Workspace Summary",
          headline: "Pipeline healthy; two deals need executive attention today.",
          summary:
            "Three discovery calls completed this week. Meridian Energy moved to proposal. One overdue onboarding task is blocking go-live for Northwind.",
          nextUp: "Meridian proposal review · 14:00",
          metrics: [
            { label: "Needs attention", value: "2" },
            { label: "Deals advancing", value: "5" },
            { label: "Onboarding risk", value: "1" },
          ],
        },
      ],
    },
    {
      id: "kpis",
      slot: "kpi-row",
      widgets: [
        {
          id: "bc-kpis",
          type: "kpi-row",
          kpis: normalizeKpiRow([
            { id: "active-clients", label: "Active clients", value: "48", delta: "+3 this month", tone: "positive" },
            { id: "pipeline", label: "Pipeline value", value: "£2.4m", delta: "+8%", tone: "positive" },
            { id: "open-projects", label: "Open projects", value: "17", delta: "4 at risk", tone: "warning" },
            { id: "conversion", label: "Win rate", value: "34%", delta: "−2 pts", tone: "warning" },
          ]),
        },
      ],
    },
    {
      id: "alerts-activity",
      slot: "alerts-activity",
      widgets: [
        {
          id: "bc-alerts",
          type: "alerts",
          title: "Alerts",
          items: [
            {
              id: "a1",
              title: "Proposal SLA breached — Meridian Energy",
              detail: "Draft overdue by 1 day. Sales Director notified.",
              severity: "critical",
              timeLabel: "35m ago",
            },
            {
              id: "a2",
              title: "Onboarding stalled — Northwind",
              detail: "Waiting on security questionnaire.",
              severity: "warning",
              timeLabel: "2h ago",
            },
            {
              id: "a3",
              title: "New lead assigned — Harbor Logistics",
              detail: "Inbound from website. Discovery recommended.",
              severity: "info",
              timeLabel: "Today",
            },
          ],
        },
        {
          id: "bc-activity",
          type: "recent-activity",
          title: "Recent Activity",
          items: [
            {
              id: "act1",
              title: "Client record updated — Apex Mining",
              meta: "Account owner · J. Brooks",
              timeLabel: "18m ago",
              category: "Clients",
            },
            {
              id: "act2",
              title: "Opportunity stage change — Meridian Energy",
              meta: "Discovery → Proposal",
              timeLabel: "1h ago",
              category: "Pipeline",
            },
            {
              id: "act3",
              title: "Project kickoff scheduled — Coastal Survey",
              meta: "External Projects",
              timeLabel: "Yesterday",
              category: "Projects",
            },
          ],
        },
      ],
    },
    {
      id: "analytics-queue",
      slot: "analytics-queue",
      widgets: [
        {
          id: "bc-analytics",
          type: "analytics",
          title: "Analytics",
          caption: "Pipeline velocity · last 8 weeks",
          series: [
            { id: "won", label: "Won", values: [2, 1, 3, 2, 4, 3, 2, 5] },
            { id: "open", label: "Open", values: [8, 9, 7, 10, 11, 9, 12, 10] },
          ],
        },
        {
          id: "bc-queue",
          type: "work-queue",
          title: "Work Queue",
          items: [
            {
              id: "q1",
              title: "Send Meridian proposal pack",
              meta: "Sales · High priority",
              status: "Due today",
              dueLabel: "Today",
              priority: "high",
            },
            {
              id: "q2",
              title: "Complete Northwind onboarding checklist",
              meta: "Client Onboarding",
              status: "In progress",
              dueLabel: "Tomorrow",
              priority: "medium",
            },
            {
              id: "q3",
              title: "Qualify Harbor Logistics lead",
              meta: "Pipeline",
              status: "New",
              dueLabel: "This week",
              priority: "medium",
            },
          ],
        },
      ],
    },
    {
      id: "actions",
      slot: "quick-actions",
      widgets: [
        {
          id: "bc-actions",
          type: "quick-actions",
          title: "Quick Actions",
          actions: [
            { id: "new-client", label: "Add Client", action: "create-client", icon: "users" },
            { id: "new-opp", label: "Create Opportunity", action: "create-opportunity", icon: "plus" },
            { id: "schedule", label: "Schedule Discovery", action: "schedule-discovery", icon: "calendar" },
            { id: "note", label: "Log Activity", action: "log-activity", icon: "file" },
          ],
        },
      ],
    },
  ],
};

export const financialsDashboardConfig: WorkspaceDashboardConfig = {
  id: "financials-dashboard",
  workspaceId: "financials",
  version: 1,
  sections: [
    {
      id: "header",
      slot: "header",
      widgets: [
        {
          id: "fin-header",
          type: "header",
          workspaceName: "Financials",
          eyebrow: "Finance command",
          description: "Cash, receivables and spend posture across the operating company.",
        },
      ],
    },
    {
      id: "ai",
      slot: "ai-summary",
      widgets: [
        {
          id: "fin-ai",
          type: "ai-summary",
          title: "AI Workspace Summary",
          headline: "Cash position stable; receivables ageing needs CFO review.",
          summary:
            "£184k overdue beyond 45 days. Two supplier invoices await approval. Operating spend is 3% under monthly forecast.",
          nextUp: "Receivables review · 11:00",
          metrics: [
            { label: "Overdue AR", value: "£184k" },
            { label: "AP pending", value: "12" },
            { label: "Forecast variance", value: "−3%" },
          ],
          visibility: {
            roles: ["ceo", "cfo", "standard-user"],
            priority: 1,
            personalisationKey: "financials.ai-summary",
          },
        },
      ],
    },
    {
      id: "kpis",
      slot: "kpi-row",
      widgets: [
        {
          id: "fin-kpis",
          type: "kpi-row",
          kpis: normalizeKpiRow([
            { id: "cash", label: "Cash on hand", value: "£1.12m", delta: "+£42k", tone: "positive" },
            { id: "ar", label: "Accounts receivable", value: "£496k", delta: "£184k overdue", tone: "warning" },
            { id: "ap", label: "Accounts payable", value: "£211k", delta: "12 pending", tone: "neutral" },
            { id: "burn", label: "Monthly burn", value: "£287k", delta: "On plan", tone: "positive" },
          ]),
        },
      ],
    },
    {
      id: "alerts-activity",
      slot: "alerts-activity",
      widgets: [
        {
          id: "fin-alerts",
          type: "alerts",
          title: "Alerts",
          items: [
            {
              id: "fa1",
              title: "Invoice INV-2041 overdue 62 days",
              detail: "Client: Coastal Survey · £48,200",
              severity: "critical",
              timeLabel: "Today",
            },
            {
              id: "fa2",
              title: "Expense batch EA-291 awaiting approval",
              detail: "£6,420 · Operations",
              severity: "warning",
              timeLabel: "2h ago",
            },
          ],
        },
        {
          id: "fin-activity",
          type: "recent-activity",
          title: "Recent Activity",
          items: [
            {
              id: "fact1",
              title: "Payment received — Apex Mining",
              meta: "£32,500 · Bank",
              timeLabel: "09:40",
              category: "Cash",
            },
            {
              id: "fact2",
              title: "Journal posted — Accruals July",
              meta: "General Ledger",
              timeLabel: "Yesterday",
              category: "GL",
            },
          ],
        },
      ],
    },
    {
      id: "analytics-queue",
      slot: "analytics-queue",
      widgets: [
        {
          id: "fin-analytics",
          type: "analytics",
          title: "Analytics",
          caption: "Cash in / cash out · 8 weeks",
          series: [
            { id: "in", label: "In", values: [120, 90, 140, 110, 160, 130, 150, 170] },
            { id: "out", label: "Out", values: [100, 105, 95, 115, 120, 110, 125, 118] },
          ],
        },
        {
          id: "fin-queue",
          type: "work-queue",
          title: "Work Queue",
          items: [
            {
              id: "fq1",
              title: "Approve supplier invoice SUP-881",
              meta: "Accounts Payable",
              status: "Pending",
              dueLabel: "Today",
              priority: "high",
            },
            {
              id: "fq2",
              title: "Chase Coastal Survey AR",
              meta: "Accounts Receivable",
              status: "Overdue",
              dueLabel: "Today",
              priority: "high",
            },
          ],
          visibility: {
            roles: ["cfo", "ceo", "standard-user"],
            priority: 2,
            personalisationKey: "financials.work-queue",
          },
        },
      ],
    },
    {
      id: "actions",
      slot: "quick-actions",
      widgets: [
        {
          id: "fin-actions",
          type: "quick-actions",
          title: "Quick Actions",
          actions: [
            { id: "new-invoice", label: "Raise Invoice", action: "raise-invoice", icon: "file" },
            { id: "record-payment", label: "Record Payment", action: "record-payment", icon: "plus" },
            { id: "approve-expense", label: "Approve Expense", action: "approve-expense", icon: "ticket" },
            { id: "export-report", label: "Export Report", action: "export-report", icon: "upload" },
          ],
        },
      ],
    },
  ],
};

/** Registry of framework-ready workspace dashboards (for future wiring). */
export const DASHBOARD_CONFIG_REGISTRY: Record<string, WorkspaceDashboardConfig> = {
  "business-central": businessCentralDashboardConfig,
  financials: financialsDashboardConfig,
};
