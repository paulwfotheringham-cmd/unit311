"use client";

import { useEffect, useRef, useState } from "react";

import {
  hasNeverShowTours,
  markNeverShowTours,
  markPageTourSeen,
} from "@/lib/ai-operating-assistant/guided-learning";
import { cn } from "@/lib/utils";

import { useOptionalGuidedLearning } from "./GuidedLearningProvider";

const AUTO_ADVANCE_MS = 5500;

function preferVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((voice) => /en-GB/i.test(voice.lang) && /female|samantha|emma|serena/i.test(voice.name)) ||
    voices.find((voice) => /en-GB/i.test(voice.lang)) ||
    voices.find((voice) => /en-US/i.test(voice.lang) && /female|samantha|jenny/i.test(voice.name)) ||
    voices.find((voice) => /^en/i.test(voice.lang)) ||
    null;
  return preferred;
}

function speak(text: string, enabled: boolean) {
  if (!enabled || typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.96;
  utterance.pitch = 1;
  const voice = preferVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

/**
 * Lightweight executive walkthrough — highlight only, no page blur or full-screen overlay.
 */
export default function GuidedLearningOverlay() {
  const guided = useOptionalGuidedLearning();
  const [voiceOn, setVoiceOn] = useState(false);
  const advanceRef = useRef<number | null>(null);

  const tourActive = Boolean(guided?.tourActive && guided.currentStep);
  const stepIndex = guided?.stepIndex ?? 0;
  const explanation = guided?.currentStep?.explanation ?? "";
  const label = guided?.currentStep?.label ?? "";

  useEffect(() => {
    if (!tourActive || !guided) return;
    speak(`${label}. ${explanation}`, voiceOn);
    if (advanceRef.current) window.clearTimeout(advanceRef.current);
    advanceRef.current = window.setTimeout(() => {
      guided.nextStep();
    }, AUTO_ADVANCE_MS);
    return () => {
      if (advanceRef.current) window.clearTimeout(advanceRef.current);
    };
  }, [tourActive, explanation, guided, label, stepIndex, voiceOn]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  if (!guided?.tourActive || !guided.currentStep) return null;

  const rect = guided.highlightRect;
  const pad = 4;
  const total = Math.max(guided.steps.length, 1);

  return (
    <>
      {rect ? (
        <div
          aria-hidden
          className="unit311-ai-spotlight pointer-events-none fixed z-[70] rounded-xl border border-sky-300/70"
          style={{
            top: Math.max(4, rect.top - pad),
            left: Math.max(4, rect.left - pad),
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
          }}
        />
      ) : null}

      <div className="pointer-events-none fixed top-[4.75rem] right-[max(1rem,env(safe-area-inset-right))] z-[71] w-[min(320px,calc(100vw-1.5rem))] sm:top-[5.25rem]">
        <div className="pointer-events-auto rounded-xl border border-white/12 bg-[#0b1524]/98 p-3.5 text-white shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300/85">
              Walkthrough · {guided.stepIndex + 1} of {total}
            </p>
            <label className="inline-flex items-center gap-1.5 text-[10px] text-white/45">
              <input
                type="checkbox"
                checked={voiceOn}
                onChange={(event) => setVoiceOn(event.target.checked)}
                className="h-3 w-3 rounded border-white/20 bg-transparent"
              />
              Voice
            </label>
          </div>
          <h3 className="mt-1.5 text-sm font-semibold tracking-tight">{guided.currentStep.label}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-white/65">
            {guided.currentStep.explanation}
          </p>
          {!rect ? (
            <p className="mt-2 text-[11px] text-white/40">
              This area isn’t marked yet — continuing with the explanation.
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                guided.prevStep();
              }}
              disabled={guided.stepIndex === 0}
              className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/65 hover:bg-white/[0.05] disabled:opacity-35"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                guided.nextStep();
              }}
              className="rounded-md border border-sky-400/35 bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-100"
            >
              {guided.stepIndex >= guided.steps.length - 1 ? "Done" : "Next"}
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                guided.skipTour();
              }}
              className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/45 hover:bg-white/[0.05]"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                markNeverShowTours();
                markPageTourSeen(guided.activeView);
                guided.skipTour();
              }}
              className="ml-auto rounded-md px-1.5 py-1 text-[10px] text-white/35 hover:text-white/55"
            >
              Never show again
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function GuidedLearningFirstVisitOffer({
  placement = "header",
}: {
  onOpenAssistant?: () => void;
  placement?: "header" | "legacy";
}) {
  const guided = useOptionalGuidedLearning();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!guided?.firstVisitOffer) return null;
  if (hasNeverShowTours()) return null;

  return (
    <div
      className={cn(
        placement === "header"
          ? "flex w-full justify-end pb-2.5"
          : "safe-area-px pointer-events-none fixed top-[4.75rem] right-[max(1rem,env(safe-area-inset-right))] z-[56] w-[min(300px,calc(100vw-1.5rem))] sm:top-[5.25rem]",
      )}
    >
      <div
        className={cn(
          "rounded-xl border border-white/12 bg-[#0b1524]/95 p-3 text-white",
          placement === "header" ? "w-full max-w-[280px]" : "pointer-events-auto shadow-lg",
        )}
      >
        <p className="text-sm font-semibold tracking-tight">30-second tour?</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/55">
          A short walkthrough of {guided.firstVisitOffer.pageName}.
        </p>
        <label className="mt-2.5 flex items-center gap-2 text-[11px] text-white/45">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-transparent"
          />
          Don&apos;t show again
        </label>
        <div className="mt-2.5 flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (dontShowAgain) markNeverShowTours();
              guided.acceptFirstVisitTour();
            }}
            className="rounded-md border border-sky-400/35 bg-sky-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-sky-100"
          >
            Start tour
          </button>
          <button
            type="button"
            onClick={() => {
              if (dontShowAgain) {
                markNeverShowTours();
                markPageTourSeen(guided.firstVisitOffer!.viewId);
              }
              guided.dismissFirstVisitTour();
            }}
            className="rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-white/55"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
