import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

const ONBOARDING_STEPS = [
  {
    step: 1,
    title: "Complimentary Founder Session",
    description:
      "30-minute discovery call to understand your business, demonstrate Unit311 and determine if we're a good fit.",
  },
  {
    step: 2,
    title: "Business Systems Review",
    description:
      "We prepare a personalised report showing your current technology stack, opportunities for improvement and how Unit311 could be configured.",
  },
  {
    step: 3,
    title: "Proposal & Agreement",
    description:
      "Review the proposal together. If you decide to proceed, we'll issue your agreement and first invoice.",
  },
  {
    step: 4,
    title: "Configuration",
    description:
      "Your workspace is configured using our standard deployment process. Additional bespoke work is available as a professional service.",
  },
  {
    step: 5,
    title: "Go Live",
    description:
      "Your team receives access, onboarding guidance and begins using Unit311.",
  },
  {
    step: 6,
    title: "Review & Growth",
    description:
      "After approximately one month we'll review usage, answer questions and recommend improvements.",
  },
] as const;

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      <span className="h-px w-[80px] bg-[#3b82f6] sm:w-[140px]" aria-hidden />
      <p className="text-center text-[22px] font-semibold uppercase tracking-[0.18em] text-[#3b82f6]">
        {children}
      </p>
      <span className="h-px w-[80px] bg-[#3b82f6] sm:w-[140px]" aria-hidden />
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <article className="flex h-full min-w-0 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-colors hover:border-[#3b82f6]/30 hover:bg-white/[0.06] sm:p-6">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#3b82f6]/40 bg-[#2563eb]/20 text-sm font-bold text-[#93c5fd]">
        {step}
      </span>
      <h3 className="mt-4 text-[15px] font-semibold leading-snug text-white sm:text-[16px]">
        {title}
      </h3>
      <p className="mt-3 flex-1 text-[13px] leading-relaxed text-white/55 sm:text-[14px]">
        {description}
      </p>
    </article>
  );
}

function StepConnector() {
  return (
    <div
      className="hidden shrink-0 items-center justify-center self-center px-1 2xl:flex"
      aria-hidden
    >
      <ChevronRight className="h-5 w-5 text-[#3b82f6]/50" strokeWidth={2} />
    </div>
  );
}

export default function HowUnit311Works() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-28 overflow-hidden bg-[#030712] py-16 sm:py-20 lg:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(37,99,235,0.12), transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-[1760px] px-5 sm:px-8 lg:px-10">
        <SectionTitle>How Unit311 Works</SectionTitle>

        <p className="mx-auto mt-5 max-w-3xl text-center text-[15px] leading-relaxed text-white/60 sm:text-[17px]">
          A simple onboarding process designed for growing businesses. We believe technology should
          be tailored to your business—not the other way around.
        </p>

        <div className="mt-12 hidden items-stretch 2xl:flex">
          {ONBOARDING_STEPS.map((item, index) => (
            <Fragment key={item.step}>
              {index > 0 ? <StepConnector /> : null}
              <div className="min-w-0 flex-1">
                <StepCard step={item.step} title={item.title} description={item.description} />
              </div>
            </Fragment>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:hidden">
          {ONBOARDING_STEPS.map((item) => (
            <StepCard
              key={item.step}
              step={item.step}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-white/45">
          <Link href="/book" className="font-medium text-[#93c5fd] transition-colors hover:text-[#bfdbfe]">
            Book a founder session
          </Link>
          <span className="text-white/30"> · </span>
          or view pricing below.
        </p>
      </div>
    </section>
  );
}
