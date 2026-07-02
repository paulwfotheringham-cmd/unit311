import HeroVideoBackground from "@/components/home/HeroVideoBackground";
import ContactForm from "@/components/ui/ContactForm";
import type { ReactNode } from "react";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      <span className="h-px w-[80px] bg-[#3b82f6] sm:w-[140px]" aria-hidden />
      <p className="whitespace-nowrap text-[22px] font-semibold uppercase tracking-[0.18em] text-[#3b82f6]">
        {children}
      </p>
      <span className="h-px w-[80px] bg-[#3b82f6] sm:w-[140px]" aria-hidden />
    </div>
  );
}

export default function ContactPageContent() {
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

      <div className="relative z-10 mx-auto max-w-[1400px] px-5 pb-20 pt-24 sm:px-8 sm:pb-24 sm:pt-[104px] lg:px-10 lg:pb-28 lg:pt-[120px]">
        <SectionTitle>Get in Touch</SectionTitle>

        <p className="mt-5 text-center text-[15px] leading-relaxed text-white/65 sm:text-[17px]">
          Tell us about your business idea, launch timeline, and what you need from the Unit311 workspace.
        </p>

        <div className="mx-auto mt-12 w-full max-w-xl">
          <ContactForm variant="marketing" />
        </div>
      </div>
    </section>
  );
}
