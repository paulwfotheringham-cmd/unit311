import Image from "next/image";
import Link from "next/link";

import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/images/unit311central.png";
const LOGO_ASPECT = 1536 / 1024;

type LogoProps = {
  className?: string;
  height?: number;
  onDark?: boolean;
  href?: string;
  wordmark?: boolean;
};

export default function Logo({
  className = "",
  height = 32,
  onDark = false,
  href = "/",
  wordmark = false,
}: LogoProps) {
  if (wordmark) {
    const wordmarkSize = Math.round(height * 0.48);

    const content = (
      <span className={cn("inline-flex items-center leading-none", className)}>
        <span
          className="font-semibold tracking-[-0.03em]"
          style={{ fontSize: wordmarkSize }}
        >
          <span className={onDark ? "text-white" : "text-[#0b2d63]"}>Unit</span>
          <span className={onDark ? "text-[#60a5fa]" : "text-[#2563eb]"}>311</span>
        </span>
      </span>
    );

    if (!href) return content;

    return (
      <Link href={href} className="inline-flex shrink-0 items-center" aria-label={SITE_NAME}>
        {content}
      </Link>
    );
  }

  const width = Math.round(height * LOGO_ASPECT);

  const content = (
    <Image
      src={LOGO_SRC}
      alt={SITE_NAME}
      width={width}
      height={height}
      className={cn("h-auto w-auto object-contain object-left", className)}
      style={{ height, width: "auto", maxWidth: width }}
      priority={false}
    />
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label={SITE_NAME}>
      {content}
    </Link>
  );
}
