"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import Logo from "@/components/layout/Logo";
import EnterprisePlatformSidebar from "./EnterprisePlatformSidebar";
import {
  getInternalNavHref,
  internalSurveyNavSections,
  isInternalNavChildActive,
  isInternalNavItemActive,
  type InternalNavChildItem,
  type InternalNavItem,
  type InternalOperationsView,
} from "@/lib/internal-operations-data";
import { isInternalDomainHost } from "@/lib/app-domains";
import {
  getSurveyNavHref,
  isSurveyNavItemActive,
  isSurveyOperationsDashboardPath,
  surveyNavItems,
  type SurveyOperationsBasePath,
  type SurveyOperationsView,
} from "@/lib/survey-operations-mock-data";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Binoculars,
  Bot,
  Briefcase,
  Building2,
  Compass,
  ContactRound,
  Cpu,
  Wallet,
  Film,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  Globe,
  GraduationCap,
  Handshake,
  History,
  KeyRound,
  Landmark,
  Laptop,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  MessageCircle,
  MessageSquare,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Mail,
  Package,
  PenLine,
  Pickaxe,
  Plane,
  Radio,
  Receipt,
  ScrollText,
  Server,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Target,
  Truck,
  Video,
  Users,
  Wrench,
  X,
} from "lucide-react";

const iconMap = {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Binoculars,
  Bot,
  Briefcase,
  Building2,
  Compass,
  ContactRound,
  Cpu,
  Wallet,
  Package,
  MapPin,
  Target,
  Plane,
  Radio,
  Receipt,
  ScrollText,
  Server,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Video,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  Globe,
  GraduationCap,
  Handshake,
  History,
  KeyRound,
  Landmark,
  Laptop,
  Layers,
  LifeBuoy,
  MessageCircle,
  MessageSquare,
  CalendarDays,
  Mail,
  Users,
  Film,
  PenLine,
  Pickaxe,
  Wrench,
} as const;

const childNavItemClass = (active: boolean) =>
  cn(
    "group/nav flex w-full min-h-11 items-center rounded-xl py-2.5 pl-8 pr-2.5 text-left text-[11.5px] font-medium leading-snug tracking-[-0.01em] transition-all duration-200 ease-out touch-manipulation lg:min-h-0 lg:rounded-[10px] lg:py-[0.42rem] lg:text-[11px]",
    active
      ? "bg-white/[0.07] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(125,211,252,0.14),0_0_22px_rgba(56,189,248,0.1)]"
      : "text-white/48 hover:bg-white/[0.045] hover:text-white/82",
  );

const navItemClass = (active: boolean, compact = false) =>
  cn(
    "group/nav flex w-full items-center rounded-xl text-left font-medium leading-snug tracking-[-0.01em] transition-all duration-200 ease-out touch-manipulation",
    compact
      ? "min-h-11 gap-2.5 px-2.5 py-2.5 text-[12px] lg:min-h-0 lg:rounded-[10px] lg:py-[0.42rem] lg:text-[11.5px]"
      : "min-h-11 gap-2.5 px-3 py-2.5 text-[13px] sm:px-3.5 sm:py-3 sm:text-[13.5px] lg:min-h-0 lg:rounded-[10px] lg:py-2",
    active
      ? "bg-white/[0.07] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(125,211,252,0.14),0_0_22px_rgba(56,189,248,0.1)]"
      : "text-white/55 hover:bg-white/[0.045] hover:text-white/88",
  );

const sectionHeaderClass =
  "mb-2 px-2.5 pt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/32 lg:mb-2.5 lg:pt-1.5 lg:text-[9.5px] lg:tracking-[0.18em]";

const navIconClass = (compact = false) =>
  cn(
    "shrink-0 text-current opacity-70 transition-opacity duration-200 group-hover/nav:opacity-90",
    compact ? "h-[15px] w-[15px] lg:h-3.5 lg:w-3.5" : "h-4 w-4 sm:h-[17px] sm:w-[17px]",
  );

const navCollapseClass = (expanded: boolean) =>
  cn(
    "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
    expanded
      ? "grid-rows-[1fr] opacity-100"
      : "pointer-events-none grid-rows-[0fr] opacity-0",
  );

type SurveyOperationsSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
  mode?: "survey" | "internal";
  activeView?: SurveyOperationsView | InternalOperationsView;
  onViewChange?: (view: SurveyOperationsView | InternalOperationsView) => void;
  basePath?: SurveyOperationsBasePath;
  onPrefetchView?: (view: InternalOperationsView) => void;
};

export default function SurveyOperationsSidebar({
  mobileOpen = false,
  onClose,
  mode = "survey",
  activeView,
  onViewChange,
  basePath = "/testflighthub",
  onPrefetchView,
}: SurveyOperationsSidebarProps) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const resolvedActiveView = (activeView as InternalOperationsView | undefined) ?? "home";
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const internalNavSections = internalSurveyNavSections;
  const internalBasePath = basePath;
  const [isInternalOpsHost] = useState(() => {
    if (mode !== "internal") return false;
    if (basePath === "/dashboard") return false;
    if (typeof window !== "undefined" && isInternalDomainHost(window.location.hostname)) {
      return true;
    }
    return basePath === "/" || basePath === "/internaldashboard" || basePath === "/internaldashboard_grants";
  });

  function childNavLabel(child: InternalNavChildItem) {
    if (child.view === "billing" && isInternalOpsHost) return "Platform Billing";
    return child.label;
  }

  useEffect(() => {
    const autoExpanded: Record<string, boolean> = {};
    internalNavSections.forEach((section) => {
      section.items.forEach((item) => {
        if (
          item.children?.some((child) =>
            isInternalNavChildActive(
              child,
              resolvedActiveView,
              pathname,
              internalBasePath,
              searchParams,
            ),
          )
        ) {
          autoExpanded[item.label] = true;
          item.children?.forEach((child) => {
            if (
              child.children?.some((nested) =>
                isInternalNavChildActive(
                  nested,
                  resolvedActiveView,
                  pathname,
                  internalBasePath,
                  searchParams,
                ),
              )
            ) {
              autoExpanded[`${item.label}::${child.label}`] = true;
            }
          });
        }
      });
    });
    if (Object.keys(autoExpanded).length > 0) {
      startTransition(() => {
        setExpandedParents((current) => ({ ...current, ...autoExpanded }));
      });
    }
  }, [internalNavSections, resolvedActiveView, pathname, searchParams, internalBasePath]);

  const inAppNavigation =
    isSurveyOperationsDashboardPath(pathname, basePath) && onViewChange != null;
  const logoHref = mode === "internal" ? basePath : basePath;

  function renderNavItem(
    item: { label: string; icon: string },
    active: boolean,
    onNavigate: () => void,
    asLink: boolean,
    href: string,
    compact = false,
    prefetchView?: InternalOperationsView,
  ) {
    const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard;
    const content = (
      <>
        <Icon className={navIconClass(compact)} strokeWidth={1.75} />
        <span className="flex-1 truncate">{item.label}</span>
      </>
    );
    const onIntent = () => {
      if (prefetchView) onPrefetchView?.(prefetchView);
    };

    if (asLink) {
      return (
        <Link
          key={item.label}
          href={href}
          aria-current={active ? "page" : undefined}
          onClick={onClose}
          onPointerEnter={onIntent}
          onFocus={onIntent}
          className={navItemClass(active, compact)}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={item.label}
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        className={navItemClass(active, compact)}
      >
        {content}
      </button>
    );
  }

  function renderInternalChildItem(
    child: InternalNavChildItem,
    parentExpandKey?: string,
    nested = false,
  ) {
    const expandKey = parentExpandKey
      ? `${parentExpandKey}::${child.label}`
      : child.label;
    const active = isInternalNavChildActive(
      child,
      resolvedActiveView,
      pathname,
      internalBasePath,
      searchParams,
    );
    const hasNestedChildren = (child.children?.length ?? 0) > 0;

    if (hasNestedChildren) {
      const expanded = expandedParents[expandKey] ?? active;
      const Chevron = expanded ? ChevronDown : ChevronRight;
      return (
        <div key={expandKey}>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() =>
              setExpandedParents((current) => ({
                ...current,
                [expandKey]: !expanded,
              }))
            }
            className={cn(childNavItemClass(active), "justify-between")}
          >
            <span className="truncate">{childNavLabel(child)}</span>
            <Chevron
              className={cn(
                "h-3 w-3 shrink-0 text-white/28 transition-transform duration-200",
                expanded && "text-white/45",
              )}
              strokeWidth={1.75}
            />
          </button>
          <div className={navCollapseClass(expanded)} aria-hidden={!expanded}>
            <div className="min-h-0 overflow-hidden">
              <div className="ml-1.5 mt-1 space-y-1 pl-2">
                {child.children?.map((nestedChild) =>
                  renderInternalChildItem(nestedChild, expandKey, true),
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const navHref =
      child.href ?? getInternalNavHref(child.view ?? "home", internalBasePath, child.query);
    const itemClass = cn(childNavItemClass(active), nested && "pl-3");

    if (child.href) {
      return (
        <Link
          key={expandKey}
          href={child.href}
          aria-current={active ? "page" : undefined}
          onClick={onClose}
          className={itemClass}
        >
          <span className="truncate">{childNavLabel(child)}</span>
        </Link>
      );
    }

    if (inAppNavigation && child.view && !child.query) {
      return (
        <button
          key={expandKey}
          type="button"
          aria-current={active ? "page" : undefined}
          onClick={() => {
            (onViewChange as (view: InternalOperationsView) => void)(child.view!);
            onClose?.();
          }}
          onPointerEnter={() => onPrefetchView?.(child.view!)}
          onFocus={() => onPrefetchView?.(child.view!)}
          className={itemClass}
        >
          <span className="truncate">{childNavLabel(child)}</span>
        </button>
      );
    }

    return (
      <Link
        key={expandKey}
        href={navHref}
        aria-current={active ? "page" : undefined}
        onClick={onClose}
        className={itemClass}
      >
        <span className="truncate">{childNavLabel(child)}</span>
      </Link>
    );
  }

  function renderInternalNavItemBlock(item: InternalNavItem) {
    const active = isInternalNavItemActive(
      pathname,
      item,
      resolvedActiveView,
      internalBasePath,
      searchParams,
    );
    const hasChildren = (item.children?.length ?? 0) > 0;
    const expanded = expandedParents[item.label] ?? active;

    if (item.indented && (item.view || item.href)) {
      const navHref = item.href ?? getInternalNavHref(item.view as InternalOperationsView, internalBasePath);
      const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard;
      const linkActive = item.href
        ? pathname === item.href || pathname.startsWith(`${item.href}/`)
        : active;

      if (inAppNavigation && item.view && !item.href) {
        return (
          <button
            key={item.label}
            type="button"
            aria-current={linkActive ? "page" : undefined}
            onClick={() => {
              (onViewChange as (view: InternalOperationsView) => void)(item.view as InternalOperationsView);
              onClose?.();
            }}
            onPointerEnter={() => onPrefetchView?.(item.view as InternalOperationsView)}
            onFocus={() => onPrefetchView?.(item.view as InternalOperationsView)}
            className={childNavItemClass(linkActive)}
          >
            <Icon className="mr-2 h-3.5 w-3.5 shrink-0 opacity-65" strokeWidth={1.75} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      }

      return (
        <Link
          key={item.label}
          href={navHref}
          aria-current={linkActive ? "page" : undefined}
          onClick={onClose}
          className={childNavItemClass(linkActive)}
        >
          <Icon className="mr-2 h-3.5 w-3.5 shrink-0 opacity-65" strokeWidth={1.75} />
          <span className="truncate">{item.label}</span>
        </Link>
      );
    }

    if (hasChildren) {
      const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard;
      const Chevron = expanded ? ChevronDown : ChevronRight;

      return (
        <div key={item.label}>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() =>
              setExpandedParents((current) => ({
                ...current,
                [item.label]: !expanded,
              }))
            }
            className={navItemClass(active, true)}
          >
            <Icon className={navIconClass(true)} strokeWidth={1.75} />
            <span className="flex-1 truncate text-left">{item.label}</span>
            <Chevron
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-white/28 transition-transform duration-200",
                expanded && "text-white/45",
              )}
              strokeWidth={1.75}
            />
          </button>
          <div className={navCollapseClass(expanded)} aria-hidden={!expanded}>
            <div className="min-h-0 overflow-hidden">
              <div className="mt-1 space-y-1">
                {item.children?.map((child) => renderInternalChildItem(child, item.label))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (item.href && !item.view) {
      return renderNavItem(item, active, () => undefined, true, item.href, true);
    }

    const navHref = getInternalNavHref(item.view as InternalOperationsView, internalBasePath);

    if (inAppNavigation) {
      return renderNavItem(
        item,
        active,
        () => {
          (onViewChange as (view: InternalOperationsView) => void)(item.view as InternalOperationsView);
          onClose?.();
        },
        false,
        navHref,
        true,
        item.view as InternalOperationsView,
      );
    }

    return renderNavItem(item, active, () => undefined, true, navHref, true);
  }

  function renderInternalSection(section: (typeof internalNavSections)[number]) {
    return (
      <div key={section.label ?? "home"} className="pb-1">
        {section.label ? <p className={sectionHeaderClass}>{section.label}</p> : null}
        <div className="space-y-1">
          {section.items.map((item) => renderInternalNavItemBlock(item))}
        </div>
      </div>
    );
  }

  useEffect(() => {
    onClose?.();
    // Close drawer on route change only — not when onClose identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (mode === "internal") {
    return (
      <EnterprisePlatformSidebar
        mobileOpen={mobileOpen}
        onClose={onClose}
        activeView={(activeView as InternalOperationsView | undefined) ?? "home"}
        onViewChange={onViewChange as ((view: InternalOperationsView) => void) | undefined}
        basePath={basePath}
        onPrefetchView={onPrefetchView}
      />
    );
  }

  return (
    <aside
      data-ai-target="platform-nav"
      aria-modal={mobileOpen ? true : undefined}
      role={mobileOpen ? "dialog" : undefined}
      aria-label={mobileOpen ? "Navigation menu" : undefined}
      className={cn(
        "safe-area-px fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-[min(300px,92vw)] flex-col overflow-hidden border-r border-white/[0.06] bg-[#07111F] pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out lg:static lg:z-auto lg:h-full lg:max-h-full lg:w-[240px] lg:shrink-0 lg:translate-x-0 lg:pt-0 xl:w-[252px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <div className="flex shrink-0 items-center justify-between px-3 pb-4 pt-3 lg:px-3.5 lg:pb-5 lg:pt-4">
        <div className="min-w-0 flex-1 rounded-xl bg-white px-2.5 py-1.5 shadow-[0_1px_0_rgba(255,255,255,0.4)]">
          <Logo height={30} href={logoHref} className="block w-full max-w-none" />
        </div>
        <button
          type="button"
          className="ml-2 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/[0.06] text-white/55 transition-colors duration-200 hover:bg-white/[0.04] hover:text-white/80 lg:hidden"
          aria-label="Close menu"
          onClick={onClose}
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <nav className="sidebar-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 lg:px-3 lg:pt-3">
        <div className="space-y-1.5">
          {surveyNavItems.map((item) => {
              const active = isSurveyNavItemActive(
                pathname,
                item as (typeof surveyNavItems)[number],
                activeView as SurveyOperationsView | null | undefined,
                basePath,
              );
              const externalHref = "href" in item ? item.href : undefined;
              const navHref = getSurveyNavHref(
                item.view as SurveyOperationsView | null,
                externalHref,
                basePath,
              );

              if (inAppNavigation && item.view) {
                return renderNavItem(
                  item,
                  active,
                  () => {
                    (onViewChange as (view: SurveyOperationsView) => void)(
                      item.view as SurveyOperationsView,
                    );
                    onClose?.();
                  },
                  false,
                  navHref,
                );
              }

              return renderNavItem(item, active, () => undefined, true, navHref);
            })}
        </div>
      </nav>
    </aside>
  );
}
