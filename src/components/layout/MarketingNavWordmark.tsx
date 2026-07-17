import Link from "next/link";

import Unit311CentralWordmark from "@/components/layout/Unit311CentralWordmark";

type MarketingNavWordmarkProps = {
  compact?: boolean;
};

export default function MarketingNavWordmark({ compact = false }: MarketingNavWordmarkProps) {
  return (
    <Link
      href="/"
      aria-label="Unit311 Central home"
      className={`inline-flex shrink-0 ${
        compact
          ? "max-w-[calc(100vw-9.5rem)] sm:max-w-none"
          : "max-w-[calc(100vw-8.5rem)] sm:max-w-none"
      }`}
    >
      <Unit311CentralWordmark
        variant="nav"
        className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]"
      />
    </Link>
  );
}
