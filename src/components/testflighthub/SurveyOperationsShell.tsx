"use client";

import { startTransition, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Menu, X } from "lucide-react";

import GuidedLearningOverlay from "@/components/executive-assistant/GuidedLearningOverlay";
import {
  GuidedLearningProvider,
  requestShowMeAround,
} from "@/components/executive-assistant/GuidedLearningProvider";
import ExecutiveProactiveLayer from "@/components/executive-assistant/ExecutiveProactiveLayer";
import {
  hasNeverShowTours,
  markNeverShowTours,
} from "@/lib/ai-operating-assistant/guided-learning";
import {
  BRIEF_READY_EVENT,
  markDailyBriefSeen,
  type BriefReadyDetail,
} from "@/lib/ai-operating-assistant/proactive-client";
import {
  getInternalNavBreadcrumb,
  internalViewTitles,
  isInternalOperationsView,
  type InternalOperationsView,
} from "@/lib/internal-operations-data";
import { isDemoDomainHost, isInternalDomainHost } from "@/lib/app-domains";
import { PLATFORM_AI_ASSISTANT_VISIBLE } from "@/lib/product-surface-flags";
import {
  surveyViewTitles,
  type SurveyOperationsBasePath,
  type SurveyOperationsView,
} from "@/lib/survey-operations-mock-data";
import { cn } from "@/lib/utils";

import PlatformFloatingAiAssistant from "./PlatformFloatingAiAssistant";
import SurveyOperationsSidebar from "./SurveyOperationsSidebar";
import { WorkspaceBreadcrumb } from "./workspace-chrome";

type SurveyOperationsShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  mode?: "survey" | "internal";
  activeView?: SurveyOperationsView | InternalOperationsView;
  onViewChange?: (view: SurveyOperationsView | InternalOperationsView) => void;
  basePath?: SurveyOperationsBasePath;
};

export default function SurveyOperationsShell({
  children,
  title = "Operations Dashboard",
  subtitle = "Survey Operations",
  mode = "survey",
  activeView,
  onViewChange,
  basePath = "/testflighthub",
}: SurveyOperationsShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [briefReady, setBriefReady] = useState<BriefReadyDetail | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [tutorialMenuOpen, setTutorialMenuOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const [isInternalHost] = useState(() => {
    if (typeof window === "undefined") return true;
    const host = window.location.hostname;
    if (isInternalDomainHost(host) || isDemoDomainHost(host)) return true;
    if (host === "localhost" || host === "127.0.0.1") {
      return !host.includes(".") || host === "localhost";
    }
    return false;
  });
  const [isDemoHost] = useState(() => {
    if (typeof window === "undefined") return false;
    return isDemoDomainHost(window.location.hostname);
  });

  useEffect(() => {
    startTransition(() => {
      setMobileNavOpen(false);
    });
  }, [pathname, activeView]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    const onBrief = (event: Event) => {
      const detail = (event as CustomEvent<BriefReadyDetail>).detail;
      setBriefReady(detail?.available ? detail : null);
      if (!detail?.available) setBriefOpen(false);
    };
    window.addEventListener(BRIEF_READY_EVENT, onBrief as EventListener);
    return () => window.removeEventListener(BRIEF_READY_EVENT, onBrief as EventListener);
  }, []);

  const resolvedTitle =
    activeView != null
      ? mode === "internal" && isInternalOperationsView(activeView)
        ? activeView === "billing" && !isInternalHost
          ? "Billing"
          : internalViewTitles[activeView].title
        : surveyViewTitles[activeView as SurveyOperationsView].title
      : title;
  const resolvedSubtitle =
    activeView != null
      ? mode === "internal" && isInternalOperationsView(activeView)
        ? activeView === "billing" && !isInternalHost
          ? "Your subscription"
          : internalViewTitles[activeView].subtitle
        : surveyViewTitles[activeView as SurveyOperationsView].subtitle
      : subtitle;

  const showPlatformAi = PLATFORM_AI_ASSISTANT_VISIBLE && mode === "internal";

  const guidedViewId =
    mode === "internal" && activeView != null ? String(activeView) : "home";

  const breadcrumbCrumbs =
    mode === "internal" &&
    activeView != null &&
    isInternalOperationsView(activeView)
      ? getInternalNavBreadcrumb(activeView)
      : null;

  const shell = (
    <div className="flex h-full min-h-0 w-full min-w-0">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 touch-manipulation bg-[#07111F]/80 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <SurveyOperationsSidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        mode={mode}
        activeView={activeView}
        onViewChange={onViewChange}
        basePath={basePath}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#0b1220]">
        {mode === "internal" ? (
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.07),_transparent_55%),linear-gradient(180deg,#0b1220_0%,#020617_100%)]"
            aria-hidden
          />
        ) : null}

        <header
          data-ai-target="page-header"
          className="safe-area-px relative z-10 shrink-0 border-b border-white/[0.08] bg-[#07111F]/80 px-2 backdrop-blur-md max-md:backdrop-blur-none sm:px-4 md:px-5 lg:px-8 lg:backdrop-blur-xl"
        >
          <div className="flex h-14 items-center justify-between gap-3 lg:h-16">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/[0.08] text-white/60 lg:hidden"
                aria-label="Open navigation menu"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                {breadcrumbCrumbs && breadcrumbCrumbs.length > 1 ? (
                  <WorkspaceBreadcrumb crumbs={breadcrumbCrumbs} />
                ) : (
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
                    {resolvedSubtitle}
                  </p>
                )}
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="truncate text-sm font-semibold text-white sm:text-base md:text-lg">
                    {resolvedTitle}
                  </h1>
                  {isDemoHost ? (
                    <span
                      className="shrink-0 rounded border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-200"
                      title="Demo surface — same build as Internal; curated workspace content"
                    >
                      Demo
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative flex shrink-0 items-center gap-2">
              {showPlatformAi ? (
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Tutorial"
                    aria-expanded={tutorialMenuOpen}
                    onClick={() => setTutorialMenuOpen((value) => !value)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-2.5 text-[11px] font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Tutorial
                  </button>
                  {tutorialMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.4rem)] z-30 w-56 rounded-xl border border-white/12 bg-[#0b1524] p-3 shadow-xl">
                      <p className="text-xs font-semibold text-white">Page walkthrough</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-white/50">
                        A short guided tour of this module. Optional voice is available in the tour panel.
                      </p>
                      <div className="mt-3 flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            requestShowMeAround(guidedViewId);
                            setTutorialMenuOpen(false);
                          }}
                          className="rounded-lg border border-sky-400/35 bg-sky-500/15 px-2.5 py-1.5 text-left text-[11px] font-semibold text-sky-100"
                        >
                          Start tutorial
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            markNeverShowTours();
                            setTutorialMenuOpen(false);
                          }}
                          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-left text-[11px] text-white/55"
                        >
                          Don&apos;t show again
                        </button>
                      </div>
                      {hasNeverShowTours() ? (
                        <p className="mt-2 text-[10px] text-white/35">Tours are currently disabled.</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showPlatformAi && briefReady?.available ? (
                <button
                  type="button"
                  aria-label="Open daily brief"
                  aria-expanded={briefOpen}
                  onClick={() => setBriefOpen((value) => !value)}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sky-400" />
                </button>
              ) : null}
            </div>
          </div>

          {briefOpen && briefReady?.available ? (
            <div className="absolute right-2 top-[3.6rem] z-20 w-[min(340px,calc(100vw-1rem))] rounded-xl border border-white/12 bg-[#0b1524] p-3.5 text-white shadow-xl sm:right-4 lg:right-8">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300/85">
                    Daily brief
                  </p>
                  <p className="mt-1 text-sm font-semibold">{briefReady.greeting}</p>
                  <p className="mt-1 text-xs text-white/55">{briefReady.headline}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close brief"
                  onClick={() => {
                    markDailyBriefSeen();
                    setBriefOpen(false);
                    setBriefReady(null);
                  }}
                  className="rounded-md p-1 text-white/40 hover:bg-white/[0.06]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {(briefReady.priorities?.length ?? 0) > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {briefReady.priorities!.map((priority) => (
                    <li key={priority} className="text-xs leading-snug text-white/75">
                      · {priority}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    markDailyBriefSeen();
                    setBriefOpen(false);
                    setBriefReady(null);
                    setAssistantOpen(true);
                  }}
                  className="rounded-md border border-sky-400/35 bg-sky-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-sky-100"
                >
                  Discuss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    markDailyBriefSeen();
                    setBriefOpen(false);
                    setBriefReady(null);
                  }}
                  className="rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-white/55"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}
        </header>

        <div
          data-ai-target="page-main"
          className={cn(
            "safe-area-pb safe-area-px relative z-10 min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 py-2 sm:px-3 sm:py-3 md:px-4 [-webkit-overflow-scrolling:touch]",
          )}
        >
          {children}
        </div>
      </div>

      <PlatformFloatingAiAssistant
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        activeView={activeView}
        mode={mode}
      />

      {showPlatformAi ? (
        <>
          <GuidedLearningOverlay />
          <ExecutiveProactiveLayer
            activeView={activeView ?? "home"}
            roleView={null}
            onOpenAssistant={() => setAssistantOpen(true)}
          />
        </>
      ) : null}
    </div>
  );

  if (mode === "internal" && showPlatformAi) {
    return (
      <GuidedLearningProvider activeView={guidedViewId}>{shell}</GuidedLearningProvider>
    );
  }

  return shell;
}
