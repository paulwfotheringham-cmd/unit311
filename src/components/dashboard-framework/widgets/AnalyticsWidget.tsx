"use client";

import type { DashboardAnalyticsWidget } from "@/lib/dashboard-framework";
import { WidgetTitle, widgetShellClass } from "./widget-shell";

const SERIES_COLORS = ["var(--platform-accent, #2F80ED)", "#34d399", "#fbbf24", "#a78bfa"];

export default function AnalyticsWidget({ widget }: { widget: DashboardAnalyticsWidget }) {
  const max = Math.max(1, ...widget.series.flatMap((s) => s.values));

  return (
    <section className={widgetShellClass()}>
      <WidgetTitle title={widget.title ?? "Analytics"} meta={widget.caption} />
      <div className="space-y-4">
        {widget.series.map((series, seriesIndex) => (
          <div key={series.id}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[12px] text-white/70">{series.label}</p>
              <p className="text-[11px] tabular-nums text-white/40">
                {series.values[series.values.length - 1] ?? 0}
              </p>
            </div>
            <div className="flex h-16 items-end gap-1">
              {series.values.map((value, index) => (
                <div
                  key={`${series.id}-${index}`}
                  className="min-w-0 flex-1 rounded-t-sm opacity-90"
                  style={{
                    height: `${Math.max(8, (value / max) * 100)}%`,
                    background: SERIES_COLORS[seriesIndex % SERIES_COLORS.length],
                  }}
                  title={`${series.label}: ${value}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
