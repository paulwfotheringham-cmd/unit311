"use client";

import Link from "next/link";

import {
  internalViewTitles,
  type InternalOperationsView,
} from "@/lib/internal-operations-data";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

type DemoRow = {
  primary: string;
  secondary: string;
  badge?: string;
};

const DEMO_ROWS: Record<string, DemoRow[]> = {
  clients: [
    { primary: "Client account A", secondary: "Infrastructure · EU", badge: "Active" },
    { primary: "Client account B", secondary: "Energy · UK", badge: "Active" },
    { primary: "Client account C", secondary: "Logistics · Iberia", badge: "Onboarding" },
  ],
  crm: [
    { primary: "Qualified lead", secondary: "Survey scope review", badge: "Stage 3" },
    { primary: "Discovery call", secondary: "New market entry", badge: "Stage 2" },
    { primary: "Proposal sent", secondary: "Annual framework", badge: "Stage 4" },
  ],
  projects: [
    { primary: "Site mobilisation", secondary: "Field capture in progress", badge: "68%" },
    { primary: "Processing pipeline", secondary: "QA and deliverables", badge: "42%" },
    { primary: "Client handover", secondary: "Final review scheduled", badge: "91%" },
  ],
  financials: [
    { primary: "Recognised revenue", secondary: "Current quarter", badge: "Preview" },
    { primary: "Forecast pipeline", secondary: "Weighted opportunities", badge: "Preview" },
    { primary: "Operating margin", secondary: "Executive summary", badge: "Preview" },
  ],
  messaging: [
    { primary: "Operations channel", secondary: "3 participants · updated recently", badge: "Live" },
    { primary: "Project thread", secondary: "Shared files and updates", badge: "Pinned" },
    { primary: "Client liaison", secondary: "Restricted in demo", badge: "Locked" },
  ],
  "info-email": [
    { primary: "Shared inbox", secondary: "info@unit311central.com", badge: "Inbox" },
    { primary: "Client thread", secondary: "Delivery confirmation", badge: "Unread" },
    { primary: "Internal notice", secondary: "Weekly operations digest", badge: "Read" },
  ],
  default: [
    { primary: "Workspace module", secondary: "Summary metrics and records", badge: "Preview" },
    { primary: "Operational item", secondary: "Status and ownership", badge: "Active" },
    { primary: "Follow-up task", secondary: "Scheduled for this week", badge: "Open" },
  ],
};

const TABLE_VIEWS = new Set<InternalOperationsView>([
  "clients",
  "crm",
  "representatives",
  "office-locations",
  "projects",
  "grants",
  "hr",
  "assets",
  "debtors",
  "creditors",
  "expenses",
  "logistics",
  "users",
  "users-external",
  "competitors",
  "training",
  "support",
  "recent-missions",
  "files-internal",
  "files-external",
  "files-client",
]);

function DemoCta() {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-400/20 bg-sky-500/[0.06] px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-white/55">
        <Lock className="h-3.5 w-3.5 shrink-0 text-sky-300" />
        <span>Preview only — full records, integrations, and controls available after sign-in.</span>
      </div>
      <Link
        href="/login"
        className="shrink-0 rounded-lg border border-sky-400/35 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-100 transition-colors hover:bg-sky-500/25"
      >
        Sign in
      </Link>
    </div>
  );
}

function DemoStatCards() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {["Open items", "This week", "On track"].map((label) => (
        <div
          key={label}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 sm:px-4"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/40">{label}</p>
          <p className="mt-2 text-lg font-semibold text-white/80 blur-[3px] select-none">128</p>
        </div>
      ))}
    </div>
  );
}

function DemoChartPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</p>
      <div className="mt-4 flex h-28 items-end gap-2">
        {[42, 68, 55, 82, 61, 74].map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-md bg-gradient-to-t from-sky-500/25 to-sky-400/10"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function DemoTable({ rows }: { rows: DemoRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
            <th className="px-3 py-2 font-medium sm:px-4">Item</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell sm:px-4">Detail</th>
            <th className="px-3 py-2 font-medium sm:px-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.primary}-${index}`} className="border-b border-white/[0.05] last:border-0">
              <td className="px-3 py-2.5 text-[13px] text-white/80 sm:px-4">{row.primary}</td>
              <td className="hidden px-3 py-2.5 text-[13px] text-white/45 sm:table-cell sm:px-4">
                {row.secondary}
              </td>
              <td className="px-3 py-2.5 sm:px-4">
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/55">
                  {row.badge ?? "Preview"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HomeDemo() {
  return (
    <div className="space-y-4">
      <DemoStatCards />
      <div className="rounded-xl border border-rose-400/20 bg-gradient-to-br from-rose-500/[0.08] to-transparent p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300/90">
          Action required
        </p>
        <ul className="mt-3 space-y-2">
          {[
            "Proposal awaiting approval",
            "Mission requires pilot assignment",
            "Client deliverable follow-up",
          ].map((task) => (
            <li
              key={task}
              className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/15 px-3 py-2 text-[13px] text-white/75"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400/90" />
              {task}
            </li>
          ))}
        </ul>
      </div>
      <DemoChartPlaceholder label="Executive overview" />
    </div>
  );
}

function MessagingDemo() {
  return (
    <div className="space-y-3">
      <DemoTable rows={DEMO_ROWS.messaging} />
      <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
        <div className="max-w-[75%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-3 py-2 text-[13px] text-white/70">
          Field team confirmed mobilisation window.
        </div>
        <div className="ml-auto mt-2 max-w-[75%] rounded-2xl rounded-br-md border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-right text-[13px] text-white/75">
          Copy received — processing queue updated.
        </div>
      </div>
    </div>
  );
}

function CalendarDemo() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, index) => (
        <div
          key={day}
          className="rounded-xl border border-violet-400/20 bg-violet-500/[0.06] p-3"
        >
          <p className="text-xs font-semibold text-white/80">{day}</p>
          <p className="mt-2 text-[11px] text-white/45">
            {index % 2 === 0 ? "Client call" : "Site visit"}
          </p>
        </div>
      ))}
    </div>
  );
}

function SettingsDemo() {
  const rows = ["Sidebar modules", "Notification rules", "External integrations", "Social accounts"];
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row}
          className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"
        >
          <span className="text-sm text-white/75">{row}</span>
          <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] text-white/35">Configured</span>
        </div>
      ))}
    </div>
  );
}

function StrategyDemo() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {["Capability matrix", "Priority notes", "Market focus"].map((column) => (
        <div key={column} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{column}</p>
          <div className="mt-3 space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-8 rounded-lg border border-white/[0.06] bg-black/15" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function getDemoRows(view: InternalOperationsView): DemoRow[] {
  return DEMO_ROWS[view] ?? DEMO_ROWS.default;
}

function DemoBody({ view }: { view: InternalOperationsView }) {
  if (view === "home") return <HomeDemo />;
  if (view === "messaging" || view === "communications") return <MessagingDemo />;
  if (view === "calendar") return <CalendarDemo />;
  if (view === "settings" || view === "billing") return <SettingsDemo />;
  if (view === "strategy" || view === "whiteboard" || view === "sector" || view === "competitors") {
    return <StrategyDemo />;
  }
  if (
    view === "financials" ||
    view === "debtors" ||
    view === "creditors" ||
    view === "expenses"
  ) {
    return (
      <div className="space-y-4">
        <DemoChartPlaceholder label="Financial summary" />
        <DemoTable rows={getDemoRows(view)} />
      </div>
    );
  }
  if (TABLE_VIEWS.has(view) || view === "info-email") {
    return <DemoTable rows={getDemoRows(view)} />;
  }

  return (
    <div className="space-y-4">
      <DemoStatCards />
      <DemoTable rows={DEMO_ROWS.default} />
    </div>
  );
}

export default function WorkspaceDemoPanel({
  view,
  compact = false,
}: {
  view: InternalOperationsView;
  compact?: boolean;
}) {
  const meta = internalViewTitles[view];

  return (
    <div className="min-w-0">
      <div
        className={cn(
          "border-b border-white/10",
          compact ? "px-3 py-2.5" : "px-4 py-4 sm:px-6",
        )}
      >
        <p
          className={cn(
            "font-semibold uppercase tracking-[0.18em] text-[#60a5fa]",
            compact ? "text-[8px]" : "text-[10px]",
          )}
        >
          {meta.subtitle}
        </p>
        <h3
          className={cn(
            "mt-1 font-semibold tracking-tight text-white",
            compact ? "text-sm" : "text-lg sm:text-xl",
          )}
        >
          {meta.title}
        </h3>
        {!compact ? (
          <p className="mt-1 text-xs text-white/45">
            Interactive preview — explore modules from the sidebar without leaving this page.
          </p>
        ) : null}
      </div>

      <div className={cn("overflow-x-auto", compact ? "p-2" : "p-3 sm:p-4")}>
        <DemoBody view={view} />
        {!compact ? <DemoCta /> : null}
      </div>
    </div>
  );
}
