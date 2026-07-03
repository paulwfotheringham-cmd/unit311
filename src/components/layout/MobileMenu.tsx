"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

const NAV = [
  { href: "/#services", label: "Services", hash: "services" },
  { href: "/#platform", label: "Platform", hash: "platform" },
  { href: "/#how-it-works", label: "How it works", hash: "how-it-works" },
  { href: "/#pricing", label: "Pricing", hash: "pricing" },
] as const;

function scrollToSection(hash: string) {
  const target = document.getElementById(hash);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <nav
        aria-label="Mobile navigation"
        className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-border bg-surface p-6 shadow-2xl"
      >
        <div className="mb-8 flex items-center justify-between">
          <Logo height={28} />
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground"
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
                  onClose();
                }}
                className="block rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface-elevated"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/contact"
          onClick={onClose}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-[#EEF5FF] px-4 py-3 text-sm font-semibold text-[#0b2d63]"
        >
          Contact Us
        </Link>
        <Link
          href="/login"
          onClick={onClose}
          className="mt-3 inline-flex items-center justify-center rounded-md bg-[#0b2d63] px-4 py-3 text-sm font-semibold text-white hover:bg-[#082652]"
        >
          Login
        </Link>
      </nav>
    </div>
  );
}
