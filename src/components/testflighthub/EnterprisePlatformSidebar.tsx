"use client";

import { startTransition, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ContactRound,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  Globe,
  GraduationCap,
  Handshake,
  KeyRound,
  Landmark,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Radio,
  Receipt,
  ScrollText,
  Settings,
  Share2,
  ShieldCheck,
  Target,
  Truck,
  Users,
  Video,
  Wallet,
  Wrench,
  X,
} from "lucide-react";

import Unit311CentralWordmark from "@/components/layout/Unit311CentralWordmark";
import {
  internalSurveyNavSections,
  isInternalNavChildActive,
  isInternalNavItemActive,
  type InternalNavChildItem,
  type InternalNavItem,
  type InternalNavSection,
  type InternalOperationsView,
} from "@/lib/internal-operations-data";
import { isInternalDomainHost } from "@/lib/app-domains";
import {
  getSidebarTheme,
  readSidebarExpandedState,
  readSidebarThemeId,
  writeSidebarExpandedState,
  type SidebarThemeTokens,
} from "@/lib/sidebar-chrome";
import type { SurveyOperationsBasePath } from "@/lib/survey-operations-mock-data";
import { cn } from "@/lib/utils";

const iconMap = {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ContactRound,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  Globe,
  GraduationCap,
  Handshake,
  KeyRound,
  Landmark,
  Layers,
  LifeBuoy,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Radio,
  Receipt,
  ScrollText,
  Settings,
  Share2,
  ShieldCheck,
  Target,
  Truck,
  Users,
  Video,
  Wallet,
  Wrench,
} as const;

const SUBMENU_ICON = "text-[#8B9BB0]";
const NESTED_TEXT = "text-[#D7DEE8]";

/** Snappy expand/collapse — engineered, not elastic. */
const EXPAND_MS = 130;

const PIN_HEIGHT = 44;
const CARD_PAD_X = 10;
const CARD_GAP = 12;

type EnterprisePlatformSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
  activeView?: InternalOperationsView;
  onViewChange?: (view: InternalOperationsView) => void;
  basePath?: SurveyOperationsBasePath;
  onPrefetchView?: (view: InternalOperationsView) => void;
};

function resolveIcon(name?: string) {
  if (!name) return LayoutDashboard;
  return iconMap[name as keyof typeof iconMap] ?? LayoutDashboard;
}

function cardShellStyle(theme: SidebarThemeTokens): CSSProperties {
  return {
    background: theme.card,
    borderColor: theme.cardBorder,
  };
}

function expandPanelClass(isOpen: boolean) {
  return cn(
    "grid transition-[grid-template-rows,opacity] ease-out",
    isOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
  );
}

export default function EnterprisePlatformSidebar({
  mobileOpen = false,
  onClose,
  activeView = "home",
  onViewChange,
  basePath = "/internaldashboard",
  onPrefetchView,
}: EnterprisePlatformSidebarProps) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [theme, setTheme] = useState<SidebarThemeTokens>(() => getSidebarTheme(readSidebarThemeId()));
  const [hydrated, setHydrated] = useState(false);

  const [isInternalOpsHost] = useState(() => {
    if (basePath === "/dashboard") return false;
    if (typeof window !== "undefined" && isInternalDomainHost(window.location.hostname)) {
      return true;
    }
    return basePath === "/" || basePath === "/internaldashboard" || basePath === "/internaldashboard_grants";
  });

  useEffect(() => {
    const saved = readSidebarExpandedState();
    startTransition(() => {
      setExpanded(saved);
      setTheme(getSidebarTheme(readSidebarThemeId()));
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    const onTheme = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setTheme(getSidebarTheme(detail));
    };
    window.addEventListener("unit311-sidebar-theme", onTheme);
    return () => window.removeEventListener("unit311-sidebar-theme", onTheme);
  }, []);

  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleExpanded(key: string) {
    setExpanded((current) => {
      const next = { ...current, [key]: !current[key] };
      writeSidebarExpandedState(next);
      return next;
    });
  }

  function navigate(view: InternalOperationsView) {
    onViewChange?.(view);
    onClose?.();
  }

  function childLabel(child: InternalNavChildItem) {
    if (child.view === "billing" && isInternalOpsHost) return "Billing";
    return child.label;
  }

  function renderLeaf(
    key: string,
    label: string,
    active: boolean,
    opts: {
      view?: InternalOperationsView;
      href?: string;
      icon?: string;
      depth: number;
    },
  ) {
    const nested = opts.depth > 0;
    const Icon = resolveIcon(opts.icon);
    const className = cn(
      "flex w-full items-center rounded-[8px] text-left transition-colors duration-100",
      nested
        ? cn(
            "min-h-[28px] gap-0 py-[3px] pl-8 pr-1.5 text-[11.5px] font-normal leading-[1.3]",
            NESTED_TEXT,
          )
        : "min-h-[30px] gap-2 py-[3px] pl-1.5 pr-1.5 text-[12.5px] font-medium leading-[1.3] text-white/90",
      active
        ? "text-white"
        : nested
          ? "hover:bg-white/[0.03] hover:text-white"
          : "hover:bg-white/[0.035] hover:text-white",
    );
    const style = active ? { background: "#1F4FBF", color: "#FFFFFF" } : undefined;

    const content = (
      <>
        {!nested && opts.icon ? (
          <Icon className={cn("h-[15px] w-[15px] shrink-0", SUBMENU_ICON)} strokeWidth={1.5} />
        ) : null}
        <span className="min-w-0 flex-1 whitespace-normal break-words">{label}</span>
      </>
    );

    if (opts.href) {
      return (
        <Link
          key={key}
          href={opts.href}
          aria-current={active ? "page" : undefined}
          onClick={onClose}
          className={className}
          style={style}
        >
          {content}
        </Link>
      );
    }

    if (opts.view) {
      return (
        <button
          key={key}
          type="button"
          aria-current={active ? "page" : undefined}
          onClick={() => navigate(opts.view!)}
          onPointerEnter={() => onPrefetchView?.(opts.view!)}
          onFocus={() => onPrefetchView?.(opts.view!)}
          className={className}
          style={style}
        >
          {content}
        </button>
      );
    }

    return null;
  }

  function renderGroup(
    item: InternalNavItem | InternalNavChildItem,
    parentKey: string,
    depth: number,
  ) {
    const key = `${parentKey}::${item.label}`;
    const hasChildren = (item.children?.length ?? 0) > 0;
    const active = isInternalNavChildActive(
      item as InternalNavChildItem,
      activeView,
      pathname,
      basePath,
      searchParams,
    );
    const itemIcon = "icon" in item ? item.icon : undefined;

    if (!hasChildren) {
      return renderLeaf(key, childLabel(item as InternalNavChildItem), active, {
        view: item.view,
        href: item.href,
        icon: itemIcon,
        depth,
      });
    }

    const isOpen = hydrated ? Boolean(expanded[key]) : false;
    const Chevron = isOpen ? ChevronDown : ChevronRight;
    const Icon = resolveIcon(itemIcon);

    return (
      <div key={key}>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => toggleExpanded(key)}
          className={cn(
            "flex w-full items-center gap-2 rounded-[8px] pr-1 text-left transition-colors duration-100 hover:bg-white/[0.035]",
            depth > 0 ? "min-h-[28px] py-[3px] pl-8" : "min-h-[30px] py-[3px] pl-1.5",
          )}
        >
          {depth === 0 && itemIcon ? (
            <Icon className={cn("h-[15px] w-[15px] shrink-0", SUBMENU_ICON)} strokeWidth={1.5} />
          ) : null}
          <span
            className={cn(
              "min-w-0 flex-1 whitespace-normal break-words text-left",
              depth > 0
                ? cn("text-[11.5px] font-normal leading-[1.3]", NESTED_TEXT)
                : "text-[12.5px] font-medium leading-[1.3] text-white/90",
            )}
          >
            {item.label}
          </span>
          <Chevron className="h-3 w-3 shrink-0 text-white/55" strokeWidth={1.5} />
        </button>
        <div
          className={expandPanelClass(isOpen)}
          style={{ transitionDuration: `${EXPAND_MS}ms` }}
          aria-hidden={!isOpen}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mt-0.5 space-y-px">
              {item.children?.map((child) => renderGroup(child, key, depth + 1))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderPinItem(item: InternalNavItem) {
    const active = isInternalNavItemActive(pathname, item, activeView, basePath, searchParams);
    const Icon = resolveIcon(item.icon);

    if (!item.view) return null;

    return (
      <div
        key={item.label}
        className="flex items-center rounded-[12px] border"
        style={{
          ...cardShellStyle(theme),
          height: PIN_HEIGHT,
          paddingLeft: 4,
          paddingRight: 4,
        }}
      >
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          onClick={() => navigate(item.view!)}
          onPointerEnter={() => onPrefetchView?.(item.view!)}
          onFocus={() => onPrefetchView?.(item.view!)}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-[8px] px-2 text-left text-[12.5px] font-medium leading-none tracking-normal transition-colors duration-100",
            active ? "text-white" : "text-white/90 hover:bg-white/[0.035] hover:text-white",
          )}
          style={active ? { background: "#1F4FBF" } : undefined}
        >
          <Icon
            className={cn("h-[15px] w-[15px] shrink-0", active ? "text-white" : SUBMENU_ICON)}
            strokeWidth={1.5}
          />
          <span className="min-w-0 flex-1 whitespace-nowrap">{item.label}</span>
        </button>
      </div>
    );
  }

  function renderWorkspace(section: InternalNavSection) {
    const workspaceKey = `workspace::${section.label ?? "workspace"}`;
    const isOpen = hydrated ? Boolean(expanded[workspaceKey]) : false;
    const Icon = resolveIcon(section.icon);
    const color = section.color ?? theme.accent;
    const Chevron = isOpen ? ChevronDown : ChevronRight;

    return (
      <div
        key={workspaceKey}
        className="rounded-[12px] border"
        style={{
          ...cardShellStyle(theme),
          paddingLeft: CARD_PAD_X,
          paddingRight: 8,
          paddingBottom: isOpen ? 6 : 0,
        }}
      >
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => toggleExpanded(workspaceKey)}
          className="flex h-[40px] w-full items-center gap-2 text-left"
        >
          <Icon
            className="h-4 w-4 shrink-0"
            style={{ color, opacity: 0.85 }}
            strokeWidth={1.5}
          />
          <span
            className="min-w-0 flex-1 text-[11px] font-semibold uppercase leading-none tracking-[0.12em]"
            style={{ color, opacity: 0.85 }}
          >
            {section.label}
          </span>
          <Chevron className="h-3 w-3 shrink-0 text-white/50" strokeWidth={1.5} />
        </button>

        <div
          className={expandPanelClass(isOpen)}
          style={{ transitionDuration: `${EXPAND_MS}ms` }}
          aria-hidden={!isOpen}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mt-0.5 space-y-px pb-0.5">
              {section.items.map((item) => {
                if (item.children?.length) {
                  return renderGroup(item, workspaceKey, 0);
                }
                const leafActive = isInternalNavItemActive(
                  pathname,
                  item,
                  activeView,
                  basePath,
                  searchParams,
                );
                return renderLeaf(`${workspaceKey}::${item.label}`, item.label, leafActive, {
                  view: item.view,
                  href: item.href,
                  icon: item.icon,
                  depth: 0,
                });
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pinSections = internalSurveyNavSections.filter((section) => section.kind === "pin");
  const workspaceSections = internalSurveyNavSections.filter(
    (section) => section.kind === "workspace",
  );

  return (
    <aside
      data-ai-target="platform-nav"
      aria-modal={mobileOpen ? true : undefined}
      role={mobileOpen ? "dialog" : undefined}
      aria-label={mobileOpen ? "Navigation menu" : undefined}
      className={cn(
        "safe-area-px fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-[min(320px,94vw)] flex-col overflow-hidden pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out lg:static lg:z-auto lg:h-full lg:max-h-full lg:w-[320px] lg:shrink-0 lg:translate-x-0 lg:pt-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
      style={{
        background: theme.sidebar,
        borderRight: `1px solid ${theme.border}`,
      }}
    >
      <div className="flex shrink-0 items-center justify-between px-5 pb-3.5 pt-5">
        <Link
          href={basePath}
          aria-label="Unit311 Central home"
          className="inline-flex shrink-0 transition-opacity duration-150 hover:opacity-90"
        >
          <Unit311CentralWordmark variant="sidebar" />
        </Link>
        <button
          type="button"
          className="ml-2 flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-[8px] border text-white/55 transition-colors duration-100 hover:text-white lg:hidden"
          style={{ borderColor: theme.cardBorder }}
          aria-label="Close menu"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      <nav className="sidebar-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col" style={{ gap: CARD_GAP }}>
          {pinSections.map((section) => section.items.map((item) => renderPinItem(item)))}
          {workspaceSections.map((section) => renderWorkspace(section))}
        </div>
      </nav>
    </aside>
  );
}
