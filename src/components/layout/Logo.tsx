import Image from "next/image";
import Link from "next/link";

import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export const LOGO_SRC = "/images/unit311central.png";
export const LOGO_HERO_SRC = "/images/unit311central-hero.png";
export const LOGO_ASPECT = 198 / 90;
export const LOGO_STANDARD_HEIGHT = 72;
export const LOGO_HOME_HERO_HEIGHT = 151;
export const LOGO_SIDEBAR_HEIGHT = 40;
export const LOGO_FOOTER_HEIGHT = 80;

type LogoProps = {
  className?: string;
  height?: number;
  href?: string | null;
  variant?: "default" | "hero";
};

export default function Logo({
  className = "",
  height = LOGO_STANDARD_HEIGHT,
  href = "/",
  variant = "default",
}: LogoProps) {
  const width = Math.round(height * LOGO_ASPECT);
  const src = variant === "hero" ? LOGO_HERO_SRC : LOGO_SRC;

  const content = (
    <Image
      src={src}
      alt={SITE_NAME}
      width={width}
      height={height}
      className={cn("h-auto w-auto object-contain object-left", className)}
      style={{ height, width: "auto", maxWidth: width }}
      priority={variant === "hero"}
    />
  );

  if (href === null || href === "") {
    return content;
  }

  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label={SITE_NAME}>
      {content}
    </Link>
  );
}
