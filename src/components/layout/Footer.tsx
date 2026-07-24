"use client";

import Link from "next/link";
import { useState } from "react";

import { CONTACT, SITE_HERO_LINE, SITE_NAME } from "@/lib/site";
import Unit311CentralWordmark from "./Unit311CentralWordmark";

type FooterSection = {
  id: string;
  title: string;
  links: Array<{ href: string; label: string; external?: boolean }>;
};

const FOOTER_SECTIONS: FooterSection[] = [
  {
    id: "solutions",
    title: "Solutions",
    links: [
      { href: "/", label: "Home" },
      { href: "/#platform", label: "Platform" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/faq", label: "FAQ" },
      { href: "/security", label: "Platform Security" },
    ],
  },
  {
    id: "company",
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/termsandconditions", label: "Terms & Conditions" },
      { href: "/privacypolicy", label: "Privacy Policy" },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    links: [
      { href: "/contact", label: "Contact Us" },
      { href: "/book", label: "Book a demo" },
      { href: "/signup", label: "Sign up" },
      { href: "/login", label: "Sign in" },
      { href: `mailto:${CONTACT.infoEmail}`, label: CONTACT.infoEmail, external: true },
      { href: CONTACT.linkedin, label: "LinkedIn", external: true },
    ],
  },
];

function FooterLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className = "block py-2 text-[13px] text-[#1a2b4a]/65 transition-colors hover:text-[#1a2b4a]";

  if (external) {
    return (
      <a
        href={href}
        target={href.startsWith("mailto:") ? undefined : "_blank"}
        rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
        className={className}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function FooterAccordionSection({
  section,
  open,
  onToggle,
}: {
  section: FooterSection;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `footer-panel-${section.id}`;

  return (
    <div className="border-b border-black/[0.08] lg:border-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center justify-between py-3.5 text-left lg:pointer-events-none lg:cursor-default"
      >
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1a2b4a]">
          {section.title}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
          className={`shrink-0 text-[#1a2b4a]/45 transition-transform lg:hidden ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <ul
        id={panelId}
        className={`overflow-hidden transition-[max-height,opacity] duration-200 lg:!max-h-none lg:!opacity-100 lg:pb-0 ${
          open ? "max-h-96 opacity-100 pb-2" : "max-h-0 opacity-0 lg:max-h-none lg:opacity-100"
        }`}
      >
        {section.links.map((link) => (
          <li key={`${section.id}-${link.href}`}>
            <FooterLink href={link.href} label={link.label} external={link.external} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <footer className="bg-white text-[#1a2b4a]">
      <div className="mx-auto max-w-[1280px] px-4 pb-6 pt-6 sm:px-8 sm:pb-[32px] sm:pt-[56px]">
        <div className="mb-5 sm:mb-0">
          <Link href="/" aria-label={SITE_NAME} className="inline-flex shrink-0 items-center">
            <Unit311CentralWordmark variant="footer" />
          </Link>
          <p className="mt-3 max-w-[320px] text-[12px] font-medium leading-relaxed text-[#1a2b4a]/65 sm:mt-[14px] sm:text-[13px]">
            {SITE_HERO_LINE}
          </p>
          <span className="mt-3 block h-[3px] w-[36px] bg-[#2563eb] sm:mt-[12px]" aria-hidden />
        </div>

        <div className="mt-5 lg:mt-[48px] lg:grid lg:grid-cols-3 lg:gap-10">
          {FOOTER_SECTIONS.map((section) => (
            <FooterAccordionSection
              key={section.id}
              section={section}
              open={openSection === section.id}
              onToggle={() =>
                setOpenSection((current) => (current === section.id ? null : section.id))
              }
            />
          ))}
        </div>

        <div className="mt-6 border-t border-black/[0.08] pt-4 text-center sm:mt-[48px] sm:pt-[24px]">
          <p className="text-[11px] text-[#1a2b4a]/50 sm:text-[12px]">
            © {new Date().getFullYear()} Unit311Central. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
