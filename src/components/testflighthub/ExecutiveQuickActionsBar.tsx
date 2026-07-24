"use client";

import {
  FileText,
  Mail,
  Plus,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type ExecutiveQuickAction = {
  id: string;
  label: string;
  action: string;
  icon?: "mail" | "upload" | "plus" | "file" | "users";
  /** Optional count badge — e.g. Approvals (3). Layout-safe when undefined. */
  badge?: string | number;
};

const ICON_MAP: Record<NonNullable<ExecutiveQuickAction["icon"]>, LucideIcon> = {
  mail: Mail,
  upload: Upload,
  plus: Plus,
  file: FileText,
  users: Users,
};

type ExecutiveQuickActionsBarProps = {
  actions: readonly ExecutiveQuickAction[];
  onAction?: (action: string) => void;
};

/**
 * Contextual toolbar for the Executive Home Dashboard.
 * Lives in document flow after the AI summary; becomes sticky only after
 * that section scrolls away — not a second application header.
 */
export default function ExecutiveQuickActionsBar({
  actions,
  onAction,
}: ExecutiveQuickActionsBarProps) {
  return (
    <section className="sticky top-2 z-20 py-0">
      <div
        className="rounded-[12px] border px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
        style={{
          borderColor: "var(--platform-card-border, #243347)",
          background: "var(--platform-card, #121C2D)",
        }}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="shrink-0 text-[11px] font-semibold tracking-wide text-white/45 uppercase">
            Quick Actions
          </p>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {actions.map((item) => {
              const Icon = item.icon ? ICON_MAP[item.icon] : Plus;
              const badge =
                item.badge === undefined || item.badge === null || item.badge === ""
                  ? null
                  : String(item.badge);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAction?.(item.action)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5",
                    "border-white/[0.08] bg-white/[0.02] text-[12px] font-medium text-white/85",
                    "transition-colors hover:border-white/15 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-white/50" strokeWidth={1.6} />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {badge ? (
                    <span
                      className="ml-0.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums leading-none"
                      style={{
                        height: "1.125rem",
                        background:
                          "color-mix(in srgb, var(--platform-accent, #2F80ED) 22%, transparent)",
                        color: "var(--platform-accent, #93c5fd)",
                      }}
                    >
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
