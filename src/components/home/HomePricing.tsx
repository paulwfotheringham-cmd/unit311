import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import HomeSectionTitle from "./HomeSectionTitle";
const MONTHLY_PRICE = 999;
const QUARTERLY_PRICE = MONTHLY_PRICE * 3;

const PLAN_FEATURES = [
  "Many modules including Client Management, CRM, Projects, Finance, HR, Assets, Messaging, Training and Logistics",
  "AI Executive Assistant and board pack / report automation",
  "Initial customization for your business",
  "Monthly allowance to ask for customization for any module",
  "Easy integration with your preferred applications if required",
  "Up to 15 users",
  "Seamless onboarding process",
  "High Touch High Care Support at all times",
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

function PricingCardShell({ children }: { children: ReactNode }) {  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#3b82f6]/25 bg-gradient-to-b from-white/[0.07] to-white/[0.03] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
      {children}
    </article>
  );
}

function PricingCardBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-1 flex-col px-5 py-7 sm:px-8 sm:py-10">{children}</div>
  );
}

function PricingCardAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div className="mt-auto pt-8">
      <Link
        href={href}
        className="flex h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-[#0b2d63] transition-colors hover:bg-[#f8fafc]"
      >
        {children}
      </Link>
    </div>
  );
}

export default function HomePricing() {
  return (
    <section
      id="pricing"
      className="relative scroll-mt-20 overflow-x-hidden bg-[#050816] pt-7 pb-12 sm:scroll-mt-28 sm:pt-12 sm:pb-20 lg:pt-14 lg:pb-24"
    >      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 100%, rgba(37,99,235,0.1), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[1760px] px-4 sm:px-8 lg:px-10">
        <HomeSectionTitle>Simple Transparent Pricing</HomeSectionTitle>

        <div className="mx-auto mt-8 grid max-w-6xl gap-4 sm:mt-12 lg:grid-cols-3 lg:gap-5">          <PricingCardShell>
            <PricingCardBody>
              <div className="text-left">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#93c5fd]">
                  What does it cost
                </h3>
                <p className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-[2.75rem]">
                  US${MONTHLY_PRICE}
                  <span className="text-lg font-semibold text-white/50 sm:text-xl"> / month</span>
                </p>
                <p className="mt-3 text-sm font-medium text-white/70">Billed quarterly</p>
                <p className="mt-1 text-sm text-white/45">
                  US${QUARTERLY_PRICE.toLocaleString("en-US")} every 3 months
                </p>
                <p className="mt-6 flex flex-wrap gap-x-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/55 sm:mt-6 sm:inline-flex sm:px-4 sm:text-xs">
                  Initial commitment: <span className="font-semibold text-white/80">3 months</span>
                </p>
              </div>
              <PricingCardAction href="/signup">Get started</PricingCardAction>
            </PricingCardBody>
          </PricingCardShell>

          <PricingCardShell>
            <PricingCardBody>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#93c5fd]">
                What is included
              </h3>
              <ul className="mt-6 space-y-3">
                {PLAN_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-white/75">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3b82f6]" strokeWidth={2.5} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </PricingCardBody>
          </PricingCardShell>

          <PricingCardShell>
            <PricingCardBody>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#93c5fd]">
                Professional Services
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/50">
                Additional services are available where required and quoted separately.
              </p>
              <ul className="mt-5 space-y-3">
                {PROFESSIONAL_SERVICES.map((service) => (
                  <li key={service} className="flex items-start gap-3 text-sm text-white/75">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3b82f6]" strokeWidth={2.5} />
                    <span>{service}</span>
                  </li>
                ))}
              </ul>
              <PricingCardAction href="/contact">Contact us</PricingCardAction>
            </PricingCardBody>
          </PricingCardShell>
        </div>

        <div className="mt-14 px-2 text-center sm:mt-20 sm:px-0">
          <Link
            href="/book"
            className="inline-flex min-h-14 w-full max-w-lg items-center justify-center rounded-xl bg-[#15803d] px-6 text-base font-semibold text-white shadow-[0_2px_12px_rgba(21,128,61,0.35)] transition-colors hover:bg-[#166534] sm:h-16 sm:w-auto sm:px-10 sm:text-lg"
          >
            Book a free demo and intro session
          </Link>
        </div>
      </div>
    </section>
  );
}
