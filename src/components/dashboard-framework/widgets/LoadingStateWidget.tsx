"use client";

import type { DashboardLoadingWidget } from "@/lib/dashboard-framework";
import { widgetShellClass } from "./widget-shell";

export default function LoadingStateWidget({
  widget,
  label = "Loading dashboard",
}: {
  widget?: DashboardLoadingWidget;
  label?: string;
}) {
  return (
    <section className={widgetShellClass("animate-pulse space-y-3")} aria-busy aria-label={label}>
      <div className="h-3 w-28 rounded bg-white/10" />
      <div className="h-16 rounded-lg bg-white/[0.06]" />
      <div className="h-3 w-2/3 rounded bg-white/10" />
      {widget?.title ? <span className="sr-only">{widget.title}</span> : null}
    </section>
  );
}
