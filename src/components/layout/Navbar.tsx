"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import MarketingNavWordmark from "@/components/layout/MarketingNavWordmark";
import { isClientCallRoute } from "@/lib/client-call-routes";
import {
  BOOK_SUBMITTED_EVENT,
  clearBookFormSubmitted,
  isBookFormSubmitted,
} from "@/lib/book-submission-state";
import {
  isMarketingRoute,
  marketingBtnGreen,
} from "@/lib/marketing-ui";
import MobileMenu from "./MobileMenu";

const NAV = [
  { href: "/", label: "Home", hash: null, chevron: false },
  { href: "/#platform", label: "Platform", hash: "platform", chevron: false },
  { href: "/#pricing", label: "Pricing", hash: "pricing", chevron: false },
  { href: "/faq", label: "FAQ", hash: null, chevron: false },
  { href: "/about", label: "About", hash: null, chevron: false },
  { href: "/contact", label: "Contact", hash: null, chevron: false },
] as const;

function scrollToSection(hash: string) {
  const target = document.getElementById(hash);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookFormSubmitted, setBookFormSubmitted] = useState(false);
  const [isInternalAppHost, setIsInternalAppHost] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/clientlogin";
  const isHomePage = pathname === "/" || pathname === null;
  const isMarketingPage = isMarketingRoute(pathname);
  const isBookPage = pathname === "/book";
  const isPaymentPage =
    pathname === "/payment" ||
    pathname === "/payment-card" ||
    pathname === "/payment-transfer";
  const isClientCallPage = isClientCallRoute(pathname);
  const isDarkNav =
    isHomePage ||
    isMarketingPage ||
    isBookPage ||
    isPaymentPage ||
    isLoginPage ||
    isClientCallPage;
  const isWorkspaceHostRoute = Boolean(pathname?.startsWith("/ws/"));
  const isDashboard =
    isInternalAppHost ||
    isWorkspaceHostRoute ||
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

  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    const onInternalHost =
      host === "internal.unit311central.com" || host === "internal.localhost";
    const onCustomerHost =
      host.endsWith(".unit311central.com") &&
      host !== "unit311central.com" &&
      host !== "www.unit311central.com" &&
      host !== "internal.unit311central.com";
    setIsInternalAppHost(onInternalHost || onCustomerHost);
  }, []);

  useEffect(() => {
    if (pathname !== "/book") {
      clearBookFormSubmitted();
      setBookFormSubmitted(false);
      return;
    }

    setBookFormSubmitted(isBookFormSubmitted());

    function handleBookSubmitted() {
      setBookFormSubmitted(true);
    }

    window.addEventListener(BOOK_SUBMITTED_EVENT, handleBookSubmitted);
    return () => window.removeEventListener(BOOK_SUBMITTED_EVENT, handleBookSubmitted);
  }, [pathname]);

  if (isDashboard || isClientCallPage) {
    return null;
  }

  if (pathname === "/book" && bookFormSubmitted) {
    return null;
  }

  const homeLoginButtonClass =
    "inline-flex h-9 items-center justify-center rounded-md bg-white px-3 text-[13px] font-semibold text-[#0b2d63] shadow-[0_2px_12px_rgba(255,255,255,0.15)] transition-colors hover:bg-white/90 lg:h-10 lg:rounded-lg lg:px-5 lg:text-[14px]";
  const signUpButtonClass = `${marketingBtnGreen} hidden lg:inline-flex lg:h-10 lg:px-5 lg:text-[14px]`;
  const signUpButtonClassCompact =
    "inline-flex h-9 items-center rounded-md bg-[#15803d] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#166534] sm:h-[36px] sm:px-[16px] sm:text-[14px]";
  const loginButtonClassCompact =
    "inline-flex h-9 items-center rounded-md bg-white px-3 text-[13px] font-semibold text-[#0b2d63] transition-colors hover:bg-white/90 sm:h-[36px] sm:px-[16px] sm:text-[14px]";
  const mobileAuthLinkClass = isDarkNav
    ? "text-[7.5px] font-semibold tracking-[0.01em] text-white/90 transition-colors hover:text-white sm:text-[8px]"
    : "text-[7.5px] font-semibold tracking-[0.01em] text-muted transition-colors hover:text-foreground sm:text-[8px]";
  const useHomeNavButtons = isHomePage || isMarketingPage;

  return (
    <>
      <header
        className={
          isHomePage
            ? "absolute inset-x-0 top-0 z-40 bg-transparent pt-[env(safe-area-inset-top)]"
            : isDarkNav
              ? "sticky top-0 z-40 border-b border-white/10 bg-[#020617]/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
              : "sticky top-0 z-40 border-b border-border bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
        }
      >
        <div
          className={`mx-auto flex max-w-[1400px] items-center sm:px-8 lg:px-10 ${
            isClientCallPage ? "" : "lg:grid lg:grid-cols-[1fr_auto_1fr]"
          } ${
            isHomePage
              ? "h-14 px-3 sm:h-20 lg:h-44 lg:px-6"
              : isClientCallPage
                ? "h-14 px-4 sm:h-16"
                : isMarketingPage
                  ? "h-14 px-3 sm:h-20 lg:h-24"
                  : "h-14 px-3 sm:h-20 lg:h-28"
          }`}
        >
          <div className="flex w-full items-center justify-between lg:contents">
            <div
              className={`flex items-center justify-start overflow-visible ${
                isHomePage ? "w-full max-w-[640px] lg:w-auto" : "min-w-0 overflow-hidden"
              }`}
            >
              {isHomePage ? (
                <>
                  <div className="lg:hidden">
                    <MarketingNavWordmark compact />
                  </div>
                  <span className="sr-only">Unit311 Central</span>
                </>
              ) : (
                <MarketingNavWordmark />
              )}
            </div>

            {!isClientCallPage ? (
              <nav
                aria-label="Main navigation"
                className={`hidden items-center justify-center lg:flex xl:gap-10 ${
                  isHomePage ? "gap-6 xl:gap-8" : "gap-8"
                }`}
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
                      if (pathname === "/" && link.href === "/") {
                        event.preventDefault();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className={`inline-flex items-center gap-1 whitespace-nowrap text-[14px] font-medium transition-colors ${
                      isDarkNav
                        ? "text-white/90 hover:text-white"
                        : "text-muted hover:text-foreground"
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
            ) : null}

            <div
              className={`flex shrink-0 items-center justify-end gap-1 sm:gap-3 xl:gap-6 ${
                isClientCallPage ? "hidden" : ""
              }`}
            >
              {!isBookPage && pathname !== "/login" ? (
                <div className="flex items-center gap-1 lg:hidden">
                  <Link href="/signup" className={mobileAuthLinkClass}>
                    Sign up
                  </Link>
                  <span className={`text-[7.5px] sm:text-[8px] ${isDarkNav ? "text-white/35" : "text-muted/50"}`} aria-hidden>
                    ·
                  </span>
                  <Link href="/login" className={mobileAuthLinkClass}>
                    Log in
                  </Link>
                </div>
              ) : (
                <div className="flex items-center lg:hidden">
                  <Link href="/signup" className={mobileAuthLinkClass}>
                    Sign up
                  </Link>
                </div>
              )}
              <Link
                href="/signup"
                className={`${useHomeNavButtons ? signUpButtonClass : signUpButtonClassCompact} hidden lg:inline-flex`}
              >
                Sign Up
              </Link>
              {!isBookPage && pathname !== "/login" ? (
                <Link
                  href="/login"
                  className={`${useHomeNavButtons ? homeLoginButtonClass : loginButtonClassCompact} hidden lg:inline-flex`}
                >
                  Login
                </Link>
              ) : null}
              <button
                type="button"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border lg:hidden ${
                  isDarkNav ? "border-white/25 text-white" : "border-border text-muted"
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
      {!isClientCallPage ? (
        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      ) : null}
    </>
  );
}
