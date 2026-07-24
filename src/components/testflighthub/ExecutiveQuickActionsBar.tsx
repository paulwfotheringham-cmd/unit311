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
  view?: "clients" | "projects" | "board-pack" | "executive-assistant";
  icon?: "mail" | "upload" | "plus" | "file" | "users";
  badge?: string | number;
};

export const EXECUTIVE_HOME_QUICK_ACTIONS: readonly ExecutiveQuickAction[] = [
  { id: "create-client", label: "Create Client", action: "create-client", view: "clients", icon: "users" },
  { id: "create-project", label: "Create Project", action: "create-project", view: "projects", icon: "plus" },
  {
    id: "board-report",
    label: "Generate Board Report",
    action: "generate-board-report",
    view: "board-pack",
    icon: "file",
  },
  {
    id: "executive-assistant",
    label: "Executive Assistant",
    action: "open-executive-assistant",
    view: "executive-assistant",
    icon: "mail",
  },
  { id: "export-dashboard", label: "Export Dashboard", action: "export-dashboard", icon: "upload" },
] as const;

const ICON_MAP: Record<NonNullable<ExecutiveQuickAction["icon"]>, LucideIcon> = {
  mail: Mail,
  upload: Upload,
  plus: Plus,
  file: FileText,
  users: Users,
};

type ExecutiveQuickActionsBarProps = {
  actions?: readonly ExecutiveQuickAction[];
  onAction?: (action: ExecutiveQuickAction) => void;
  /** Compact controls for the application page header. */
  variant?: "header";
};

/**
 * Page-level Quick Actions for Executive Home — lives in the shell header.
 */
export default function ExecutiveQuickActionsBar({
  actions = EXECUTIVE_HOME_QUICK_ACTIONS,
  onAction,
  variant = "header",
}: ExecutiveQuickActionsBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        variant === "header" && "max-w-full flex-wrap justify-center sm:flex-nowrap sm:overflow-x-auto",
      )}
      role="toolbar"
      aria-label="Quick actions"
    >
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
            onClick={() => onAction?.(item)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5",
              "border-white/[0.1] bg-white/[0.03] text-[11px] font-medium text-white/85",
              "transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-white/50" strokeWidth={1.6} />
            <span className="whitespace-nowrap">{item.label}</span>
            {badge ? (
              <span
                className="ml-0.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums leading-none"
                style={{
                  height: "1.125rem",
                  background: "color-mix(in srgb, var(--platform-accent, #2F80ED) 22%, transparent)",
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
  );
}
