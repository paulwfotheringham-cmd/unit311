import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "lucide-react";

const PLAN_FEATURES = [
  "Complete Unit311 Central solution",
  "Up to 25 users (additional costs applied for more users)",
  "Email and chat support",
  "Additional customization can be offered (charges will apply)",
] as const;

const PROFESSIONAL_SERVICES = [
  "Bespoke development",
  "Custom integrations",
  "Marketing",
  "SEO",
  "PPC",
  "Pitch decks",
  "PowerPoint presentations",
  "Business consulting",
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

export default function HomePricing() {
  return (
    <section
      id="pricing"
      className="relative scroll-mt-28 overflow-hidden bg-[#050816] py-16 sm:py-20 lg:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 100%, rgba(37,99,235,0.1), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[1760px] px-5 sm:px-8 lg:px-10">
        <SectionTitle>Simple, Transparent Pricing</SectionTitle>

        <div className="mx-auto mt-12 max-w-lg">
          <article className="overflow-hidden rounded-2xl border border-[#3b82f6]/25 bg-gradient-to-b from-white/[0.07] to-white/[0.03] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
            <div className="border-b border-white/10 px-6 py-8 text-center sm:px-8 sm:py-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#93c5fd]">
                Unit311 Professional
              </p>
              <p className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                US$995
                <span className="text-lg font-semibold text-white/50 sm:text-xl">/month</span>
              </p>
              <p className="mt-3 text-sm font-medium text-white/70">Billed quarterly</p>
              <p className="mt-1 text-sm text-white/45">US$2,985 every 3 months</p>
              <p className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-white/55">
                Initial commitment: <span className="ml-1 font-semibold text-white/80">3 months</span>
              </p>
            </div>

            <ul className="space-y-3 px-6 py-8 sm:px-8">
              {PLAN_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-white/75">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3b82f6]" strokeWidth={2.5} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="border-t border-white/10 px-6 py-8 sm:px-8">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/80">
                Professional Services
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/50">
                Additional services are available where required and quoted separately.
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {PROFESSIONAL_SERVICES.map((service) => (
                  <li key={service} className="flex items-center gap-2 text-sm text-white/65">
                    <span className="text-[#3b82f6]" aria-hidden>
                      •
                    </span>
                    {service}
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <div className="mt-10 text-center">
            <Link
              href="/book"
              className="inline-flex h-12 w-full max-w-md items-center justify-center rounded-xl bg-[#2563eb] px-8 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] transition-colors hover:bg-[#1d4ed8] sm:w-auto"
            >
              Book a Complimentary Founder Session
            </Link>
            <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-white/40">
              No obligation. We&apos;ll help determine whether Unit311 is the right fit for your
              business before you make any commitment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
