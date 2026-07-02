import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import GeospatialDashboard from "./GeospatialDashboard";

const CONSTRUCTION_BG = "/images/construction-bg.jpg";

const OFFERS = [
  {
    title: "Company Setup & Compliance",
    tagline: "Register. Structure. Comply.",
    href: "/contact",
    bullets: [
      "Entity formation & governance",
      "Regulatory onboarding",
      "Policy & documentation packs",
      "Operator certification support",
    ],
  },
  {
    title: "Operations & Delivery",
    tagline: "Plan. Execute. Deliver.",
    href: "/internaldashboard",
    bullets: [
      "Projects & client workspaces",
      "Files, CRM & messaging",
      "Logistics & office locations",
      "Support & ticketing",
    ],
  },
  {
    title: "Finance & Growth",
    tagline: "Track. Report. Scale.",
    href: "/contact",
    bullets: [
      "Expenses & financial controls",
      "Executive reporting",
      "Strategy & pipeline tracking",
      "Stakeholder-ready dashboards",
    ],
  },
] as const;

function ServiceIcon({ index }: { index: number }) {
  const cls = "h-[30px] w-[30px] stroke-white sm:h-[32px] sm:w-[32px]";
  if (index === 0) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}>
        <path d="M3 6l6-3 6 3v12l-6 3-6-3V6z" />
        <path d="M9 3v18M15 6v12" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}>
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={cls}>
      <path d="M4 7h3l2-3h6l2 3h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function SectionTitle({
  children,
  centered = false,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 sm:gap-6 ${centered ? "justify-center" : ""}`}
    >
      <span
        className={`h-px bg-[#3b82f6] ${centered ? "w-[80px] sm:w-[140px]" : "w-12 sm:w-20"}`}
        aria-hidden
      />
      <p className="text-[22px] font-semibold uppercase tracking-[0.18em] text-[#3b82f6]">
        {children}
      </p>
      <span
        className={`h-px bg-[#3b82f6] ${centered ? "w-[80px] sm:w-[140px]" : "w-12 sm:w-20"}`}
        aria-hidden
      />
    </div>
  );
}

export default function HomeOfferPlatform() {
  return (
    <section id="services" className="relative scroll-mt-28 overflow-x-hidden bg-[#050816] py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-0" aria-hidden>
        <Image
          src={CONSTRUCTION_BG}
          alt=""
          fill
          className="object-cover object-center grayscale"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#050816]/84" />
      </div>

      <div className="relative mx-auto max-w-[1760px] px-5 sm:px-8 lg:px-10">
        <SectionTitle centered>Everything to launch</SectionTitle>

        <div className="mx-auto mt-10 grid w-full max-w-[1150px] grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-5 lg:max-w-[1225px] lg:gap-6">
          {OFFERS.map((item, i) => (
            <div
              key={item.title}
              className="mx-auto flex w-full max-w-[375px] min-h-[360px] flex-col rounded-xl bg-white px-5 py-6 text-center shadow-[0_4px_24px_rgba(11,45,99,0.12)] sm:min-h-[380px] sm:px-6 sm:py-7"
            >
              <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2563eb] sm:h-14 sm:w-14">
                <ServiceIcon index={i} />
              </div>
              <h3 className="mt-4 text-[17px] font-bold leading-snug text-[#1a2b4a] sm:text-[18px]">
                {item.title}
              </h3>
              <Link
                href={item.href}
                className="mt-2.5 inline-block text-[15px] font-semibold leading-snug text-[#2563eb] sm:text-[16px]"
              >
                {item.tagline}
              </Link>
              <ul className="mt-4 flex-1 space-y-2.5">
                {item.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start justify-center gap-2 text-[15px] leading-snug text-[#1a2b4a]/75 sm:text-[16px]"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#2563eb]"
                      aria-hidden
                    >
                      <path
                        d="M3 8.5l3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div id="platform" className="mt-16 scroll-mt-28 sm:mt-20 lg:mt-24">
          <SectionTitle centered>Unit311 Workspace</SectionTitle>

          <div className="mt-10 w-full">
            <p className="mx-auto mb-4 max-w-2xl text-center text-sm text-white/50">
              Hover any panel to explore the centralised workspace — projects, finance, files, logistics, and client delivery in one place.
            </p>
            <GeospatialDashboard className="w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
