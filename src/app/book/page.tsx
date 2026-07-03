import type { Metadata } from "next";

import FounderSessionBooking from "@/components/book/FounderSessionBooking";
import HeroVideoBackground from "@/components/home/HeroVideoBackground";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Book a Founder Session",
  description:
    "Schedule a complimentary 30-minute founder session with Unit311 Central. Choose a weekday slot and receive your video meeting link by email.",
  path: "/book",
});

export default function BookPage() {
  return (
    <section className="relative overflow-x-hidden bg-[#020617]">
      <HeroVideoBackground />

      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        aria-hidden
        style={{
          background:
            "linear-gradient(to right, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.38) 42%, rgba(0, 0, 0, 0.12) 68%, transparent 82%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1100px] px-5 pb-20 pt-24 sm:px-8 sm:pb-24 sm:pt-[104px] lg:px-10 lg:pb-28 lg:pt-[120px]">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#93c5fd]">
            Unit311 Central
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Book a Complimentary Founder Session
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
            Pick a 30-minute slot, Monday to Friday, 9:00–18:00 UK time. We&apos;ll confirm by email and
            share your private video session link.
          </p>
        </div>

        <div className="mt-10">
          <FounderSessionBooking />
        </div>
      </div>
    </section>
  );
}
