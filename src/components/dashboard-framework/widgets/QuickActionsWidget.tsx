"use client";

import {
  CalendarDays,
  FileText,
  Mail,
  Plus,
  Ticket,
  Upload,
  Users,
  Video,
} from "lucide-react";

import type { DashboardActionHandler, DashboardQuickActionsWidget } from "@/lib/dashboard-framework";
import { WidgetTitle, widgetShellClass } from "./widget-shell";

const ICON_MAP = {
  mail: Mail,
  calendar: CalendarDays,
  upload: Upload,
  video: Video,
  ticket: Ticket,
  plus: Plus,
  file: FileText,
  users: Users,
} as const;

export default function QuickActionsWidget({
  widget,
  onAction,
}: {
  widget: DashboardQuickActionsWidget;
  onAction?: DashboardActionHandler;
}) {
  return (
    <section className={widgetShellClass()}>
      <WidgetTitle title={widget.title ?? "Quick Actions"} />
      <div className="flex flex-wrap gap-1.5">
        {widget.actions.map((action) => {
          const Icon = action.icon ? ICON_MAP[action.icon] : Plus;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onAction?.(action.action, widget.id)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-[12px] font-medium text-white/85 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-white/50" strokeWidth={1.6} />
              {action.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
