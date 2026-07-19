"use client";

import { useState } from "react";

import WorkspaceDemoPanel from "@/components/home/WorkspaceDemoPanel";
import {
  type InternalNavChildItem,
  type InternalNavItem,
  type InternalNavSection,
  type InternalOperationsView,
} from "@/lib/internal-operations-data";
import { cn } from "@/lib/utils";
import {
  Binoculars,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Compass,
  ContactRound,
  FolderKanban,
  FolderOpen,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MessageSquare,
  Package,
  PenLine,
  Settings,
  Share2,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  ContactRound,
  FolderKanban,
  Wallet,
  Briefcase,
  Package,
  FolderOpen,
  CalendarDays,
  Truck,
  Mail,
  MessageSquare,
  Share2,
  LifeBuoy,
  Compass,
  Binoculars,
  PenLine,
  Landmark,
  GraduationCap,
  Users,
  Settings,
};

const DEMO_NAV_SECTIONS: InternalNavSection[] = [
  {
    label: null,
    items: [{ label: "Home", icon: "LayoutDashboard", view: "home" }],
  },
  {
    label: "Business Central",
    items: [
      { label: "Clients", icon: "Building2", view: "clients" },
      { label: "CRM", icon: "ContactRound", view: "crm" },
      { label: "Projects", icon: "FolderKanban", view: "projects" },
      { label: "Grants", icon: "Landmark", view: "grants" },
      {
        label: "Financials",
        icon: "Wallet",
        children: [
          { label: "Overview", view: "financials" },
          { label: "Expenses", view: "expenses" },
        ],
      },
      { label: "HR", icon: "Briefcase", view: "hr" },
    ],
  },
  {
    label: "Inventory Management",
    items: [{ label: "Assets", icon: "Package", view: "assets" }],
  },
  {
    label: "Business Productivity",
    items: [
      { label: "Files", icon: "FolderOpen", view: "files-internal" },
      { label: "Calendar", icon: "CalendarDays", view: "calendar" },
      { label: "Logistics", icon: "Truck", view: "logistics" },
      { label: "Email", icon: "Mail", view: "info-email" },
      { label: "Messaging", icon: "MessageSquare", view: "messaging" },
      { label: "Social", icon: "Share2", view: "social" },
      { label: "Support", icon: "LifeBuoy", view: "support" },
    ],
  },
  {
    label: "Strategy",
    items: [
      { label: "Strategy", icon: "Compass", view: "strategy" },
      { label: "Competitors", icon: "Binoculars", view: "competitors" },
      { label: "Whiteboard", icon: "PenLine", view: "whiteboard" },
    ],
  },
  {
    label: "Training",
    items: [{ label: "Training", icon: "GraduationCap", view: "training" }],
  },
  {
    label: "Tools",
    items: [{ label: "Users", icon: "Users", view: "users" }],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Settings",
        icon: "Settings",
        children: [
          { label: "General", view: "settings" },
          { label: "Billing", view: "billing" },
        ],
      },
    ],
  },
];

function NavIcon({ name }: { name: string }) {
  const Icon = iconMap[name] ?? LayoutDashboard;
  return <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />;
}

function SidebarParentButton({
  label,
  icon,
  expanded,
  compact = false,
  onToggle,
}: {
  label: string;
  icon: string;
  expanded: boolean;
  compact?: boolean;
  onToggle: () => void;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        compact ? "text-[10px]" : "text-[11px]",
        "text-white/55 hover:bg-white/[0.04] hover:text-white/80",
      )}
    >
      <NavIcon name={icon} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Chevron className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
    </button>
  );
}

function SidebarButton({
  label,
  icon,
  active,
  indented = false,
  compact = false,
  onClick,
}: {
  label: string;
  icon?: string;
  active: boolean;
  indented?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        compact ? "text-[10px]" : "text-[11px]",
        indented ? (compact ? "pl-4" : "pl-6") : "",
        active
          ? "bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/20"
          : "text-white/55 hover:bg-white/[0.04] hover:text-white/80",
      )}
    >
      {icon ? (
        <NavIcon name={icon} />
      ) : (
        <ChevronRight className="h-3 w-3 shrink-0 opacity-40" aria-hidden />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}

function resolveDemoView(
  item: InternalNavItem | InternalNavChildItem,
  fallback: InternalOperationsView,
): InternalOperationsView {
  if ("view" in item && item.view) return item.view;
  return fallback;
}

export default function Unit311WorkspacePreview({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [activeView, setActiveView] = useState<InternalOperationsView>("home");
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  function toggleParent(label: string) {
    setExpandedParents((current) => ({ ...current, [label]: !current[label] }));
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-[#07111f] shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b border-white/10 bg-[#0a1628]",
          compact ? "px-3 py-2" : "px-4 py-3",
        )}
      >
        <span className={cn("rounded-full bg-[#ff5f57]", compact ? "h-2 w-2" : "h-2.5 w-2.5")} />
        <span className={cn("rounded-full bg-[#febc2e]", compact ? "h-2 w-2" : "h-2.5 w-2.5")} />
        <span className={cn("rounded-full bg-[#28c840]", compact ? "h-2 w-2" : "h-2.5 w-2.5")} />
        <p className={cn("ml-2 text-white/45", compact ? "text-[9px]" : "text-[11px]")}>
          internal.unit311central.com
        </p>
      </div>

      <div
        className={cn(
          "flex flex-col lg:flex-row",
          compact ? "min-h-[400px] lg:min-h-[450px]" : "min-h-[640px] lg:min-h-[720px]",
        )}
      >
        <aside
          className={cn(
            "w-full shrink-0 border-b border-white/10 bg-[#0a0f18]/95 lg:border-b-0 lg:border-r",
            compact ? "lg:w-[206px]" : "lg:w-[220px]",
          )}
        >
          <div className="border-b border-white/10 px-3 py-3">
            <div className="rounded-lg bg-white px-2.5 py-1.5">
              <span className="text-[13px] font-bold tracking-[-0.02em] text-[#1a2b4a]">
                Unit<span className="text-[#2563eb]">311</span>
              </span>
            </div>
          </div>

          <nav
            className={cn(
              "overflow-y-auto px-2 py-3 lg:py-4",
              compact ? "max-h-[175px] lg:max-h-none" : "max-h-[280px] lg:max-h-none",
            )}
            aria-label="Workspace demo navigation"
          >
            {DEMO_NAV_SECTIONS.map((section) => (
              <div key={section.label ?? "home"} className="mb-3 last:mb-0">
                {section.label ? (
                  <p className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-sky-400/80">
                    {section.label}
                  </p>
                ) : null}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const hasChildren = Boolean(item.children?.length);
                    const isExpanded = expandedParents[item.label] ?? false;

                    return (
                    <div key={item.label}>
                      {hasChildren ? (
                        <SidebarParentButton
                          label={item.label}
                          icon={item.icon}
                          expanded={isExpanded}
                          compact={compact}
                          onToggle={() => toggleParent(item.label)}
                        />
                      ) : item.view ? (
                        <SidebarButton
                          label={item.label}
                          icon={item.icon}
                          active={activeView === item.view}
                          compact={compact}
                          onClick={() => setActiveView(item.view!)}
                        />
                      ) : (
                        <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-white/45">
                          <NavIcon name={item.icon} />
                          <span className="truncate">{item.label}</span>
                        </div>
                      )}
                      {hasChildren && isExpanded
                        ? item.children?.map((child) => {
                            const childView = resolveDemoView(child, "support");
                            return (
                              <SidebarButton
                                key={child.label}
                                label={child.label}
                                active={activeView === childView}
                                indented
                                compact={compact}
                                onClick={() => {
                                  setActiveView(childView);
                                  setExpandedParents((current) => ({ ...current, [item.label]: true }));
                                }}
                              />
                            );
                          })
                        : null}
                    </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 bg-[#020617]/80">
          <WorkspaceDemoPanel view={activeView} compact={compact} />
        </div>
      </div>
    </div>
  );
}
