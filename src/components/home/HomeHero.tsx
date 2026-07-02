import Link from "next/link";
import HeroVideoBackground from "./HeroVideoBackground";
import { SITE_DESCRIPTION, SITE_HERO_LINE, SITE_TAGLINE } from "@/lib/site";

export default function HomeHero() {
  return (
    <section className="relative min-h-[88vh] overflow-x-hidden bg-[#020617] sm:min-h-[92vh]">
      <HeroVideoBackground />

      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        aria-hidden
        style={{
          background:
            "linear-gradient(to right, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.45) 45%, rgba(0, 0, 0, 0.18) 70%, transparent 88%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-[1400px] items-end px-5 pb-20 pt-24 sm:min-h-[92vh] sm:px-8 sm:pb-24 sm:pt-[104px] lg:items-center lg:px-10 lg:pb-28 lg:pt-[120px]">
        <div className="relative max-w-[640px]">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-white/55 sm:text-sm">
            Unit311
          </p>

          <h1 className="text-[2rem] font-bold leading-[0.95] tracking-[-0.03em] text-white sm:text-[2.75rem] lg:text-[3.35rem] xl:text-[3.75rem]">
            <span className="mb-3 block sm:mb-4">START YOUR</span>
            <span className="block">BUSINESS</span>
          </h1>

          <p className="mb-6 mt-5 text-lg font-semibold tracking-tight text-[#3b82f6] sm:mb-8 sm:text-xl">
            {SITE_TAGLINE}
          </p>

          <p className="text-[15px] font-medium leading-[1.65] text-white/88 sm:text-[17px]">
            {SITE_HERO_LINE}
          </p>

          <p className="mt-4 max-w-[540px] text-base leading-[1.7] text-white/70 sm:text-[17px]">
            {SITE_DESCRIPTION}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-[#0b2d63] transition-colors hover:bg-white/90"
            >
              Get Started
            </Link>
            <Link
              href="/internaldashboard"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-6 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-white/[0.08]"
            >
              Open Workspace
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
