import Image from "next/image";
import Link from "next/link";

import AboutWorkspaceShowcase from "@/components/about/AboutWorkspaceShowcase";
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
import { SITE_DESCRIPTION } from "@/lib/site";

const TEAM_MEMBERS = [
  {
    name: "Paul Fotheringham",
    title: "CEO",
    photo: "/images/people/paul.jpg",
    highlights: [
      "Seasoned 25+ technologist",
      "Worked for large corporates and built SMEs with significant funding",
    ],
  },
  {
    name: "Dr. Ashley Pursglove",
    title: "Chief Technology Officer",
    photo: "/images/people/ashley.jpg",
    highlights: ["PhDs in multiple disciplines", "Expert in AI agents and LLMs"],
  },
  {
    name: "Paul Ormandy",
    title: "Head of Digital Management",
    photo: "/images/people/paulo.jpg",
    highlights: ["30 years experience in app building, UI/UX, and digital marketing"],
  },
  {
    name: "Hannes Hampus",
    title: "Head of Data",
    photo: "/images/people/hannes.jpg",
    highlights: [
      "20 years experience in large corporates building out big data infrastructure and analysis",
    ],
  },
  {
    name: "Stefan Siraov",
    title: "Head of Engineering",
    photo: "/images/people/stefan.jpg",
    highlights: ["Former European Space Agency", "Expert in AI"],
  },
  {
    name: "Stephen Saffin",
    title: "CFO, Legal and COO",
    photo: "/images/people/saffin.jpg",
    highlights: ["Lawyer", "20 years running successful SMEs"],
  },
] as const;

export default function AboutPageContent() {
  return (
    <MarketingPageShell
      contentClassName={`${MARKETING_CONTENT_CLASS} space-y-12 sm:space-y-16`}
    >
      <div className={`max-w-3xl ${marketingFadeIn}`}>
        <p className={marketingEyebrow}>Unit311 Central</p>
        <h1 className={`mt-4 ${marketingPageTitle}`}>About</h1>
        <p className={marketingPageIntro}>{SITE_DESCRIPTION}</p>
        <Link href="/signup" className={`mt-8 ${marketingBtnPrimary}`}>
          Get started
        </Link>
      </div>

      <div className={marketingFadeIn} style={{ animationDelay: "60ms" }}>
        <AboutWorkspaceShowcase />
      </div>

      <div className={marketingFadeIn} style={{ animationDelay: "100ms" }}>
        <div className="max-w-2xl">
          <p className={marketingEyebrow}>Leadership</p>
          <h2 className={`mt-4 ${marketingSectionTitle}`}>The team</h2>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-white/70 sm:text-[17px]">
          Unit311 is built by operators, technologists, and product leaders with deep experience
          across enterprise software, AI, data, and growing SMEs.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {TEAM_MEMBERS.map((member) => (
            <article key={member.name} className={`${marketingCard} p-6`}>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/15">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                  <p className="text-sm font-medium text-[#93c5fd]">{member.title}</p>
                </div>
              </div>
              <ul className="mt-5 space-y-2 text-[14px] leading-relaxed text-white/72">
                {member.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#60a5fa]"
                    />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div
        className={`${marketingCardLarge} px-6 py-8 text-center sm:px-10 sm:py-10 ${marketingFadeIn}`}
        style={{ animationDelay: "140ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Ready to accelerate your business?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-[17px]">
          Create your workspace or tell us about your launch timeline.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className={marketingBtnPrimary}>
            Get started
          </Link>
          <Link href="/contact" className={marketingBtnSecondary}>
            Contact us
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
