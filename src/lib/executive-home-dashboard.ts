import { normalizeKpiRow } from "@/lib/dashboard-framework";
import type { WorkspaceDashboardConfig } from "@/lib/dashboard-framework";

/**
 * Flagship Executive Home Dashboard — composed entirely from the
 * universal dashboard framework. No bespoke layout.
 */
export const executiveHomeDashboardConfig: WorkspaceDashboardConfig = {
  id: "executive-home-dashboard",
  workspaceId: "home",
  version: 1,
  sections: [
    {
      id: "header",
      slot: "header",
      widgets: [
        {
          id: "home-header",
          type: "header",
          workspaceName: "Home",
          description:
            "Executive Dashboard — Your organisation at a glance. AI-powered insights, priorities and business performance across every workspace.",
        },
      ],
    },
    {
      id: "ai",
      slot: "ai-summary",
      widgets: [
        {
          id: "home-ai",
          type: "ai-summary",
          title: "AI Executive Summary",
          headline: "Good morning Philip.",
          summary:
            "Sales pipeline increased 8% this week. Cash position remains healthy. Two contracts require approval. One project is behind schedule. Engineering capacity reaches 91% next Tuesday. Three invoices are overdue.",
          nextUp: "Review the ABC Medical proposal before 2pm.",
          metrics: [
            { label: "Needs attention", value: "6" },
            { label: "Changed this week", value: "14" },
            { label: "Decisions due", value: "3" },
          ],
        },
      ],
    },
    {
      id: "kpis",
      slot: "kpi-row",
      widgets: [
        {
          id: "home-kpis",
          type: "kpi-row",
          kpis: normalizeKpiRow([
            {
              id: "revenue",
              label: "Revenue",
              value: "£4.82m",
              delta: "+6.2% vs last quarter",
              tone: "positive",
              hint: "YTD · all entities",
            },
            {
              id: "cash",
              label: "Cash Available",
              value: "£1.12m",
              delta: "+£42k this month",
              tone: "positive",
              hint: "Operating accounts",
            },
            {
              id: "projects",
              label: "Open Projects",
              value: "17",
              delta: "4 at risk",
              tone: "warning",
              hint: "Internal + external",
            },
            {
              id: "clients",
              label: "Active Clients",
              value: "48",
              delta: "+3 this month",
              tone: "positive",
              hint: "Live commercial relationships",
            },
          ]),
        },
      ],
    },
    {
      id: "alerts-activity",
      slot: "alerts-activity",
      widgets: [
        {
          id: "home-alerts",
          type: "alerts",
          title: "Business Alerts",
          items: [
            {
              id: "ha1",
              title: "Two contracts awaiting signature",
              detail: "ABC Medical MSA and Harbor Logistics SOW are past internal review.",
              severity: "critical",
              timeLabel: "Due today",
            },
            {
              id: "ha2",
              title: "Project behind schedule — Coastal Survey",
              detail: "Delivery slipped 9 days. Client notified; recovery plan required.",
              severity: "warning",
              timeLabel: "Updated 1h ago",
            },
            {
              id: "ha3",
              title: "Three invoices overdue beyond 45 days",
              detail: "£184k outstanding. Finance recommends chase sequence today.",
              severity: "warning",
              timeLabel: "Finance",
            },
            {
              id: "ha4",
              title: "Engineering capacity peak Tuesday",
              detail: "Projected utilisation 91%. New commitments should wait until Wednesday.",
              severity: "info",
              timeLabel: "Next week",
            },
          ],
        },
        {
          id: "home-activity",
          type: "recent-activity",
          title: "Recent Business Activity",
          items: [
            {
              id: "act1",
              title: "Pipeline stage change — Meridian Energy",
              meta: "Discovery → Proposal · £420k",
              timeLabel: "08:40",
              category: "Sales",
            },
            {
              id: "act2",
              title: "Payment received — Apex Mining",
              meta: "£32,500 cleared to operating account",
              timeLabel: "09:15",
              category: "Finance",
            },
            {
              id: "act3",
              title: "Board pack draft shared",
              meta: "Q3 pack uploaded for director review",
              timeLabel: "Yesterday",
              category: "Corporate",
            },
            {
              id: "act4",
              title: "New client record — Harbor Logistics",
              meta: "Created from inbound website enquiry",
              timeLabel: "Yesterday",
              category: "Clients",
            },
            {
              id: "act5",
              title: "Support ticket escalated — TK-1042",
              meta: "External portal login failure",
              timeLabel: "2h ago",
              category: "Support",
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
          id: "home-analytics",
          type: "analytics",
          title: "Business Performance",
          caption: "Revenue vs operating spend · last 8 weeks",
          series: [
            { id: "revenue", label: "Revenue", values: [410, 390, 450, 420, 480, 460, 510, 495] },
            { id: "spend", label: "Operating spend", values: [280, 275, 290, 285, 300, 295, 310, 287] },
          ],
        },
        {
          id: "home-queue",
          type: "work-queue",
          title: "Tasks Requiring Attention",
          items: [
            {
              id: "tq1",
              title: "Approve ABC Medical proposal",
              meta: "Decision · Commercial",
              status: "Approval",
              dueLabel: "Before 2pm",
              priority: "high",
            },
            {
              id: "tq2",
              title: "Sign Harbor Logistics SOW",
              meta: "Contract · Legal review complete",
              status: "Approval",
              dueLabel: "Today",
              priority: "high",
            },
            {
              id: "tq3",
              title: "Review Coastal Survey recovery plan",
              meta: "Project · Delivery risk",
              status: "Review",
              dueLabel: "Today",
              priority: "high",
            },
            {
              id: "tq4",
              title: "Authorise overdue invoice chase sequence",
              meta: "Finance · £184k AR",
              status: "Decision",
              dueLabel: "Tomorrow",
              priority: "medium",
            },
            {
              id: "tq5",
              title: "Confirm Tuesday engineering allocation",
              meta: "Capacity · 91% projected",
              status: "Deadline",
              dueLabel: "Monday",
              priority: "medium",
            },
          ],
        },
      ],
    },
  ],
};
