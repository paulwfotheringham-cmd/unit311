import Link from "next/link";
import { Fragment } from "react";

const STEPS = [
  { label: "Data Capture", icon: "capture" },
  { label: "Secure Upload", icon: "upload" },
  { label: "Processing", icon: "process" },
  { label: "Analytics", icon: "analytics" },
  { label: "Your Portal", icon: "portal" },
  { label: "Actionable Insights", icon: "insights" },
] as const;

function StepIcon({ type }: { type: (typeof STEPS)[number]["icon"] }) {
  const cls = "h-[24px] w-[24px] stroke-white";
  switch (type) {
    case "capture":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M12 4l-2 4h4l-2-4zM6 10h12v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8z" />
          <circle cx="12" cy="14" r="2" />
        </svg>
      );
    case "upload":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M12 16V4M8 8l4-4 4 4" />
          <path d="M4 18a4 4 0 004 4h8a4 4 0 004-4" />
        </svg>
      );
    case "process":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M4 8h16M4 12h16M4 16h10" />
          <path d="M18 14l2 2-2 2" />
        </svg>
      );
    case "analytics":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
        </svg>
      );
    case "portal":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="M3 10h18M9 4v14" />
        </svg>
      );
    case "insights":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" />
        </svg>
      );
  }
}

export default function Workflow() {
  return (
    <section id="platform" className="workflow-bg relative overflow-hidden pb-[80px] pt-[80px]">
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-[50%] opacity-40"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at 100% 50%, rgba(37,99,235,0.25), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-[1280px] px-8">
        <div className="text-center">
          <h2 className="text-[34px] font-bold leading-tight tracking-[-0.01em] text-white">
            The Unit311 Workflow
          </h2>
          <p className="mt-[10px] text-[16px] text-white/55">
            From capture to actionable intelligence.
          </p>
        </div>

        <div className="mt-[56px] hidden items-start justify-between lg:flex">
          {STEPS.map((step, index) => (
            <Fragment key={step.label}>
              {index > 0 && (
                <span className="mt-[26px] shrink-0 text-[13px] text-white/35" aria-hidden>
                  →
                </span>
              )}
              <div className="flex w-[120px] shrink-0 flex-col items-center">
                <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-white/30">
                  <StepIcon type={step.icon} />
                </div>
                <p className="mt-[14px] text-center text-[13px] font-medium leading-[1.3] text-white">
                  {index + 1}. {step.label}
                </p>
              </div>
            </Fragment>
          ))}
        </div>

        <ol className="mt-[40px] flex flex-col items-center gap-6 lg:hidden">
          {STEPS.map((step, index) => (
            <li key={step.label} className="flex flex-col items-center">
              <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-white/30">
                <StepIcon type={step.icon} />
              </div>
              <p className="mt-[14px] text-center text-[13px] font-medium text-white">
                {index + 1}. {step.label}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-[48px] flex justify-center">
          <Link
            href="/contact"
            className="inline-flex h-[44px] items-center justify-center rounded-lg bg-[#e5e5e5] px-[32px] text-[14px] font-semibold text-[#0b2d63]"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}
