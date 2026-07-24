"use client";

import type { DashboardAlertsWidget } from "@/lib/dashboard-framework";
import { cn } from "@/lib/utils";
import { WidgetTitle, widgetShellClass } from "./widget-shell";

function severityClass(severity: "info" | "warning" | "critical") {
  switch (severity) {
    case "critical":
      return "border-rose-400/25 bg-rose-500/10";
    case "warning":
      return "border-amber-400/25 bg-amber-500/10";
    default:
      return "border-sky-400/20 bg-sky-500/10";
  }
}

function severityLabel(severity: "info" | "warning" | "critical") {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    default:
      return "Info";
  }
}

export default function AlertWidget({ widget }: { widget: DashboardAlertsWidget }) {
  return (
    <section className={widgetShellClass()}>
      <WidgetTitle title={widget.title ?? "Alerts"} meta={`${widget.items.length}`} />
      {widget.items.length === 0 ? (
        <p className="text-[13px] text-white/45">No alerts requiring attention.</p>
      ) : (
        <ul className="space-y-2">
          {widget.items.map((item) => (
            <li
              key={item.id}
              className={cn("rounded-lg border px-3 py-2", severityClass(item.severity))}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-medium text-white/90">{item.title}</p>
                <span className="shrink-0 text-[10px] font-medium text-white/50">
                  {severityLabel(item.severity)}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-white/50">{item.detail}</p>
              {item.timeLabel ? (
                <p className="mt-1 text-[11px] text-white/35">{item.timeLabel}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
