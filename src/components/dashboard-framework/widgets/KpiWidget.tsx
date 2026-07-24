"use client";

import type { DashboardKpiItem, DashboardKpiRowWidget, DashboardKpiTone } from "@/lib/dashboard-framework";
import { cn } from "@/lib/utils";
import { widgetShellClass } from "./widget-shell";

function toneClass(tone: DashboardKpiTone | undefined) {
  switch (tone) {
    case "positive":
      return "text-emerald-300";
    case "warning":
      return "text-amber-200";
    case "critical":
      return "text-rose-300";
    default:
      return "text-white/45";
  }
}

export function KpiWidget({ kpi }: { kpi: DashboardKpiItem }) {
  return (
    <div className={widgetShellClass("px-3 py-3.5")}>
      <p className="text-[11px] font-medium text-white/45">{kpi.label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-white">{kpi.value}</p>
      {kpi.delta ? (
        <p className={cn("mt-1 text-[11px]", toneClass(kpi.tone))}>{kpi.delta}</p>
      ) : kpi.hint ? (
        <p className="mt-1 text-[11px] text-white/35">{kpi.hint}</p>
      ) : null}
    </div>
  );
}

export default function KpiRowWidget({ widget }: { widget: DashboardKpiRowWidget }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {widget.kpis.map((kpi) => (
        <KpiWidget key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}
