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
};

export default function Logo({
  className = "",
  height = 32,
  href = "/",
}: LogoProps) {
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
