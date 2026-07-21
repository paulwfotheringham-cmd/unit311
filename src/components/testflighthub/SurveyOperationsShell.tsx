"use client";

import { startTransition, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Menu, Sparkles, X } from "lucide-react";

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
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const isHomeView = mode === "internal" && activeView === "home";
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
    if (!tutorialOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTutorialOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tutorialOpen]);

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
                <>
                  <button
                    type="button"
                    data-ai-target="ai-assistant"
                    aria-label="Open AI Executive Assistant"
                    aria-expanded={assistantOpen}
                    onClick={() => setAssistantOpen(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/10 px-2.5 text-[11px] font-semibold text-sky-100 transition-colors hover:border-sky-400/45 hover:bg-sky-500/20"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Assistant
                  </button>
                  <button
                    type="button"
                    aria-label="Tutorial"
                    aria-expanded={tutorialOpen}
                    onClick={() => setTutorialOpen(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-2.5 text-[11px] font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Tutorial
                  </button>
                </>
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
            "safe-area-pb safe-area-px relative z-10 min-h-0 min-w-0 flex-1 overflow-x-hidden px-2 py-2 sm:px-3 sm:py-3 md:px-4",
            isHomeView
              ? "overflow-hidden"
              : "overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
          )}
        >
          {children}
        </div>
      </div>

      {showPlatformAi && tutorialOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setTutorialOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-sky-400/35 bg-gradient-to-br from-[#122038] via-[#0e1a2e] to-[#0a1424] p-6 shadow-[0_28px_80px_-24px_rgba(14,165,233,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-500" />
            <button
              type="button"
              aria-label="Close tutorial"
              onClick={() => setTutorialOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/20 ring-1 ring-sky-400/40">
                <BookOpen className="h-5 w-5 text-sky-200" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
                  Guided learning
                </p>
                <h2 id="tutorial-modal-title" className="mt-0.5 text-lg font-semibold tracking-tight text-white">
                  Module tutorial
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              A short walkthrough of this module. Optional voice narration is available once the tour starts.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  requestShowMeAround(guidedViewId);
                  setTutorialOpen(false);
                }}
                className="rounded-xl border border-sky-400/40 bg-sky-500/20 px-4 py-2.5 text-sm font-semibold text-sky-50 transition-colors hover:bg-sky-500/30"
              >
                Start tutorial
              </button>
              <button
                type="button"
                onClick={() => {
                  markNeverShowTours();
                  setTutorialOpen(false);
                }}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/80"
              >
                Don&apos;t show again
              </button>
            </div>
            {hasNeverShowTours() ? (
              <p className="mt-3 text-center text-[11px] text-white/35">Tours are currently disabled.</p>
            ) : null}
          </div>
        </div>
      ) : null}

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
