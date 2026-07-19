import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  FileCheck2,
  Rocket,
  Settings2,
} from "lucide-react";
import HomeSectionTitle from "./HomeSectionTitle";

const ONBOARDING_STEPS = [
  {
    step: 1,
    title: "Complimentary Founder Session",
    description:
      "30-minute discovery call to understand your business, demonstrate Unit311 and determine if we're a good fit.",
    icon: CalendarDays,
    accent: "#60a5fa",
    phase: "Discover",
  },
  {
    step: 2,
    title: "Business Systems Review",
    description:
      "We prepare a personalised report showing your current technology stack, opportunities for improvement and how Unit311 could be configured.",
    icon: BarChart3,
    accent: "#3b82f6",
    phase: "Discover",
  },
  {
    step: 3,
    title: "Proposal & Agreement",
    description:
      "Review the proposal together. If you decide to proceed, we'll issue your agreement and first invoice.",
    icon: FileCheck2,
    accent: "#2563eb",
    phase: "Commit",
  },
  {
    step: 4,
    title: "Configuration",
    description:
      "Your workspace is configured using our standard deployment process. Additional bespoke work is available as a professional service.",
    icon: Settings2,
    accent: "#1d4ed8",
    phase: "Build",
  },
  {
    step: 5,
    title: "Go Live",
    description:
      "Your team receives access, onboarding guidance and begins using Unit311.",
    icon: Rocket,
    accent: "#06b6d4",
    phase: "Launch",
  },
  {
    step: 6,
    title: "Review & Growth",
    description:
      "After approximately one month we'll review usage, answer questions and recommend improvements.",
    icon: ArrowRight,
    accent: "#818cf8",
    phase: "Grow",
  },
] as const;

type Step = (typeof ONBOARDING_STEPS)[number];

function StepCard({ step, title, description, icon: Icon, accent, phase }: Step) {
  return (
    <article
      className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a1220]/80 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_24px_64px_rgba(0,0,0,0.45)] sm:p-6"
      style={
        {
          "--step-accent": accent,
        } as CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-90 transition-opacity group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35"
        style={{ backgroundColor: accent }}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
          style={{
            background: `linear-gradient(135deg, ${accent}33, ${accent}14)`,
            boxShadow: `0 8px 24px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.12)`,
          }}
        >
          <Icon className="h-5 w-5" style={{ color: accent }} strokeWidth={2} />
        </div>

        <span
          className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums text-white"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow: `0 4px 16px ${accent}44`,
          }}
        >
          {step}
        </span>
      </div>

      <p
        className="relative mt-4 text-[10px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: `${accent}cc` }}
      >
        {phase}
      </p>

      <h3 className="relative mt-2 text-[15px] font-semibold leading-snug text-white sm:text-[16px]">
        {title}
      </h3>
      <p className="relative mt-3 flex-1 text-[13px] leading-relaxed text-white/55 sm:text-[14px]">
        {description}
      </p>
    </article>
  );
}

function DesktopTimeline() {
  return (
    <div className="relative mt-14 hidden 2xl:block">
      <div
        className="pointer-events-none absolute left-[8%] right-[8%] top-[52px] h-px"
        aria-hidden
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(59,130,246,0.15) 8%, rgba(59,130,246,0.55) 50%, rgba(59,130,246,0.15) 92%, transparent)",
        }}
      />

      <div className="relative flex items-stretch gap-3">
        {ONBOARDING_STEPS.map((item, index) => (
          <Fragment key={item.step}>
            <div className="relative min-w-0 flex-1">
              <div
                className="pointer-events-none absolute left-1/2 top-[48px] z-10 flex h-3 w-3 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#030712]"
                style={{
                  backgroundColor: item.accent,
                  boxShadow: `0 0 0 4px ${item.accent}33, 0 0 20px ${item.accent}66`,
                }}
                aria-hidden
              />
              <div className="pt-8">
                <StepCard {...item} />
              </div>
            </div>

            {index < ONBOARDING_STEPS.length - 1 ? (
              <div className="flex w-5 shrink-0 items-center justify-center self-center pt-8" aria-hidden>
                <ArrowRight className="h-4 w-4 text-[#3b82f6]/40" strokeWidth={2} />
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function MobileTimeline() {
  return (
    <div className="relative mt-12 2xl:hidden">
      <div
        className="pointer-events-none absolute bottom-4 left-[22px] top-4 w-px sm:left-[26px]"
        aria-hidden
        style={{
          background:
            "linear-gradient(180deg, rgba(59,130,246,0.15), rgba(59,130,246,0.55) 50%, rgba(59,130,246,0.15))",
        }}
      />

      <div className="space-y-5">
        {ONBOARDING_STEPS.map((item) => (
          <div key={item.step} className="relative pl-14 sm:pl-16">
            <div
              className="absolute left-3 top-8 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#030712] sm:left-4"
              style={{
                backgroundColor: item.accent,
                boxShadow: `0 0 0 4px ${item.accent}33, 0 0 16px ${item.accent}55`,
              }}
              aria-hidden
            />
            <StepCard {...item} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HowUnit311Works() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 overflow-x-hidden bg-[#030712] py-14 sm:scroll-mt-28 sm:py-20 lg:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(37,99,235,0.14), transparent 65%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(6,182,212,0.08), transparent 60%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-[1760px] px-4 sm:px-8 lg:px-10">
        <HomeSectionTitle>How Unit311 Works</HomeSectionTitle>

        <p className="mx-auto mt-4 max-w-3xl text-balance text-center text-sm leading-relaxed text-white/60 sm:mt-5 sm:text-[15px] md:text-[17px]">
          A simple onboarding process designed for growing businesses. We believe technology should
          be tailored to your business - not the other way around.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:mt-8 sm:gap-3">
          {(["Discover", "Commit", "Build", "Launch", "Grow"] as const).map((label, index) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: ["#60a5fa", "#2563eb", "#1d4ed8", "#06b6d4", "#818cf8"][index],
                }}
              />
              {label}
            </span>
          ))}
        </div>

        <DesktopTimeline />
        <MobileTimeline />

        <div className="mt-10 flex flex-col items-stretch gap-3 text-center text-sm text-white/45 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
          <Link
            href="/book"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-[#0b2d63] shadow-[0_8px_24px_rgba(255,255,255,0.12)] transition-colors hover:bg-white/95 sm:w-auto"
          >
            Book a founder session
          </Link>
          <span className="text-white/30">or view pricing below.</span>
        </div>
      </div>
    </section>
  );
}
