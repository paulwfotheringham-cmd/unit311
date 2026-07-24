"use client";

import type { DashboardWorkQueueWidget } from "@/lib/dashboard-framework";
import { cn } from "@/lib/utils";
import { WidgetTitle, widgetShellClass } from "./widget-shell";

export default function WorkQueueWidget({ widget }: { widget: DashboardWorkQueueWidget }) {
  return (
    <section className={widgetShellClass()}>
      <WidgetTitle title={widget.title ?? "Work Queue"} meta={`${widget.items.length} items`} />
      {widget.items.length === 0 ? (
        <p className="text-[13px] text-white/45">Queue is clear.</p>
      ) : (
        <ul className="space-y-2">
          {widget.items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] text-white/90">{item.title}</p>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                    item.priority === "high"
                      ? "bg-rose-500/15 text-rose-200"
                      : item.priority === "medium"
                        ? "bg-amber-500/15 text-amber-200"
                        : "bg-white/10 text-white/55",
                  )}
                >
                  {item.status}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <p className="truncate text-[11px] text-white/40">{item.meta}</p>
                {item.dueLabel ? (
                  <span className="shrink-0 text-[11px] text-white/35">{item.dueLabel}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
