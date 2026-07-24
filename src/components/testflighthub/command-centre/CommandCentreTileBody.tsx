"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderKanban,
  FolderOpen,
  MessageSquare,
  Receipt,
  Users,
  X,
} from "lucide-react";

import { useCommandCentreData } from "@/components/testflighthub/CommandCentreDataProvider";
import { useCorporateMockStore } from "@/components/testflighthub/useCorporateMockStore";
import { useHrMockStore } from "@/components/testflighthub/useHrMockStore";
import { formatMoney } from "@/lib/accounting/chart-of-accounts";
import type { CommandCentreTileType } from "@/lib/command-centre-layout";
import type { CrmLead } from "@/lib/crm-data";
import type { ActionPriority } from "@/lib/internal-operations-command-data";
import {
  buildBusinessHealthIssues,
  buildExecutiveActionItems,
  buildMyWork,
  buildRecentActivity,
  buildTodaySchedule,
  countLiveProjects,
  countOpenTickets,
  priorityPillClass,
  type ActivityEntry,
  type ExecutiveActionItem,
} from "@/lib/home-executive-dashboard";
import { getInventoryMockSnapshot } from "@/lib/inventory-mock-store";
import { getInternalNavHref } from "@/lib/internal-operations-data";
import { QMS_MODULES, QMS_TRAINING_COURSES } from "@/lib/qms-modules-data";
import { MODULE_GO_LIVE_CATALOG } from "@/lib/module-go-live-data";
import { cn } from "@/lib/utils";
import { useInternalOperationsBasePath } from "@/components/testflighthub/InternalOperationsBasePathContext";

const PINNED_FILES_KEY = "unit311-command-centre-pinned-files";

function EmptyLine({ message }: { message: string }) {
  return <p className="py-2 text-center text-[11px] text-white/40">{message}</p>;
}

function priorityLetter(priority: ActionPriority) {
  switch (priority) {
    case "critical":
      return "C";
    case "high":
      return "H";
    case "medium":
      return "M";
    case "low":
      return "L";
  }
}

function healthSeverityClass(severity: "critical" | "warning" | "info") {
  switch (severity) {
    case "critical":
      return "border-rose-400/30 bg-rose-500/10 text-rose-100";
    case "warning":
      return "border-amber-400/30 bg-amber-500/10 text-amber-100";
    case "info":
      return "border-sky-400/30 bg-sky-500/10 text-sky-100";
  }
}

function KpiChip({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-white/10 bg-[#0b1524]/75 px-1.5 py-1 transition-colors hover:border-sky-400/30 hover:bg-sky-500/10"
    >
      <p className="truncate text-[8px] font-medium uppercase tracking-[0.1em] text-white/40">{label}</p>
      <p className="mt-px truncate text-[12px] font-semibold tabular-nums text-white">{value}</p>
    </Link>
  );
}

function MetricCard({
  label,
  value,
  href,
  hint,
  loading,
}: {
  label: string;
  value: string | number;
  href: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-2xl font-semibold tabular-nums text-white">
        {loading ? "…" : value}
      </p>
      {hint ? <p className="text-xs text-white/45">{hint}</p> : null}
      <Link
        href={href}
        className="inline-flex text-[11px] font-semibold uppercase tracking-[0.1em] text-sky-300/80 hover:text-sky-100"
      >
        Open {label}
      </Link>
    </div>
  );
}

function scheduleKindClass(kind: string) {
  switch (kind) {
    case "Meeting":
      return "border-sky-400/30 bg-sky-500/10 text-sky-100";
    case "Deadline":
      return "border-rose-400/30 bg-rose-500/10 text-rose-100";
    case "Milestone":
      return "border-violet-400/30 bg-violet-500/10 text-violet-100";
    case "Leave":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
    case "Training":
      return "border-amber-400/30 bg-amber-500/10 text-amber-100";
    case "Birthday":
    case "Anniversary":
      return "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100";
    case "Task":
      return "border-white/15 bg-white/[0.04] text-white/70";
    default:
      return "border-white/15 bg-white/[0.04] text-white/70";
  }
}

function activityKindClass(kind: string) {
  switch (kind) {
    case "Client":
      return "text-sky-300";
    case "Project":
      return "text-violet-300";
    case "Contract":
      return "text-amber-300";
    case "Support":
      return "text-rose-300";
    case "Document":
      return "text-emerald-300";
    case "Employee":
      return "text-cyan-300";
    case "CRM":
      return "text-fuchsia-300";
    case "Finance":
      return "text-emerald-300";
    case "Engineering":
    case "Technology":
      return "text-cyan-300";
    case "Training":
      return "text-amber-300";
    case "Inventory":
      return "text-sky-300";
    case "HR":
      return "text-violet-300";
    default:
      return "text-white/55";
  }
}

function formatLeadWhen(lead: CrmLead) {
  const at = lead.lastActivityAt || lead.lastContactAt || lead.originalEnquirySubmittedAt;
  if (!at) return "Recent";
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(at));
  } catch {
    return "Recent";
  }
}

function loadPinnedFileIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PINNED_FILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function useCommandCentreHrefs() {
  const basePath = useInternalOperationsBasePath();
  return useMemo(
    () => ({
      clients: getInternalNavHref("clients", basePath),
      projects: getInternalNavHref("projects", basePath),
      support: getInternalNavHref("support", basePath),
      calendar: getInternalNavHref("calendar", basePath),
      hr: getInternalNavHref("hr", basePath),
      hrLeave: getInternalNavHref("hr-leave", basePath),
      hrRecruitment: getInternalNavHref("hr-recruitment", basePath),
      hrPerformance: getInternalNavHref("hr-performance", basePath),
      training: getInternalNavHref("training", basePath),
      corporateContracts: getInternalNavHref("corporate-information", basePath, {
        tab: "contracts",
      }),
      files: getInternalNavHref("files-internal", basePath),
      messaging: getInternalNavHref("messaging", basePath),
      usersExternal: getInternalNavHref("users-external", basePath),
      home: getInternalNavHref("home", basePath),
      financials: getInternalNavHref("financials", basePath),
      expenses: getInternalNavHref("expenses", basePath),
      crm: getInternalNavHref("crm", basePath),
      engineering: getInternalNavHref("technology-dashboard", basePath),
      quality: getInternalNavHref("quality-management", basePath),
      inventory: getInternalNavHref("inventory-management", basePath),
      moduleGoLive: getInternalNavHref("module-go-live", basePath),
      unit311Details: getInternalNavHref("unit311-details", basePath),
      financialReports: getInternalNavHref("financial-reports", basePath),
      basePath,
    }),
    [basePath],
  );
}

function ActionRequiredRow({
  item,
  onComplete,
  dense = true,
}: {
  item: ExecutiveActionItem;
  onComplete: (id: string) => void;
  dense?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 border-b border-white/[0.05] last:border-b-0",
        dense ? "py-1" : "py-1.5",
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[9px] font-bold",
          priorityPillClass(item.priority),
        )}
        title={item.priority}
      >
        {priorityLetter(item.priority)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-white">{item.title}</p>
        <p className="truncate text-[10px] text-white/40">
          {item.module} · {item.owner} · {item.due}
        </p>
      </div>
      <Link
        href={item.href}
        className="inline-flex h-6 shrink-0 items-center rounded-md border border-sky-500/35 bg-sky-500/10 px-1.5 text-[10px] font-semibold text-sky-100 hover:bg-sky-500/20"
      >
        Open
      </Link>
      <button
        type="button"
        onClick={() => onComplete(item.id)}
        className="inline-flex h-6 shrink-0 items-center rounded-md border border-emerald-400/30 bg-emerald-500/10 px-1.5 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-500/20"
      >
        Done
      </button>
    </div>
  );
}

export function CommandCentreTileBody({ type }: { type: CommandCentreTileType }) {
  const data = useCommandCentreData();
  const corporate = useCorporateMockStore();
  const hrMock = useHrMockStore();
  const hrefs = useCommandCentreHrefs();
  const [pinnedIds] = useState(() => loadPinnedFileIds());
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false);

  const inventory = useMemo(() => getInventoryMockSnapshot(), []);

  const actionItems = useMemo(
    () =>
      buildExecutiveActionItems(
        {
          apiItems: data.apiActionItems,
          projects: data.projects,
          tickets: data.tickets,
          contracts: corporate.contracts,
          clients: data.clients,
          hrefs: {
            support: hrefs.support,
            projects: hrefs.projects,
            clients: hrefs.clients,
            corporateContracts: hrefs.corporateContracts,
            hr: hrefs.hr,
          },
        },
        25,
      ).filter((item) => !data.completedActionIds.includes(item.id)),
    [
      data.apiActionItems,
      data.projects,
      data.tickets,
      data.clients,
      data.completedActionIds,
      corporate.contracts,
      hrefs,
    ],
  );

  const cardActionItems = actionItems.slice(0, 5);

  const schedule = useMemo(
    () =>
      buildTodaySchedule({
        events: data.events,
        projects: data.projects,
        leave: hrMock.leaveRequests,
        employees: data.employees,
        hrefs: {
          calendar: hrefs.calendar,
          projects: hrefs.projects,
          hrLeave: hrefs.hrLeave,
          training: hrefs.training,
          hr: hrefs.hr,
        },
      }),
    [data.events, data.projects, data.employees, hrMock.leaveRequests, hrefs],
  );

  const activity = useMemo(() => {
    const base = buildRecentActivity({
      clients: data.clients,
      projects: data.projects,
      tickets: data.tickets,
      contracts: corporate.contracts,
      employees: data.employees,
      hrefs: {
        clients: hrefs.clients,
        projects: hrefs.projects,
        support: hrefs.support,
        corporateContracts: hrefs.corporateContracts,
        files: hrefs.files,
        hr: hrefs.hr,
      },
    });
    const crmRows: ActivityEntry[] = data.crmLeads.slice(0, 8).map((lead) => ({
      id: `crm-${lead.id}`,
      kind: "CRM" as const,
      title: lead.companyName,
      detail: `${lead.status} · ${lead.contactName || lead.firstName || "Lead"}`,
      when: formatLeadWhen(lead),
      href: hrefs.crm,
    }));
    return [...crmRows, ...base].slice(0, 6);
  }, [
    data.clients,
    data.projects,
    data.tickets,
    data.employees,
    data.crmLeads,
    corporate.contracts,
    hrefs,
  ]);

  const myWork = useMemo(
    () =>
      buildMyWork({
        username: data.username,
        displayName: data.displayName,
        actionItems,
        events: data.events,
        unreadCount: data.unreadCount,
        hrefs: {
          calendar: hrefs.calendar,
          messaging: hrefs.messaging,
          home: hrefs.home,
        },
      }),
    [data.username, data.displayName, actionItems, data.events, data.unreadCount, hrefs],
  );

  const todayIso = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }, []);

  const leaveToday = useMemo(
    () =>
      hrMock.leaveRequests.filter(
        (leave) =>
          (leave.status === "approved" || leave.status === "pending") &&
          leave.startDate <= todayIso &&
          leave.endDate >= todayIso,
      ),
    [hrMock.leaveRequests, todayIso],
  );

  const openVacancies = useMemo(
    () => hrMock.vacancies.filter((v) => v.status === "open"),
    [hrMock.vacancies],
  );

  const openContracts = useMemo(
    () =>
      corporate.contracts.filter(
        (c) => c.status === "active" || c.status === "expiring",
      ),
    [corporate.contracts],
  );

  const renewals = useMemo(
    () => corporate.contracts.filter((c) => c.status === "expiring"),
    [corporate.contracts],
  );

  const openReviews = useMemo(
    () =>
      hrMock.reviews.filter(
        (r) => r.status === "draft" || r.status === "submitted",
      ),
    [hrMock.reviews],
  );

  const fileEntries = useMemo(
    () => data.files.filter((entry) => entry.kind === "file").slice(0, 8),
    [data.files],
  );

  const pinnedFiles = useMemo(() => {
    if (pinnedIds.length === 0) return [];
    return data.files.filter(
      (entry) => entry.kind === "file" && pinnedIds.includes(entry.item.id),
    );
  }, [data.files, pinnedIds]);

  const burnMonthly = data.financialOverview?.burnRate?.monthly ?? null;
  const revenueYtd = data.financialOverview?.revenueYtd;
  const cashPosition = data.financialOverview?.cashPosition ?? null;
  const openTicketCount = countOpenTickets(data.tickets);
  const liveProjects = countLiveProjects(data.projects);
  const pipelineCount = data.crmLeads.filter(
    (lead) => lead.status !== "Lost" && lead.status !== "Won" && lead.status !== "Active Customer",
  ).length;

  const healthIssues = useMemo(
    () =>
      buildBusinessHealthIssues({
        actionItems,
        tickets: data.tickets,
        projects: data.projects,
        contracts: corporate.contracts,
        burnMonthly,
        cashPosition,
        hrefs: {
          support: hrefs.support,
          projects: hrefs.projects,
          corporateContracts: hrefs.corporateContracts,
          financials: hrefs.financials,
        },
      }),
    [
      actionItems,
      data.tickets,
      data.projects,
      corporate.contracts,
      burnMonthly,
      cashPosition,
      hrefs,
    ],
  );

  const moneyOrZero = (value: number | null | undefined, loading: boolean) => {
    if (loading) return "…";
    return formatMoney(value ?? 0);
  };

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return [...data.events]
      .filter((event) => Date.parse(event.startsAt) >= now)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
      .slice(0, 5);
  }, [data.events]);

  const approvalItems = actionItems.filter(
    (item) => item.primaryLabel === "Approve" || item.title.toLowerCase().includes("approv"),
  );
  const taskItems = actionItems.filter((item) => item.primaryLabel !== "Approve");

  const qmsOpen = QMS_MODULES.filter((m) => m.status !== "complete").length;
  const trainingDue = QMS_TRAINING_COURSES.filter((c) => c.progress < 100).length;
  const inventoryCount = inventory.assets.length;
  const inventoryDown = inventory.assets.filter(
    (a) => a.status !== "operational",
  ).length;

  switch (type) {
    case "action-required":
      return (
        <>
          {cardActionItems.length === 0 ? (
            <EmptyLine
              message={
                data.loading.actionItems || data.loading.tickets || data.loading.projects
                  ? "Loading priorities…"
                  : "Nothing urgent right now."
              }
            />
          ) : (
            <div>
              {cardActionItems.map((item) => (
                <ActionRequiredRow
                  key={item.id}
                  item={item}
                  onComplete={data.completeAction}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setActionDrawerOpen(true)}
            className="mt-1.5 w-full rounded-md border border-white/10 bg-white/[0.03] py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          >
            View All{actionItems.length > 0 ? ` · ${actionItems.length}` : ""}
          </button>
          {actionDrawerOpen ? (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
              <aside className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0a1220] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300/80">
                      Action Required
                    </p>
                    <h2 className="text-sm font-semibold text-white">
                      All priorities · {actionItems.length}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActionDrawerOpen(false)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:bg-white/[0.08]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-2">
                  {actionItems.length === 0 ? (
                    <EmptyLine message="Nothing urgent right now." />
                  ) : (
                    actionItems.map((item) => (
                      <ActionRequiredRow
                        key={item.id}
                        item={item}
                        onComplete={data.completeAction}
                        dense={false}
                      />
                    ))
                  )}
                </div>
              </aside>
            </div>
          ) : null}
        </>
      );

    case "todays-schedule":
      return schedule.length === 0 ? (
        <EmptyLine message="No schedule items for today." />
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {schedule.slice(0, 6).map((entry) => (
            <li key={entry.id}>
              <Link
                href={entry.href}
                className="flex items-center gap-1.5 py-1 transition-colors hover:bg-white/[0.03]"
              >
                <span className="w-14 shrink-0 truncate text-[10px] tabular-nums text-white/45">
                  {entry.when}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white">
                  {entry.title}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded border px-1 py-px text-[8px] font-semibold uppercase tracking-[0.06em]",
                    scheduleKindClass(entry.kind),
                  )}
                >
                  {entry.kind}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      );

    case "business-health":
      return healthIssues.length === 0 ? (
        <EmptyLine message="No operational issues flagged." />
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {healthIssues.map((issue) => (
            <li key={issue.id}>
              <Link
                href={issue.href}
                className="flex items-start gap-1.5 py-1 transition-colors hover:bg-white/[0.03]"
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded border px-1 py-px text-[8px] font-bold uppercase tracking-[0.06em]",
                    healthSeverityClass(issue.severity),
                  )}
                >
                  {issue.severity === "critical" ? "Crit" : issue.severity === "warning" ? "Warn" : "Info"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-white">
                    {issue.title}
                  </span>
                  <span className="block truncate text-[10px] text-white/40">{issue.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      );

    case "business-snapshot":
      return (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 xl:grid-cols-9">
          <KpiChip label="Clients" value={data.clients.length} href={hrefs.clients} />
          <KpiChip
            label="Revenue"
            value={moneyOrZero(revenueYtd, data.loading.financials)}
            href={hrefs.financials}
          />
          <KpiChip
            label="Burn Rate"
            value={moneyOrZero(burnMonthly, data.loading.financials)}
            href={hrefs.financials}
          />
          <KpiChip
            label="Cash"
            value={moneyOrZero(cashPosition, data.loading.financials)}
            href={hrefs.financials}
          />
          <KpiChip label="Projects" value={liveProjects} href={hrefs.projects} />
          <KpiChip label="Employees" value={data.employees.length} href={hrefs.hr} />
          <KpiChip label="Support" value={openTicketCount} href={hrefs.support} />
          <KpiChip label="Contracts" value={openContracts.length} href={hrefs.corporateContracts} />
          <KpiChip label="Pipeline" value={pipelineCount} href={hrefs.crm} />
        </div>
      );

    case "recent-activity":
      return activity.length === 0 ? (
        <EmptyLine message="No recent activity yet." />
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {activity.map((entry) => (
            <li key={entry.id}>
              <Link
                href={entry.href}
                className="flex items-center justify-between gap-2 py-1 transition-colors hover:bg-white/[0.03]"
              >
                <span className="min-w-0 flex items-center gap-1.5">
                  <span
                    className={cn(
                      "shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em]",
                      activityKindClass(entry.kind),
                    )}
                  >
                    {entry.kind}
                  </span>
                  <span className="truncate text-[12px] font-medium text-white">{entry.title}</span>
                </span>
                <span className="shrink-0 text-[10px] tabular-nums text-white/35">{entry.when}</span>
              </Link>
            </li>
          ))}
        </ul>
      );

    case "my-work":
      return myWork.length === 0 ? (
        <EmptyLine message="Your queue is clear." />
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {myWork.slice(0, 5).map((entry) => (
            <li key={entry.id}>
              <Link
                href={entry.href}
                className="flex items-center gap-1.5 py-1 transition-colors hover:bg-white/[0.03]"
              >
                <span className="w-16 shrink-0 truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-200/70">
                  {entry.label}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-white">{entry.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      );

    case "quick-actions": {
      const actions: Array<{ label: string; href: string; icon: React.ReactNode }> = [
        { label: "New Client", href: hrefs.clients, icon: <Building2 className="h-3.5 w-3.5" /> },
        { label: "New Project", href: hrefs.projects, icon: <FolderKanban className="h-3.5 w-3.5" /> },
        { label: "New Employee", href: hrefs.hr, icon: <Users className="h-3.5 w-3.5" /> },
        {
          label: "Generate Report",
          href: hrefs.financialReports,
          icon: <ClipboardList className="h-3.5 w-3.5" />,
        },
        { label: "Create Invoice", href: hrefs.expenses, icon: <Receipt className="h-3.5 w-3.5" /> },
        { label: "Upload File", href: hrefs.files, icon: <FolderOpen className="h-3.5 w-3.5" /> },
        { label: "Send Message", href: hrefs.messaging, icon: <MessageSquare className="h-3.5 w-3.5" /> },
        { label: "Book Meeting", href: hrefs.calendar, icon: <CalendarDays className="h-3.5 w-3.5" /> },
      ];
      return (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-cyan-400/15 bg-cyan-500/[0.06] px-1.5 py-1 text-[11px] font-semibold text-cyan-50 transition-colors hover:border-cyan-300/35 hover:bg-cyan-500/12"
            >
              <span className="shrink-0 text-cyan-200/80">{action.icon}</span>
              <span className="truncate leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      );
    }

    case "clients":
      return (
        <MetricCard
          label="Clients"
          value={data.clients.length}
          href={hrefs.clients}
          loading={data.loading.clients}
          hint={`${data.externalUsers.length} external users`}
        />
      );

    case "projects":
      return (
        <MetricCard
          label="Projects"
          value={liveProjects}
          href={hrefs.projects}
          loading={data.loading.projects}
          hint={`${data.projects.length} total`}
        />
      );

    case "revenue":
      return (
        <MetricCard
          label="Revenue"
          value={formatMoney(revenueYtd ?? 0)}
          href={hrefs.financials}
          loading={data.loading.financials}
          hint="YTD from ledger"
        />
      );

    case "cash-flow":
      return (
        <MetricCard
          label="Cash Flow"
          value={formatMoney(cashPosition ?? 0)}
          href={hrefs.financials}
          loading={data.loading.financials}
          hint="Wise treasury"
        />
      );

    case "burn-rate":
      return (
        <MetricCard
          label="Burn Rate"
          value={formatMoney(burnMonthly ?? 0)}
          href={hrefs.financials}
          loading={data.loading.financials}
          hint="Monthly operating burn"
        />
      );

    case "employees":
      return (
        <MetricCard
          label="Employees"
          value={data.employees.length}
          href={hrefs.hr}
          loading={data.loading.employees}
        />
      );

    case "support-tickets":
      return (
        <MetricCard
          label="Support"
          value={openTicketCount}
          href={hrefs.support}
          loading={data.loading.tickets}
          hint="Open tickets"
        />
      );

    case "messages":
    case "notifications":
      return (
        <MetricCard
          label={type === "messages" ? "Messages" : "Notifications"}
          value={data.unreadCount}
          href={hrefs.messaging}
          loading={data.loading.unread}
          hint="Unread"
        />
      );

    case "leave-today":
      return leaveToday.length === 0 ? (
        <EmptyLine message="No one on leave today." />
      ) : (
        <ul className="space-y-1.5">
          {leaveToday.slice(0, 6).map((leave) => (
            <li key={leave.id}>
              <Link
                href={hrefs.hrLeave}
                className="block rounded-lg border border-white/10 px-2.5 py-2 text-sm text-white hover:bg-white/[0.04]"
              >
                <span className="font-medium">{leave.employeeName}</span>
                <span className="mt-0.5 block text-[11px] text-white/45">
                  {leave.type} · {leave.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      );

    case "recruitment":
      return openVacancies.length === 0 ? (
        <EmptyLine message="No open roles." />
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-semibold tabular-nums text-white">{openVacancies.length}</p>
          <p className="text-xs text-white/45">
            {hrMock.candidates.filter((c) => !c.rejected).length} candidates in pipeline
          </p>
          <ul className="space-y-1">
            {openVacancies.slice(0, 4).map((vacancy) => (
              <li key={vacancy.id}>
                <Link
                  href={hrefs.hrRecruitment}
                  className="block truncate text-sm text-white/80 hover:text-white"
                >
                  {vacancy.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );

    case "open-contracts":
      return openContracts.length === 0 ? (
        <EmptyLine message="No active contracts." />
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-semibold tabular-nums text-white">{openContracts.length}</p>
          <ul className="space-y-1">
            {openContracts.slice(0, 4).map((contract) => (
              <li key={contract.id}>
                <Link
                  href={hrefs.corporateContracts}
                  className="block truncate text-sm text-white/80 hover:text-white"
                >
                  {contract.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );

    case "contract-renewals":
      return renewals.length === 0 ? (
        <EmptyLine message="No renewals due soon." />
      ) : (
        <ul className="space-y-1.5">
          {renewals.slice(0, 5).map((contract) => (
            <li key={contract.id}>
              <Link
                href={hrefs.corporateContracts}
                className="block rounded-lg border border-amber-400/20 bg-amber-500/5 px-2.5 py-2"
              >
                <span className="block truncate text-sm font-medium text-white">{contract.name}</span>
                <span className="mt-0.5 block text-[11px] text-white/45">
                  Expires {contract.expiryDate.slice(0, 10)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      );

    case "performance-reviews":
      return openReviews.length === 0 ? (
        <EmptyLine message="No reviews awaiting attention." />
      ) : (
        <ul className="space-y-1.5">
          {openReviews.slice(0, 5).map((review) => (
            <li key={review.id}>
              <Link
                href={hrefs.hrPerformance}
                className="block rounded-lg border border-white/10 px-2.5 py-2 text-sm text-white hover:bg-white/[0.04]"
              >
                <span className="font-medium">{review.employeeName}</span>
                <span className="mt-0.5 block text-[11px] text-white/45">{review.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      );

    case "approvals":
      return approvalItems.length === 0 ? (
        <EmptyLine message="No approvals waiting." />
      ) : (
        <ul className="space-y-1.5">
          {approvalItems.slice(0, 5).map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="block truncate text-sm text-white/85 hover:text-white">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      );

    case "tasks":
      return taskItems.length === 0 ? (
        <EmptyLine message="No open tasks." />
      ) : (
        <ul className="space-y-1.5">
          {taskItems.slice(0, 5).map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="block truncate text-sm text-white/85 hover:text-white">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      );

    case "calendar":
      return upcomingEvents.length === 0 ? (
        <EmptyLine
          message={data.loading.events ? "Loading calendar…" : "No upcoming events."}
        />
      ) : (
        <ul className="space-y-1.5">
          {upcomingEvents.map((event) => (
            <li key={event.id}>
              <Link
                href={hrefs.calendar}
                className="block rounded-lg border border-white/10 px-2.5 py-2 hover:bg-white/[0.04]"
              >
                <span className="block truncate text-sm font-medium text-white">{event.title}</span>
                <span className="mt-0.5 block text-[11px] text-white/45">
                  {new Date(event.startsAt).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      );

    case "recent-files":
      return fileEntries.length === 0 ? (
        <EmptyLine
          message={data.loading.files ? "Loading files…" : "No recent files yet."}
        />
      ) : (
        <ul className="space-y-1">
          {fileEntries.map((entry) =>
            entry.kind === "file" ? (
              <li key={entry.item.id}>
                <Link
                  href={hrefs.files}
                  className="flex items-center gap-2 truncate text-sm text-white/80 hover:text-white"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-white/40" />
                  {entry.item.name}
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      );

    case "pinned-files":
      return pinnedFiles.length === 0 ? (
        <EmptyLine message="No pinned files yet. Pin files from the file repository." />
      ) : (
        <ul className="space-y-1">
          {pinnedFiles.map((entry) =>
            entry.kind === "file" ? (
              <li key={entry.item.id}>
                <Link
                  href={hrefs.files}
                  className="flex items-center gap-2 truncate text-sm text-white/80 hover:text-white"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-300/60" />
                  {entry.item.name}
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      );

    case "recent-reports":
      return hrMock.reports.length === 0 ? (
        <EmptyLine message="No recent reports generated." />
      ) : (
        <ul className="space-y-1">
          {hrMock.reports.slice(0, 5).map((report) => (
            <li key={report.id}>
              <Link
                href={hrefs.financialReports}
                className="block truncate text-sm text-white/80 hover:text-white"
              >
                {report.name || report.id}
              </Link>
            </li>
          ))}
        </ul>
      );

    case "recent-crm-activity":
      return data.crmLeads.length === 0 ? (
        <EmptyLine
          message={data.loading.crmLeads ? "Loading CRM…" : "No CRM activity yet."}
        />
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {data.crmLeads.slice(0, 6).map((lead) => (
            <li key={lead.id}>
              <Link
                href={hrefs.crm}
                className="flex items-start justify-between gap-2 py-2 hover:bg-white/[0.03]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">
                    {lead.companyName}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-white/40">
                    {lead.status} · {lead.nextAction || "No next action"}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] text-white/35">{formatLeadWhen(lead)}</span>
              </Link>
            </li>
          ))}
        </ul>
      );

    case "engineering":
      return (
        <MetricCard
          label="Technology"
          value={liveProjects}
          href={hrefs.engineering}
          hint="Live delivery projects as technology estate proxy"
        />
      );

    case "quality":
      return (
        <MetricCard
          label="Quality"
          value={qmsOpen}
          href={hrefs.quality}
          hint={`${QMS_MODULES.length} QMS modules · open items`}
        />
      );

    case "training":
      return (
        <MetricCard
          label="Training"
          value={trainingDue}
          href={hrefs.training}
          hint="Courses in progress or due"
        />
      );

    case "inventory":
      return (
        <MetricCard
          label="Inventory"
          value={inventoryCount}
          href={hrefs.inventory}
          hint={
            inventoryCount === 0
              ? "No assets registered"
              : `${inventoryDown} needing attention`
          }
        />
      );

    case "system-health":
    case "platform-status":
    case "api-integrations":
    case "recent-logins":
    case "workspace-activity":
      if (!data.health) {
        return (
          <EmptyLine
            message={
              data.loading.health
                ? "Checking health…"
                : "No health probe data yet"
            }
          />
        );
      }
      return (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">
            {data.health.ready ? "Foundation ready" : "Foundation not ready"}
          </p>
          <p className="text-xs text-white/50">
            {data.health.error ||
              data.health.reason ||
              data.health.feature ||
              "Wave 0 foundation health"}
          </p>
          {type === "platform-status" ? (
            <p className="text-[11px] text-white/40">
              {MODULE_GO_LIVE_CATALOG.length} modules in go-live catalogue
            </p>
          ) : null}
          <Link
            href={type === "platform-status" ? hrefs.moduleGoLive : hrefs.unit311Details}
            className="inline-flex text-[11px] font-semibold uppercase tracking-[0.1em] text-sky-300/80 hover:text-sky-100"
          >
            Open details
          </Link>
        </div>
      );

    default:
      return <EmptyLine message="Tile not configured." />;
  }
}
