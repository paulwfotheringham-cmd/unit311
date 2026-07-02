import Link from "next/link";
import { CONTACT, SITE_HERO_LINE } from "@/lib/site";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="bg-white text-[#1a2b4a]">
      <div className="mx-auto max-w-[1280px] px-8 pb-[32px] pt-[56px]">
        <div className="grid gap-[48px] md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo height={48} />
            <p className="mt-[14px] text-[13px] font-medium text-[#1a2b4a]/65">
              {SITE_HERO_LINE}
            </p>
            <span className="mt-[12px] block h-[3px] w-[36px] bg-[#2563eb]" aria-hidden />
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1a2b4a]">
              Solutions
            </h3>
            <ul className="mt-[16px] space-y-[10px]">
              <li>
                <Link href="/#services" className="text-[13px] text-[#1a2b4a]/65 hover:text-[#1a2b4a]">
                  What we offer
                </Link>
              </li>
              <li>
                <Link href="/#platform" className="text-[13px] text-[#1a2b4a]/65 hover:text-[#1a2b4a]">
                  Platform
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1a2b4a]">
              Company
            </h3>
            <ul className="mt-[16px] space-y-[10px]">
              <li>
                <Link href="/contact" className="text-[13px] text-[#1a2b4a]/65 hover:text-[#1a2b4a]">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-[13px] text-[#1a2b4a]/65 hover:text-[#1a2b4a]">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1a2b4a]">
              Contact
            </h3>
            <ul className="mt-[16px] space-y-[10px]">
              <li>
                <a
                  href={`mailto:${CONTACT.infoEmail}`}
                  className="inline-flex items-center gap-[8px] text-[13px] text-[#1a2b4a]/65 hover:text-[#1a2b4a]"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                  {CONTACT.infoEmail}
                </a>
              </li>
              <li>
                <a
                  href={CONTACT.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-[8px] text-[13px] text-[#1a2b4a]/65 hover:text-[#1a2b4a]"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.126 0 2.063 2.063 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-[48px] border-t border-black/[0.08] pt-[24px] text-center">
          <p className="text-[12px] text-[#1a2b4a]/50">
            © {new Date().getFullYear()} Unit311. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
