import Link from "next/link";

import Unit311CentralWordmark from "@/components/layout/Unit311CentralWordmark";

export default function HomeBrandWordmark() {
  return (
    <Link href="/" aria-label="Unit311 Central home" className="inline-flex max-w-[calc(100vw-7rem)] shrink-0 sm:max-w-[min(100%,18rem)]">
      <Unit311CentralWordmark
        variant="hero"
        className="drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
      />
    </Link>
  );
}
