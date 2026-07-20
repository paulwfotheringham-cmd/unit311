import Image from "next/image";
import type { ReactNode } from "react";

import { MARKETING_CONTENT_CLASS } from "@/lib/marketing-ui";

export const MARKETING_BACKGROUND = "/images/hero-survey-background.png";

type MarketingPageShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  backgroundImage?: string;
  backgroundImageClassName?: string;
  overlayClassName?: string;
  /** Next/Image quality (1–100). Prefer higher for hero/login backgrounds. */
  backgroundImageQuality?: number;
};

export default function MarketingPageShell({
  children,
  className = "",
  contentClassName = MARKETING_CONTENT_CLASS,
  backgroundImage = MARKETING_BACKGROUND,
  backgroundImageClassName = "object-cover object-center opacity-30",
  overlayClassName = "absolute inset-0 bg-[#020617]/88",
  backgroundImageQuality = 75,
}: MarketingPageShellProps) {
  return (
    <section className={`relative min-h-[100dvh] overflow-x-hidden bg-[#020617] ${className}`}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src={backgroundImage}
          alt=""
          fill
          priority
          quality={backgroundImageQuality}
          className={backgroundImageClassName}
          sizes="100vw"
        />
        <div className={overlayClassName} />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 15% 20%, rgba(37,99,235,0.18), transparent 55%), radial-gradient(ellipse 60% 45% at 85% 80%, rgba(6,182,212,0.1), transparent 60%)",
          }}
        />
      </div>

      <div className={contentClassName}>{children}</div>
    </section>
  );
}
