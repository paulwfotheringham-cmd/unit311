import Link from "next/link";
import { KeyRound, Lock, Server, ShieldCheck, Users } from "lucide-react";

import MarketingPageShell from "@/components/layout/MarketingPageShell";
import {
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingCard,
  marketingCardLarge,
  marketingEyebrow,
  marketingFadeIn,
  marketingPageIntro,
  marketingPageTitle,
  marketingSectionTitle,
  MARKETING_CONTENT_CLASS,
} from "@/lib/marketing-ui";

const SECURITY_PILLARS = [
  {
    icon: Lock,
    title: "Encrypted in transit",
    description:
      "Platform traffic is served over HTTPS with modern TLS. Sensitive workflows and authentication use industry-standard encryption between your team and Unit311 Central.",
  },
  {
    icon: Users,
    title: "Role-based access",
    description:
      "Permissions are scoped by role, organisation, and module. Teams see only the data and actions relevant to their responsibilities.",
  },
  {
    icon: Server,
    title: "Isolated workspaces",
    description:
      "Each customer organisation operates in a dedicated workspace context, keeping client data separated from other tenants on the platform.",
  },
  {
    icon: KeyRound,
    title: "Account protection",
    description:
      "Credential policies, verification flows, and session handling are designed to reduce unauthorised access and support secure day-to-day use.",
  },
  {
    icon: ShieldCheck,
    title: "Operational governance",
    description:
      "Audit-friendly activity, structured file storage, and controlled messaging channels support governance expectations for growing businesses.",
  },
] as const;

export default function SecurityPageContent() {
  return (
    <MarketingPageShell
      contentClassName={`${MARKETING_CONTENT_CLASS} space-y-14 sm:space-y-16 lg:space-y-20`}
    >
      <div className={`max-w-3xl ${marketingFadeIn}`}>
        <p className={marketingEyebrow}>Unit311 Central</p>
        <h1 className={`mt-4 ${marketingPageTitle}`}>Platform security</h1>
        <p className={marketingPageIntro}>
          Unit311 Central is built for operators who need a secure, dependable workspace across CRM,
          finance, projects, files, and executive intelligence. Security is part of the platform
          architecture — not an afterthought.
        </p>
      </div>

      <div>
        <div className="max-w-2xl">
          <p className={marketingEyebrow}>Principles</p>
          <h2 className={`mt-4 ${marketingSectionTitle}`}>How we protect your workspace</h2>
        </div>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-white/70 sm:text-[17px]">
          We combine infrastructure best practices with application-level controls so your team can
          collaborate confidently while leadership retains visibility and governance.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {SECURITY_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article key={pillar.title} className={`${marketingCard} p-6`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[#93c5fd]">
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">{pillar.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-white/72">{pillar.description}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className={`${marketingCardLarge} space-y-6 px-6 py-8 sm:px-10 sm:py-10 ${marketingFadeIn}`}>
        <h2 className={marketingSectionTitle}>Shared responsibility</h2>
        <p className="max-w-3xl text-[15px] leading-relaxed text-white/72 sm:text-[17px]">
          Platform security works best when paired with strong account hygiene on your side — unique
          passwords, timely offboarding, and clear internal access policies. Our team supports
          onboarding and can advise on practical controls for your organisation.
        </p>
        <p className="max-w-3xl text-[15px] leading-relaxed text-white/72 sm:text-[17px]">
          For security enquiries, contractual documentation, or data handling questions, contact us
          directly. Formal security documentation will be expanded as part of enterprise onboarding.
        </p>
      </div>

      <div
        className={`${marketingCardLarge} px-6 py-10 text-center sm:px-10 ${marketingFadeIn}`}
        style={{ animationDelay: "120ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Ready to see the platform?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-[17px]">
          Book a complimentary founder session or create your workspace to explore Unit311 Central
          with your team.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/book" className={marketingBtnPrimary}>
            Book a session
          </Link>
          <Link href="/signup" className={marketingBtnSecondary}>
            Get started
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
