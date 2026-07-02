import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  height?: number;
  onDark?: boolean;
  href?: string;
};

export default function Logo({
  className = "",
  height = 32,
  onDark = false,
  href = "/",
}: LogoProps) {
  const wordmarkSize = Math.round(height * 0.48);

  const content = (
    <span className={cn("inline-flex items-center", className)}>
      <span className="flex flex-col justify-center leading-none">
        <span
          className={cn(
            "font-semibold tracking-[-0.03em]",
            onDark ? "text-white" : "text-[#0b2d63]",
          )}
          style={{ fontSize: wordmarkSize }}
        >
          Unit
          <span className={onDark ? "text-[#60a5fa]" : "text-[#2563eb]"}>311</span>
        </span>
      </span>
    </span>
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
