"use client";

import { Clock3, Sparkles } from "lucide-react";

import type { DashboardAiSummaryWidget } from "@/lib/dashboard-framework";
import { widgetShellClass } from "./widget-shell";

export default function AiSummaryWidget({ widget }: { widget: DashboardAiSummaryWidget }) {
  return (
    <section
      className={widgetShellClass("relative overflow-hidden p-5 sm:p-6")}
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
              {widget.title ?? "AI Workspace Summary"}
            </p>
          </div>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
            {widget.headline}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/65">{widget.summary}</p>
          {widget.nextUp ? (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-white/45">
              <Clock3 className="h-3.5 w-3.5" strokeWidth={1.6} />
              Next up: {widget.nextUp}
            </p>
          ) : null}
        </div>
        {widget.metrics?.length ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[17rem]">
            {widget.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[10px] border border-white/10 bg-black/20 px-3 py-2.5 text-center"
              >
                <p className="text-xl font-semibold tabular-nums text-white">{metric.value}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-white/45">{metric.label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
