import Link from "next/link";
import { CalendarDays, Clock3, Mail } from "lucide-react";

import ContactForm from "@/components/ui/ContactForm";
import MarketingPageShell from "@/components/layout/MarketingPageShell";
import {
  marketingEyebrow,
  marketingFadeIn,
  marketingFormShell,
  marketingPageIntro,
  marketingPageTitle,
  MARKETING_CONTENT_CLASS,
} from "@/lib/marketing-ui";
import { CONTACT } from "@/lib/site";

const CONTACT_POINTS = [
  {
    icon: Mail,
    label: "Email",
    value: CONTACT.infoEmail,
    href: `mailto:${CONTACT.infoEmail}`,
  },
  {
    icon: Clock3,
    label: "Response time",
    value: "Within one business day",
  },
  {
    icon: CalendarDays,
    label: "Prefer a call?",
    value: "Book a complimentary founder session",
    href: "/book",
    variant: "cta" as const,
  },
] as const;

export default function ContactPageContent() {
  return (
    <MarketingPageShell contentClassName={MARKETING_CONTENT_CLASS}>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-14 xl:gap-16">
        <div className={`max-w-xl ${marketingFadeIn}`}>
          <p className={marketingEyebrow}>Unit311 Central</p>

          <h1 className={`mt-4 ${marketingPageTitle}`}>Get in touch</h1>

          <p className={marketingPageIntro}>
            Tell us about your business idea, launch timeline, and what you need from the Unit311
            workspace. We&apos;ll come back with a clear next step.
          </p>

          <ul className="mt-8 space-y-4">
            {CONTACT_POINTS.map((item) => {
              const Icon = item.icon;
              const isCta = "variant" in item && item.variant === "cta";
              const content = (
                <>
                  <span
                    className={
                      isCta
                        ? "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#0b2d63]/10 bg-[#eef5ff] text-[#0b2d63]"
                        : "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#93c5fd]"
                    }
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span>
                    <span
                      className={
                        isCta
                          ? "block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b2d63]/55"
                          : "block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45"
                      }
                    >
                      {item.label}
                    </span>
                    <span
                      className={
                        isCta
                          ? "mt-1 block text-sm font-semibold text-[#0b2d63]"
                          : "mt-1 block text-sm font-medium text-white/85"
                      }
                    >
                      {item.value}
                    </span>
                  </span>
                </>
              );

              return (
                <li key={item.label}>
                  {"href" in item && item.href ? (
                    <Link
                      href={item.href}
                      className={
                        isCta
                          ? "flex items-start gap-4 rounded-2xl border border-white/20 bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#f8fafc]"
                          : "flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-[#3b82f6]/30 hover:bg-white/[0.06]"
                      }
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className={`${marketingFormShell} ${marketingFadeIn}`} style={{ animationDelay: "80ms" }}>
          <ContactForm variant="marketing" embedded />
        </div>
      </div>
    </MarketingPageShell>
  );
}
