import HomeSectionTitle from "./HomeSectionTitle";

const INDUSTRIES = [
  { label: "Founders & Startups", icon: "building" },
  { label: "MedTech", icon: "medtech" },
  { label: "Space & Aerospace", icon: "space" },
  { label: "Professional Services", icon: "megaphone" },
  { label: "Construction & Infrastructure", icon: "bridge" },
  { label: "Logistics & Trade", icon: "ship" },
  { label: "Technology Ventures", icon: "bolt" },
  { label: "Creative Agencies", icon: "camera" },
  { label: "Manufacturing", icon: "factory" },
  { label: "Energy & Utilities", icon: "bolt" },
  { label: "Retail & Hospitality", icon: "trophy" },
  { label: "International Expansion", icon: "anchor" },
] as const;

function IndustryIcon({ type }: { type: (typeof INDUSTRIES)[number]["icon"] }) {
  const cls = "h-10 w-10 stroke-white sm:h-12 sm:w-12 md:h-[48px] md:w-[48px] lg:h-[52px] lg:w-[52px]";
  switch (type) {
    case "building":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
        </svg>
      );
    case "medtech":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M12 5v14M5 12h14" />
          <rect x="4" y="4" width="16" height="16" rx="3" />
        </svg>
      );
    case "space":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M4.5 16.5c3-6 8.5-10.5 15-12-1.5 6.5-6 12-15 12z" />
          <path d="M12 12l3 3" />
          <circle cx="17" cy="7" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "bridge":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M2 16h20M4 16v-4M8 16V9M12 16V6M16 16V9M20 16v-4" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
      );
    case "factory":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M2 20h20M4 20V10l4 2V8l4 2V6l4 2v12M10 14h2M14 14h2" />
        </svg>
      );
    case "camera":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M4 7h3l2-3h6l2 3h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      );
    case "ship":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M3 18h18l-2-6H5l-2 6zM12 6V3M8 6l4-3 4 3" />
        </svg>
      );
    case "anchor":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v12M8 15a4 4 0 008 0" />
        </svg>
      );
    case "trophy":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM5 4H3v2a3 3 0 003 3M19 4h2v2a3 3 0 01-3 3" />
        </svg>
      );
    case "megaphone":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M3 10v4h4l5 4V6L7 10H3zM16 8a4 4 0 010 8M19 6a7 7 0 010 12" />
        </svg>
      );
  }
}

export default function WhoWeWorkWith() {
  return (
    <section className="overflow-x-hidden bg-[#030712] py-14 sm:py-20 md:py-24 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 lg:px-10">
        <HomeSectionTitle>Who we help accelerate and scale</HomeSectionTitle>

        <p className="mx-auto mt-4 max-w-3xl text-balance text-center text-sm leading-relaxed text-white/60 sm:mt-6 sm:text-[15px] md:text-[17px]">
          Unit311 Central supports any type of business — from first-time founders to established operators.
          These are just a few examples of the sectors we work with.
        </p>

        <div className="mt-10 sm:mt-14 md:mt-16">
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14">
            {INDUSTRIES.map((item) => (
              <div key={item.label} className="flex min-w-0 flex-col items-center px-1 text-center">
                <IndustryIcon type={item.icon} />
                <p className="mt-4 text-[13px] font-normal leading-snug text-white/90 sm:mt-5 sm:text-[14px] md:text-[15px]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
