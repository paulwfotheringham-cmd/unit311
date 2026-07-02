"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";

const NAV = [
  { href: "/#services", label: "Solutions", hash: "services", chevron: true },
  { href: "/#platform", label: "Platform", hash: "platform", chevron: false },
] as const;

function scrollToSection(hash: string) {
  const target = document.getElementById(hash);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/clientlogin";
  const isDarkNav = pathname === "/" || pathname === "/contact" || isLoginPage;
  const isDashboard =
    pathname?.startsWith("/test1") ||
    pathname?.startsWith("/client/") ||
    pathname?.startsWith("/testflighthub") ||
    pathname?.startsWith("/internaldashboard") ||
    pathname?.startsWith("/files") ||
    pathname?.startsWith("/users") ||
    pathname?.startsWith("/messaging") ||
    pathname?.startsWith("/crm") ||
    pathname?.startsWith("/telemetry") ||
    pathname?.startsWith("/whatsapp/");

  if (isDashboard || isLoginPage) {
    return null;
  }

  return (
    <>
      <header
        className={
          isDarkNav
            ? "absolute inset-x-0 top-0 z-40 bg-transparent"
            : "sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl"
        }
      >
        <div className="mx-auto flex h-20 max-w-[1400px] items-center px-6 sm:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-10">
          <div className="flex w-full items-center justify-between lg:contents">
            {/* Logo */}
            <div className="flex items-center justify-start">
              <Logo height={60} onDark={isDarkNav} />
            </div>

            {/* Centered navigation */}
            <nav
              aria-label="Main navigation"
              className="hidden items-center justify-center gap-12 lg:flex xl:gap-14"
            >
              {NAV.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(event) => {
                    if (pathname === "/" && link.hash) {
                      event.preventDefault();
                      scrollToSection(link.hash);
                    }
                  }}
                  className={`inline-flex items-center gap-1 whitespace-nowrap text-[14px] font-medium ${
                    isDarkNav ? "text-white/90" : "text-muted hover:text-foreground"
                  }`}
                >
                  {link.label}
                  {link.chevron && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  )}
                </Link>
              ))}
            </nav>

            {/* Contact — far right */}
            <div className="flex items-center justify-end gap-3">
              <Link
                href="/contact"
                className={`hidden items-center rounded-lg font-semibold lg:inline-flex ${
                  pathname === "/"
                    ? "h-11 px-7 text-[15px] bg-white/90 text-[#0b2d63] shadow-[0_2px_12px_rgba(255,255,255,0.15)] backdrop-blur-sm transition-colors hover:bg-white"
                    : isDarkNav
                      ? "h-[36px] rounded-md px-[16px] text-[14px] bg-white text-[#0b2d63]"
                      : "h-[36px] rounded-md border border-[#cfe0ff] bg-[#EEF5FF] px-[16px] text-[14px] text-[#0b2d63]"
                }`}
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-md bg-[#0b2d63] px-3 text-[13px] font-semibold text-white hover:bg-[#082652] sm:h-[36px] sm:px-[16px] sm:text-[14px]"
              >
                Login
              </Link>
              <button
                type="button"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border lg:hidden ${
                  isDarkNav
                    ? "border-white/25 text-white"
                    : "border-border text-muted"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
