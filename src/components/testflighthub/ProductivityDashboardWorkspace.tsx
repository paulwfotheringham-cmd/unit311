"use client";

import type { ComponentType } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileUp,
  FolderOpen,
  LifeBuoy,
  Mail,
  MessageSquare,
  Share2,
  Sparkles,
  Ticket,
  Upload,
  Video,
} from "lucide-react";

import { cn } from "@/lib/utils";

/** Placeholder operational snapshot — replace with live module feeds later. */
const SUMMARY = {
  attention: 7,
  changed: 14,
  nextUp: "Leadership sync · 10:30",
  headline:
    "Morning brief: 12 unread emails, 3 meetings remaining, 2 support tickets waiting on reply, and 1 file approval pending.",
};

const EMAILS = [
  { from: "Sarah Chen", subject: "Q3 board pack draft for review", time: "08:14", unread: true },
  { from: "Ops Desk", subject: "Site access confirmation — Aberdeen", time: "07:52", unread: true },
  { from: "Finance", subject: "Expense batch EA-284 approved", time: "Yesterday", unread: false },
];

const TODAY_SCHEDULE = [
  { time: "09:00", title: "Stand-up — Delivery", meta: "Teams · 15 min" },
  { time: "10:30", title: "Leadership sync", meta: "Boardroom · 45 min" },
  { time: "14:00", title: "Client demo — Meridian Energy", meta: "Video · 60 min" },
  { time: "16:30", title: "Support triage", meta: "Ops · 30 min" },
];

const MESSAGES = [
  { channel: "#delivery", text: "Flight window confirmed for Thursday.", time: "12m" },
  { channel: "#finance", text: "Invoice pack ready for sign-off.", time: "41m" },
  { channel: "Paul F.", text: "Can you join the 10:30 briefly?", time: "1h" },
];

const FILES = [
  { name: "Meridian_SOW_v3.pdf", action: "Uploaded", by: "A. Patel", time: "1h ago" },
  { name: "Ops_Roster_Jul.xlsx", action: "Edited", by: "You", time: "3h ago" },
  { name: "Board_Pack_Draft.pptx", action: "Shared", by: "S. Chen", time: "Yesterday" },
];

const SUPPORT = {
  open: 8,
  waiting: 2,
  resolvedToday: 5,
  critical: 1,
  items: [
    { id: "TK-1042", title: "Portal login failure — external user", status: "Critical" },
    { id: "TK-1038", title: "WhatsApp webhook delay", status: "Waiting" },
    { id: "TK-1031", title: "Calendar invite not syncing", status: "Open" },
  ],
};

const SOCIAL = [
  { network: "LinkedIn", text: "Campaign post scheduled for 11:00.", time: "Today" },
  { network: "X", text: "2 mentions require review.", time: "Today" },
  { network: "LinkedIn", text: "Engagement +18% vs last week.", time: "Yesterday" },
];

const APPROVALS = [
  { title: "External file share — Client Explorer", meta: "Requested by A. Patel", due: "Due today" },
  { title: "Support escalation — TK-1042", meta: "Ops Desk", due: "Due today" },
  { title: "Meeting room booking override", meta: "Facilities", due: "Tomorrow" },
];

const QUICK_ACTIONS = [
  { label: "Compose Email", icon: Mail },
  { label: "New Meeting", icon: CalendarDays },
  { label: "Upload File", icon: Upload },
  { label: "Start Video Call", icon: Video },
  { label: "Create Ticket", icon: Ticket },
] as const;

function cardClass() {
  return cn(
    "rounded-[12px] border p-4",
    "border-[color:var(--platform-card-border,#243347)] bg-[color:var(--platform-card,#121C2D)]",
  );
}

function WidgetHeader({
  icon: Icon,
  title,
  meta,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  meta?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-white/45" strokeWidth={1.6} />
        <h3 className="truncate text-[12px] font-semibold tracking-wide text-white/80 uppercase">
          {title}
        </h3>
      </div>
      {meta ? <span className="shrink-0 text-[11px] text-white/40">{meta}</span> : null}
    </div>
  );
}

export default function ProductivityDashboardWorkspace() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-4">
      {/* Top summary — what is happening today */}
      <section
        className={cn(cardClass(), "relative overflow-hidden p-5 sm:p-6")}
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--platform-accent, #2F80ED) 14%, var(--platform-card, #121C2D)), var(--platform-card, #121C2D))",
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="flex items-center gap-2">
              <Sparkles
                className="h-4 w-4"
                style={{ color: "var(--platform-accent, #2F80ED)" }}
                strokeWidth={1.6}
              />
              <p className="text-[11px] font-semibold tracking-[0.14em] text-white/50 uppercase">
                AI Daily Summary
              </p>
            </div>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
              What is happening today
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{SUMMARY.headline}</p>
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-white/45">
              <Clock3 className="h-3.5 w-3.5" strokeWidth={1.6} />
              Next up: {SUMMARY.nextUp}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[17rem]">
            {[
              { label: "Needs attention", value: SUMMARY.attention },
              { label: "Changed today", value: SUMMARY.changed },
              { label: "Meetings left", value: 3 },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-[10px] border border-white/10 bg-black/20 px-3 py-2.5 text-center"
              >
                <p className="text-xl font-semibold tabular-nums text-white">{kpi.value}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-white/45">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Widget grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <section className={cardClass()}>
          <WidgetHeader icon={Mail} title="Unread Email" meta="12 unread" />
          <ul className="space-y-2.5">
            {EMAILS.map((row) => (
              <li key={row.subject} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn("truncate text-[13px]", row.unread ? "font-medium text-white" : "text-white/70")}>
                    {row.from}
                  </p>
                  <span className="shrink-0 text-[11px] text-white/35">{row.time}</span>
                </div>
                <p className="truncate text-[12px] text-white/45">{row.subject}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass()}>
          <WidgetHeader icon={CalendarDays} title="Today's Calendar" meta="4 events" />
          <ul className="space-y-2">
            {TODAY_SCHEDULE.map((row) => (
              <li key={row.title} className="flex gap-3">
                <span className="w-11 shrink-0 text-[12px] tabular-nums text-white/45">{row.time}</span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-white/90">{row.title}</p>
                  <p className="truncate text-[11px] text-white/40">{row.meta}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass()}>
          <WidgetHeader icon={Video} title="Upcoming Meetings" meta="Next 24h" />
          <ul className="space-y-2.5">
            {TODAY_SCHEDULE.filter((_, i) => i >= 1).map((row) => (
              <li key={`meet-${row.title}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <p className="text-[13px] text-white/90">{row.title}</p>
                <p className="mt-0.5 text-[11px] text-white/40">
                  {row.time} · {row.meta}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass()}>
          <WidgetHeader icon={MessageSquare} title="Recent Messages" meta="3 new" />
          <ul className="space-y-2.5">
            {MESSAGES.map((row) => (
              <li key={row.channel + row.text} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[13px] font-medium text-white/85">{row.channel}</p>
                  <span className="shrink-0 text-[11px] text-white/35">{row.time}</span>
                </div>
                <p className="truncate text-[12px] text-white/45">{row.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass()}>
          <WidgetHeader icon={FolderOpen} title="Recent File Activity" />
          <ul className="space-y-2.5">
            {FILES.map((row) => (
              <li key={row.name} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[13px] text-white/90">{row.name}</p>
                  <span className="shrink-0 text-[11px] text-white/35">{row.time}</span>
                </div>
                <p className="truncate text-[12px] text-white/40">
                  {row.action} · {row.by}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass()}>
          <WidgetHeader icon={LifeBuoy} title="Support Desk Summary" />
          <div className="mb-3 grid grid-cols-4 gap-1.5">
            {[
              { label: "Open", value: SUPPORT.open },
              { label: "Waiting", value: SUPPORT.waiting },
              { label: "Resolved", value: SUPPORT.resolvedToday },
              { label: "Critical", value: SUPPORT.critical },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-md bg-white/[0.03] px-1.5 py-1.5 text-center">
                <p className="text-sm font-semibold tabular-nums text-white">{kpi.value}</p>
                <p className="text-[9px] text-white/40">{kpi.label}</p>
              </div>
            ))}
          </div>
          <ul className="space-y-2">
            {SUPPORT.items.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] text-white/85">{row.title}</p>
                  <p className="text-[11px] text-white/35">{row.id}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                    row.status === "Critical"
                      ? "bg-rose-500/15 text-rose-200"
                      : row.status === "Waiting"
                        ? "bg-amber-500/15 text-amber-200"
                        : "bg-white/10 text-white/60",
                  )}
                >
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass()}>
          <WidgetHeader icon={Share2} title="Recent Social Activity" />
          <ul className="space-y-2.5">
            {SOCIAL.map((row) => (
              <li key={row.network + row.text} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-medium text-white/85">{row.network}</p>
                  <span className="shrink-0 text-[11px] text-white/35">{row.time}</span>
                </div>
                <p className="truncate text-[12px] text-white/45">{row.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass()}>
          <WidgetHeader icon={CheckCircle2} title="Pending Approvals" meta={`${APPROVALS.length} open`} />
          <ul className="space-y-2.5">
            {APPROVALS.map((row) => (
              <li key={row.title} className="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <p className="truncate text-[13px] text-white/90">{row.title}</p>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] text-white/40">{row.meta}</p>
                  <span className="shrink-0 text-[11px] text-amber-200/80">{row.due}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={cardClass()}>
          <WidgetHeader icon={FileUp} title="Quick Actions" />
          <div className="flex flex-col gap-1.5">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  className="flex h-9 w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-left text-[12px] font-medium text-white/85 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-white/50" strokeWidth={1.6} />
                  {action.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
