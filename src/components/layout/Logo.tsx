import Image from "next/image";
import Link from "next/link";

import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export const LOGO_SRC = "/images/unit311central.png";
export const LOGO_HERO_SRC = "/images/unit311central-hero.png";
export const LOGO_ASPECT = 198 / 90;
export const LOGO_STANDARD_HEIGHT = 72;
export const LOGO_HOME_HERO_HEIGHT = 151;
/** Reference height for sidebar slot sizing (actual draw uses fill + scale). */
export const LOGO_SIDEBAR_HEIGHT = 80;
export const LOGO_FOOTER_HEIGHT = 80;

type LogoProps = {
  className?: string;
  height?: number;
  href?: string | null;
  variant?: "default" | "hero";
  /** Stretch to parent height/width; parent must define height. */
  fillContainer?: boolean;
};

export default function Logo({
  className = "",
  height = LOGO_STANDARD_HEIGHT,
  href = "/",
  variant = "default",
  fillContainer = false,
}: LogoProps) {
  const width = Math.round(height * LOGO_ASPECT);
  const src = variant === "hero" ? LOGO_HERO_SRC : LOGO_SRC;

  const content = (
    <Image
      src={src}
      alt={SITE_NAME}
      width={width}
      height={height}
      className={cn("object-contain object-left", fillContainer ? "h-full w-auto max-h-full max-w-full" : "h-auto w-auto", className)}
      style={
        fillContainer
          ? { height: "100%", width: "auto", maxWidth: "100%" }
          : { height, width: "auto", maxWidth: width }
      }
      priority={variant === "hero"}
    />
  );

  if (href === null || href === "") {
    return content;
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center",
        fillContainer && "h-full max-h-full max-w-full",
      )}
      aria-label={SITE_NAME}
    >
      {content}
    </Link>
  );
}
