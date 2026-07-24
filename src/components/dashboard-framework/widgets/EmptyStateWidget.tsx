"use client";

import { Inbox } from "lucide-react";

import type { DashboardEmptyWidget } from "@/lib/dashboard-framework";
import { widgetShellClass } from "./widget-shell";

export default function EmptyStateWidget({
  widget,
  message,
}: {
  widget?: DashboardEmptyWidget;
  message?: string;
}) {
  return (
    <section className={widgetShellClass("flex flex-col items-center justify-center py-10 text-center")}>
      <Inbox className="h-8 w-8 text-white/25" strokeWidth={1.4} />
      <p className="mt-3 text-[13px] text-white/50">
        {widget?.message ?? message ?? "Nothing to show in this widget yet."}
      </p>
    </section>
  );
}
