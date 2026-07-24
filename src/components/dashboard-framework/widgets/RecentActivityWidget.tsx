"use client";

import type { DashboardRecentActivityWidget } from "@/lib/dashboard-framework";
import { WidgetTitle, widgetShellClass } from "./widget-shell";

export default function RecentActivityWidget({
  widget,
}: {
  widget: DashboardRecentActivityWidget;
}) {
  return (
    <section className={widgetShellClass()}>
      <WidgetTitle title={widget.title ?? "Recent Activity"} />
      {widget.items.length === 0 ? (
        <p className="text-[13px] text-white/45">No recent activity.</p>
      ) : (
        <ul className="space-y-2.5">
          {widget.items.map((item) => (
            <li key={item.id} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[13px] text-white/90">{item.title}</p>
                <span className="shrink-0 text-[11px] text-white/35">{item.timeLabel}</span>
              </div>
              <p className="truncate text-[12px] text-white/45">
                {item.category ? `${item.category} · ` : ""}
                {item.meta}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
