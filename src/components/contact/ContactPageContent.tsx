import Image from "next/image";
import Link from "next/link";

import ContactForm from "@/components/ui/ContactForm";
import type { ReactNode } from "react";

const CONTACT_BACKGROUND = "/images/hero-survey-background.png";

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
    <section className="relative min-h-screen overflow-x-hidden bg-[#020617]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src={CONTACT_BACKGROUND}
          alt=""
          fill
          priority
          className="object-cover object-center opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#020617]/82" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(2, 6, 23, 0.5) 0%, rgba(2, 6, 23, 0.88) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] px-5 pb-20 pt-24 sm:px-8 sm:pb-24 sm:pt-[104px] lg:px-10 lg:pb-28 lg:pt-[120px]">
        <SectionTitle>Get in Touch</SectionTitle>

        <p className="mt-5 text-center text-[15px] leading-relaxed text-white/65 sm:text-[17px]">
          Tell us about your business idea, launch timeline, and what you need from the Unit311 workspace.
        </p>

        <div className="mx-auto mt-12 w-full max-w-xl rounded-2xl border border-white/10 bg-[#07111f]/75 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-8">
          <ContactForm variant="marketing" />
        </div>
      </div>
    </section>
  );
}
