"use client";

import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";

import { cn } from "@/lib/utils";

const METRIC_DURATION_MS = 5000;
const PAUSE_END_MS = 2500;
const BEFORE_HOLD_MS = 1500;
const TRANSITION_MS = 2000;

const ANNUAL_STACK_COST = 22_513;

type KpiMetric = {
  id: string;
  label: string;
  beforeNumber?: number;
  beforeSuffix: string;
  afterText: string;
  countDown?: boolean;
};

const KPI_METRICS: KpiMetric[] = [
  {
    id: "products",
    label: "Software Products",
    beforeNumber: 15,
    beforeSuffix: " Software Products",
    afterText: "1 Platform",
    countDown: true,
  },
  {
    id: "logins",
    label: "Logins",
    beforeNumber: 12,
    beforeSuffix: " Logins",
    afterText: "1 Login",
    countDown: true,
  },
  {
    id: "vendors",
    label: "Vendors",
    beforeNumber: 8,
    beforeSuffix: " Vendors",
    afterText: "1 Technology Partner",
    countDown: true,
  },
  {
    id: "integrations",
    label: "Integrations",
    beforeNumber: 7,
    beforeSuffix: " Integrations",
    afterText: "Built In",
    countDown: true,
  },
  {
    id: "cost",
    label: "Annual Technology Cost",
    beforeNumber: ANNUAL_STACK_COST,
    beforeSuffix: " Annual Technology Stack",
    afterText: "See Unit311 Central Pricing Below",
    countDown: true,
  },
];

type MetricPhase = "pending" | "before" | "transition" | "complete";

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function formatUsd(value: number) {
  return `US$${Math.max(0, Math.round(value)).toLocaleString("en-US")}`;
}

function getMetricPhase(cycleElapsedMs: number, index: number): MetricPhase {
  const local = cycleElapsedMs - index * METRIC_DURATION_MS;
  if (local < 0) return "pending";
  if (local < BEFORE_HOLD_MS) return "before";
  if (local < BEFORE_HOLD_MS + TRANSITION_MS) return "transition";
  return "complete";
}

function getTransitionProgress(cycleElapsedMs: number, index: number) {
  const local = cycleElapsedMs - index * METRIC_DURATION_MS - BEFORE_HOLD_MS;
  if (local <= 0) return 0;
  if (local >= TRANSITION_MS) return 1;
  return easeInOutCubic(local / TRANSITION_MS);
}

function beforeLabel(metric: KpiMetric, animatedNumber?: number) {
  if (metric.id === "cost") {
    const value = animatedNumber ?? metric.beforeNumber ?? 0;
    return `${formatUsd(value)}${metric.beforeSuffix}`;
  }
  const value = animatedNumber ?? metric.beforeNumber ?? 0;
  return `${value}${metric.beforeSuffix}`;
}

function KpiMetricRow({
  metric,
  phase,
  transitionProgress,
}: {
  metric: KpiMetric;
  phase: MetricPhase;
  transitionProgress: number;
}) {
  const startNumber = metric.beforeNumber ?? 0;
  const endNumber =
    metric.id === "integrations" || metric.id === "cost" ? 0 : 1;
  const animatedNumber =
    phase === "transition" && metric.countDown
      ? Math.round(startNumber + (endNumber - startNumber) * transitionProgress)
      : startNumber;

  const beforeOpacity =
    phase === "before" ? 1 : phase === "transition" ? Math.max(0, 1 - transitionProgress * 1.4) : 0;
  const arrowOpacity =
    phase === "before" ? 0 : phase === "transition" ? Math.min(1, transitionProgress * 1.6) : 0.55;
  const afterOpacity =
    phase === "complete"
      ? 1
      : phase === "transition"
        ? Math.min(1, Math.max(0, (transitionProgress - 0.15) * 1.5))
        : 0;

  if (phase === "complete") {
    return (
      <article className="business-case-kpi-row business-case-kpi-row-complete rounded-lg border border-emerald-500/20 bg-[#0b1524]/90 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
          {metric.label}
        </p>
        <p className="mt-1.5 text-sm font-semibold text-emerald-300 sm:text-[15px]">{metric.afterText}</p>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "business-case-kpi-row rounded-lg border border-white/10 bg-[#0b1524]/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        phase === "transition" && "border-sky-500/20",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
        {metric.label}
      </p>

      <div className="mt-2 min-h-[4.5rem]">
        <p
          className="text-sm font-medium tabular-nums text-white/75 transition-opacity duration-300 sm:text-[15px]"
          style={{ opacity: beforeOpacity }}
        >
          {beforeLabel(metric, animatedNumber)}
        </p>

        <div
          className="my-1.5 flex justify-center transition-opacity duration-300"
          style={{ opacity: arrowOpacity }}
          aria-hidden
        >
          <ArrowDown className="h-3.5 w-3.5 text-sky-400/80" strokeWidth={2} />
        </div>

        <p
          className="text-sm font-semibold text-emerald-300 transition-opacity duration-300 sm:text-[15px]"
          style={{ opacity: afterOpacity }}
        >
          {metric.afterText}
        </p>
      </div>
    </article>
  );
}

export default function HomeBusinessCasePlatformAnimation() {
  const [cycleElapsedMs, setCycleElapsedMs] = useState(0);

  const cycleDurationMs = KPI_METRICS.length * METRIC_DURATION_MS + PAUSE_END_MS;

  useEffect(() => {
    let raf = 0;
    let cycleStart = performance.now();

    const tick = (now: number) => {
      let elapsed = now - cycleStart;
      if (elapsed >= cycleDurationMs) {
        cycleStart = now;
        elapsed = 0;
      }
      setCycleElapsedMs(elapsed);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cycleDurationMs]);

  const visibleMetrics = KPI_METRICS.map((metric, index) => ({
    metric,
    index,
    phase: getMetricPhase(cycleElapsedMs, index),
    transitionProgress: getTransitionProgress(cycleElapsedMs, index),
  })).filter(({ phase }) => phase !== "pending");

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 sm:mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#93c5fd] sm:text-[13px]">
          Operational Simplification
        </h3>
        <p className="mt-2 text-[11px] leading-relaxed text-white/45 sm:text-xs">
          Measurable business impact before you reach pricing
        </p>
      </div>

      <div className="relative flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-xl border border-[#3b82f6]/20 bg-gradient-to-br from-[#0b1a33]/90 via-[#081222] to-[#061018] p-4 shadow-[0_24px_64px_rgba(37,99,235,0.1),inset_0_1px_0_rgba(255,255,255,0.05)] sm:min-h-[26rem] sm:p-5">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Executive Summary
          </p>
          <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-300/90">
            With Unit311 Central
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-2.5 sm:gap-3">
          {visibleMetrics.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-[#0b1524]/60 px-4 py-6 text-center text-sm text-white/45">
              Preparing metrics…
            </div>
          ) : (
            visibleMetrics.map(({ metric, phase, transitionProgress }) => (
              <KpiMetricRow
                key={metric.id}
                metric={metric}
                phase={phase}
                transitionProgress={transitionProgress}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
