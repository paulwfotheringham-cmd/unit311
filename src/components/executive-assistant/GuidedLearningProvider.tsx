"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  buildStartTourAction,
  dispatchGuidedLearning,
  GUIDED_LEARNING_EVENT,
  hasNeverShowTours,
  hasSeenPageTour,
  markPageTourSeen,
  resolveTargetElement,
  type GuidedLearningClientAction,
} from "@/lib/ai-operating-assistant/guided-learning";
import { findPageTarget } from "@/lib/ai-operating-assistant/page-registry";

export type GuidedTourStep = {
  index: number;
  targetId: string;
  label: string;
  kind: string;
  explanation: string;
  relatedActions: string[];
};

type GuidedLearningContextValue = {
  activeView: string;
  tourActive: boolean;
  steps: GuidedTourStep[];
  stepIndex: number;
  currentStep: GuidedTourStep | null;
  highlightRect: DOMRect | null;
  firstVisitOffer: { viewId: string; pageName: string } | null;
  startTour: (viewId?: string) => void;
  highlightTarget: (targetId: string, explanation?: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  restartTour: () => void;
  acceptFirstVisitTour: () => void;
  dismissFirstVisitTour: () => void;
};

const GuidedLearningContext = createContext<GuidedLearningContextValue | null>(null);

export function GuidedLearningProvider({
  activeView,
  userId,
  children,
}: {
  activeView: string;
  userId?: string | null;
  children: ReactNode;
}) {
  const [tourActive, setTourActive] = useState(false);
  const [steps, setSteps] = useState<GuidedTourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [overrideExplanation, setOverrideExplanation] = useState<string | null>(null);
  const [firstVisitOffer, setFirstVisitOffer] = useState<{
    viewId: string;
    pageName: string;
  } | null>(null);

  const refreshHighlight = useCallback(
    (targetId: string) => {
      const guideTarget = findPageTarget(activeView, targetId);
      const { rect } = measureTargetWithSelector(targetId, guideTarget?.selector);
      setHighlightRect(rect);
    },
    [activeView],
  );

  const startTour = useCallback(
    (viewId?: string) => {
      const view = viewId ?? activeView;
      const action = buildStartTourAction(view);
      setSteps(action.steps);
      setStepIndex(0);
      setTourActive(true);
      setOverrideExplanation(null);
      markPageTourSeen(view, userId);
      setFirstVisitOffer(null);
      window.setTimeout(() => {
        const first = action.steps[0];
        if (first) refreshHighlight(first.targetId);
      }, 80);
    },
    [activeView, refreshHighlight, userId],
  );

  const highlightTarget = useCallback(
    (targetId: string, explanation?: string) => {
      const guideTarget = findPageTarget(activeView, targetId);
      if (!guideTarget && !resolveTargetElement(targetId)) return;
      setTourActive(true);
      setSteps([
        {
          index: 0,
          targetId,
          label: guideTarget?.label ?? targetId,
          kind: guideTarget?.kind ?? "panel",
          explanation: explanation ?? guideTarget?.explanation ?? "This control is part of the page.",
          relatedActions: guideTarget?.relatedActions ?? [],
        },
      ]);
      setStepIndex(0);
      setOverrideExplanation(explanation ?? null);
      window.setTimeout(() => refreshHighlight(targetId), 40);
    },
    [activeView, refreshHighlight],
  );

  const skipTour = useCallback(() => {
    setTourActive(false);
    setSteps([]);
    setStepIndex(0);
    setHighlightRect(null);
    setOverrideExplanation(null);
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex((current) => {
      const next = current + 1;
      if (next >= steps.length) {
        skipTour();
        return current;
      }
      const step = steps[next];
      if (step) window.setTimeout(() => refreshHighlight(step.targetId), 40);
      return next;
    });
  }, [refreshHighlight, skipTour, steps]);

  const prevStep = useCallback(() => {
    setStepIndex((current) => {
      const prev = Math.max(0, current - 1);
      const step = steps[prev];
      if (step) window.setTimeout(() => refreshHighlight(step.targetId), 40);
      return prev;
    });
  }, [refreshHighlight, steps]);

  const restartTour = useCallback(() => {
    startTour(activeView);
  }, [activeView, startTour]);

  const acceptFirstVisitTour = useCallback(() => {
    if (!firstVisitOffer) return;
    startTour(firstVisitOffer.viewId);
  }, [firstVisitOffer, startTour]);

  const dismissFirstVisitTour = useCallback(() => {
    if (firstVisitOffer) {
      markPageTourSeen(firstVisitOffer.viewId, userId);
    }
    setFirstVisitOffer(null);
  }, [firstVisitOffer, userId]);

  useEffect(() => {
    const onAction = (event: Event) => {
      const detail = (event as CustomEvent<GuidedLearningClientAction>).detail;
      if (!detail) return;
      if (detail.type === "start_tour") {
        setSteps(detail.steps);
        setStepIndex(0);
        setTourActive(true);
        setOverrideExplanation(null);
        markPageTourSeen(detail.viewId, userId);
        setFirstVisitOffer(null);
        window.setTimeout(() => {
          const first = detail.steps[0];
          if (first) refreshHighlight(first.targetId);
        }, 80);
      }
      if (detail.type === "highlight") {
        highlightTarget(detail.targetId, detail.explanation);
      }
      if (detail.type === "stop_tour") {
        skipTour();
      }
      if (detail.type === "offer_tour") {
        if (!hasNeverShowTours(userId) && !hasSeenPageTour(detail.viewId, userId)) {
          setFirstVisitOffer({ viewId: detail.viewId, pageName: detail.pageName });
        }
      }
    };

    window.addEventListener(GUIDED_LEARNING_EVENT, onAction as EventListener);
    return () => window.removeEventListener(GUIDED_LEARNING_EVENT, onAction as EventListener);
  }, [highlightTarget, refreshHighlight, skipTour, userId]);

  useEffect(() => {
    if (!activeView) return;
    // Do not auto-offer tours — users launch via the Tutorial header button.
    setFirstVisitOffer(null);
    // Stop in-progress tour when navigating modules
    setTourActive(false);
    setHighlightRect(null);
    setSteps([]);
    setStepIndex(0);
  }, [activeView, userId]);

  useEffect(() => {
    if (!tourActive) return;
    const onResize = () => {
      const step = steps[stepIndex];
      if (step) refreshHighlight(step.targetId);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [refreshHighlight, stepIndex, steps, tourActive]);

  const currentStep = useMemo(() => {
    const step = steps[stepIndex] ?? null;
    if (!step) return null;
    if (!overrideExplanation) return step;
    return { ...step, explanation: overrideExplanation };
  }, [overrideExplanation, stepIndex, steps]);

  const value = useMemo<GuidedLearningContextValue>(
    () => ({
      activeView,
      tourActive,
      steps,
      stepIndex,
      currentStep,
      highlightRect,
      firstVisitOffer,
      startTour,
      highlightTarget,
      nextStep,
      prevStep,
      skipTour,
      restartTour,
      acceptFirstVisitTour,
      dismissFirstVisitTour,
    }),
    [
      acceptFirstVisitTour,
      activeView,
      currentStep,
      dismissFirstVisitTour,
      firstVisitOffer,
      highlightRect,
      highlightTarget,
      nextStep,
      prevStep,
      restartTour,
      skipTour,
      startTour,
      stepIndex,
      steps,
      tourActive,
    ],
  );

  return (
    <GuidedLearningContext.Provider value={value}>{children}</GuidedLearningContext.Provider>
  );
}

function measureTargetWithSelector(targetId: string, selector?: string) {
  const el = resolveTargetElement(targetId, selector);
  if (!el) return { el: null, rect: null as DOMRect | null };
  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  return { el, rect: el.getBoundingClientRect() };
}

export function useGuidedLearning() {
  const ctx = useContext(GuidedLearningContext);
  if (!ctx) {
    throw new Error("useGuidedLearning must be used within GuidedLearningProvider");
  }
  return ctx;
}

export function useOptionalGuidedLearning() {
  return useContext(GuidedLearningContext);
}

/** Convenience for panels that want to trigger a tour without importing dispatch helpers. */
export function requestShowMeAround(viewId: string) {
  dispatchGuidedLearning(buildStartTourAction(viewId));
}
