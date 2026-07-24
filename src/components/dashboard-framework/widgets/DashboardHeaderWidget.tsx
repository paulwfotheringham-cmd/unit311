"use client";

import type { DashboardHeaderWidget } from "@/lib/dashboard-framework";

export default function DashboardHeaderWidgetView({ widget }: { widget: DashboardHeaderWidget }) {
  return (
    <header className="min-w-0">
      {widget.eyebrow ? (
        <p
          className="text-[11px] font-semibold tracking-[0.14em] uppercase"
          style={{ color: "var(--platform-accent, #60a5fa)" }}
        >
          {widget.eyebrow}
        </p>
      ) : null}
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {widget.workspaceName}
      </h2>
      {widget.description ? (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">{widget.description}</p>
      ) : null}
    </header>
  );
}
