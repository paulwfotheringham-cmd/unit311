import { normalizeKpiRow } from "@/lib/dashboard-framework";
import type { WorkspaceDashboardConfig } from "@/lib/dashboard-framework";

/**
 * Technology Management dashboard — Universal Dashboard Framework composition.
 * Placeholder metrics for the organisation's internal technology estate.
 */
export const technologyManagementDashboardConfig: WorkspaceDashboardConfig = {
  id: "technology-management-dashboard",
  workspaceId: "technology",
  version: 1,
  sections: [
    {
      id: "header",
      slot: "header",
      widgets: [
        {
          id: "tech-header",
          type: "header",
          workspaceName: "Technology Management",
          eyebrow: "Internal technology estate",
          description:
            "Operate devices, software, telecommunications and infrastructure across the organisation — distinct from Engineering product delivery.",
        },
      ],
    },
    {
      id: "ai",
      slot: "ai-summary",
      widgets: [
        {
          id: "tech-ai",
          type: "ai-summary",
          title: "AI Technology Summary",
          headline: "Estate healthy; three renewals need attention this month.",
          summary:
            "Device compliance is strong. Two SaaS contracts renew within 30 days. One SSL certificate expires next week. Telecom spend is 6% above last quarter due to additional mobile lines for field operations.",
          nextUp: "Review Microsoft 365 renewal pack before Friday.",
          metrics: [
            { label: "Open alerts", value: "5" },
            { label: "Renewals (30d)", value: "3" },
            { label: "Warranty due", value: "7" },
          ],
        },
      ],
    },
    {
      id: "kpis",
      slot: "kpi-row",
      widgets: [
        {
          id: "tech-kpis",
          type: "kpi-row",
          kpis: normalizeKpiRow([
            {
              id: "total-devices",
              label: "Total Devices",
              value: "214",
              delta: "+6 this month",
              tone: "positive",
              hint: "Assigned + spare pool",
            },
            {
              id: "software-licences",
              label: "Software Licences",
              value: "87",
              delta: "12 renewing soon",
              tone: "warning",
              hint: "Active subscriptions",
            },
            {
              id: "monthly-spend",
              label: "Monthly Technology Spend",
              value: "€48.2k",
              delta: "+6% vs last month",
              tone: "warning",
              hint: "Devices + SaaS + telecom",
            },
            {
              id: "telecom-active",
              label: "Active Telecom Services",
              value: "63",
              delta: "4 pending activation",
              tone: "neutral",
              hint: "Mobile + connectivity",
            },
            {
              id: "infra-health",
              label: "Infrastructure Health",
              value: "98%",
              delta: "All critical systems up",
              tone: "positive",
              hint: "Cloud + identity",
            },
            {
              id: "tech-alerts",
              label: "Technology Alerts",
              value: "5",
              delta: "2 critical",
              tone: "critical",
              hint: "Require owner action",
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
          id: "tech-alerts",
          type: "alerts",
          title: "Technology Alerts",
          items: [
            {
              id: "a1",
              title: "SSL certificate expiring — unit311central.com",
              detail: "Expires in 8 days. Rotate via Cloudflare before cutover.",
              severity: "critical",
              timeLabel: "Today",
            },
            {
              id: "a2",
              title: "Microsoft 365 renewal in 21 days",
              detail: "Seat count review recommended with Finance.",
              severity: "warning",
              timeLabel: "Today",
            },
            {
              id: "a3",
              title: "7 device warranties expire this quarter",
              detail: "Laptops in Barcelona spare pool — decide replace vs extend.",
              severity: "info",
              timeLabel: "This week",
            },
          ],
        },
        {
          id: "tech-activity",
          type: "recent-activity",
          title: "Recent Technology Activity",
          items: [
            {
              id: "act1",
              title: "Laptop assigned — MacBook Pro 14\"",
              meta: "HR onboarding · Alex Rivera",
              timeLabel: "2h ago",
              category: "Devices",
            },
            {
              id: "act2",
              title: "SaaS seat added — Figma Organization",
              meta: "Design · billed to ENG-OXF",
              timeLabel: "Yesterday",
              category: "Software",
            },
            {
              id: "act3",
              title: "SIM activated — +34 612 ··· 884",
              meta: "Field Operations · Iberia Mobile",
              timeLabel: "Yesterday",
              category: "Telecom",
            },
            {
              id: "act4",
              title: "Supabase backup verified",
              meta: "Infrastructure · EU West",
              timeLabel: "2 days ago",
              category: "Infrastructure",
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
          id: "tech-analytics",
          type: "analytics",
          title: "Upcoming Renewals & Warranties",
          caption: "Items requiring attention in the next 90 days",
          series: [
            { id: "renewals", label: "Software renewals", values: [2, 3, 4, 3, 5, 4, 6, 5] },
            { id: "warranty", label: "Warranty expirations", values: [1, 1, 2, 1, 3, 2, 2, 3] },
          ],
        },
        {
          id: "tech-queue",
          type: "work-queue",
          title: "Upcoming Renewals",
          items: [
            {
              id: "q1",
              title: "Microsoft 365 Business Premium",
              meta: "€2,840 / month · 48 seats",
              status: "Renewal",
              dueLabel: "21 days",
              priority: "high",
            },
            {
              id: "q2",
              title: "Iberia Mobile fleet plan",
              meta: "32 lines · Operations",
              status: "Contract",
              dueLabel: "35 days",
              priority: "medium",
            },
            {
              id: "q3",
              title: "Vercel Pro + bandwidth",
              meta: "Hosting · Unit311 Central",
              status: "Subscription",
              dueLabel: "48 days",
              priority: "low",
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
          id: "tech-actions",
          type: "quick-actions",
          title: "Quick actions",
          actions: [
            { id: "open-devices", label: "Open Devices", action: "open-devices", icon: "plus" },
            { id: "open-software", label: "Open Software", action: "open-software", icon: "file" },
            { id: "open-telecom", label: "Telecommunications", action: "open-telecom", icon: "ticket" },
            { id: "open-infra", label: "Infrastructure", action: "open-infra", icon: "upload" },
          ],
        },
      ],
    },
  ],
};
