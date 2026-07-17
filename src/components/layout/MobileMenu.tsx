"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import MarketingNavWordmark from "@/components/layout/MarketingNavWordmark";
import { isMarketingRoute } from "@/lib/marketing-ui";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

const NAV = [
  { href: "/", label: "Home", hash: null },
  { href: "/#platform", label: "Platform", hash: "platform" },
  { href: "/#pricing", label: "Pricing", hash: "pricing" },
  { href: "/faq", label: "FAQ", hash: null },
  { href: "/about", label: "About", hash: null },
  { href: "/contact", label: "Contact", hash: null },
] as const;

function scrollToSection(hash: string) {
  const target = document.getElementById(hash);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/" || pathname === null;
  const isMarketingPage = isMarketingRoute(pathname);
  const isBookPage = pathname === "/book";
  const isDarkMenu =
    isHomePage ||
    isMarketingPage ||
    pathname === "/contact" ||
    pathname === "/about" ||
    pathname === "/faq" ||
    pathname === "/security" ||
    pathname === "/book" ||
    pathname === "/payment" ||
    pathname === "/payment-card" ||
    pathname === "/payment-transfer" ||
    pathname === "/login" ||
    pathname === "/signup";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        className={`absolute inset-0 backdrop-blur-sm ${isDarkMenu ? "bg-[#020617]/80" : "bg-background/80"}`}
        onClick={onClose}
      />
      <nav
        aria-label="Mobile navigation"
        className={`absolute right-0 top-0 flex h-full w-full max-w-[min(100vw,24rem)] flex-col border-l p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] shadow-2xl sm:p-6 ${
          isDarkMenu
            ? "border-white/10 bg-[#020617] text-white"
            : "border-border bg-surface text-foreground"
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
          <MarketingNavWordmark />
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
              isDarkMenu
                ? "border-white/20 text-white hover:border-white/35 hover:bg-white/10"
                : "border-border text-muted hover:border-border-strong hover:text-foreground"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          {NAV.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={(event) => {
                  if (pathname === "/" && link.hash) {
                    event.preventDefault();
                    scrollToSection(link.hash);
                  }
                  if (pathname === "/" && link.href === "/") {
                    event.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                  onClose();
                }}
                className={`block rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                  isDarkMenu ? "text-white/90 hover:bg-white/10 hover:text-white" : "text-foreground hover:bg-surface-elevated"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/signup"
          onClick={onClose}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#15803d] px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[#166534]"
        >
          Sign up
        </Link>
        {!isBookPage ? (
          <Link
            href="/login"
            onClick={onClose}
            className="mt-2 inline-flex items-center justify-center rounded-lg border border-white/20 px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-white/10"
          >
            Log in
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
