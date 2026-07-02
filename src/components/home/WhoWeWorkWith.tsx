const INDUSTRIES = [
  { label: "Founders & Startups", icon: "building" },
  { label: "Professional Services", icon: "megaphone" },
  { label: "Construction & Infrastructure", icon: "bridge" },
  { label: "Logistics & Trade", icon: "ship" },
  { label: "Technology Ventures", icon: "bolt" },
  { label: "Creative Agencies", icon: "camera" },
  { label: "Manufacturing", icon: "factory" },
  { label: "Energy & Utilities", icon: "bolt" },
  { label: "Retail & Hospitality", icon: "trophy" },
  { label: "Franchise Operators", icon: "pickaxe" },
  { label: "International Expansion", icon: "anchor" },
] as const;

function IndustryIcon({ type }: { type: (typeof INDUSTRIES)[number]["icon"] }) {
  const cls = "h-[48px] w-[48px] stroke-white sm:h-[52px] sm:w-[52px]";
  switch (type) {
    case "building":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
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
    case "pickaxe":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className={cls}>
          <path d="M14 4l6 6M8 20l8-8M4 8l4 4M10 14L6 18" />
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
    <section className="bg-[#030712] py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-10">
        <div className="flex items-center justify-center gap-5 sm:gap-6">
          <span className="h-px w-[80px] bg-[#3b82f6] sm:w-[140px]" aria-hidden />
          <p className="whitespace-nowrap text-[22px] font-semibold uppercase tracking-[0.18em] text-[#3b82f6]">
            Who we help start and scale
          </p>
          <span className="h-px w-[80px] bg-[#3b82f6] sm:w-[140px]" aria-hidden />
        </div>

        <div className="mt-14 sm:mt-16">
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-8 lg:gap-y-14">
            {INDUSTRIES.slice(0, 5).map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center">
                <IndustryIcon type={item.icon} />
                <p className="mt-5 text-[14px] font-normal leading-[1.4] text-white/90 sm:text-[15px]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:mt-14 lg:grid-cols-6 lg:gap-x-8 lg:gap-y-14">
            {INDUSTRIES.slice(5).map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center">
                <IndustryIcon type={item.icon} />
                <p className="mt-5 text-[14px] font-normal leading-[1.4] text-white/90 sm:text-[15px]">
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
