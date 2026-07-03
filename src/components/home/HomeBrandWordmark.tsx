import Link from "next/link";

export default function HomeBrandWordmark() {
  return (
    <Link
      href="/"
      aria-label="Unit311 Central home"
      className="inline-block text-xs font-semibold uppercase leading-none tracking-[0.28em] drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] sm:text-sm"
    >
      <span style={{ color: "#ffffff" }}>UNIT</span>
      <span style={{ color: "#60a5fa" }}>311</span>
    </Link>
  );
}
