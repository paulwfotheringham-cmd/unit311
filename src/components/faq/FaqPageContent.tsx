"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import MarketingPageShell from "@/components/layout/MarketingPageShell";
import {
  marketingFadeIn,
  marketingPageIntro,
  marketingPageTitle,
  MARKETING_CONTENT_CLASS,
} from "@/lib/marketing-ui";
import { CONTACT } from "@/lib/site";

const FAQ_ITEMS = [
  {
    question: "What is Unit311 Central?",
    answer:
      "Unit311 Central is an enterprise business operating platform that brings CRM, projects, finance, files, messaging, email, reporting, and executive intelligence into one secure workspace for your organisation.",
  },
  {
    question: "Who is Unit311 Central designed for?",
    answer:
      "We work with founders, operators, and leadership teams at SMEs and growing businesses that need a single source of truth across departments — without stitching together dozens of disconnected tools.",
  },
  {
    question: "How does pricing work?",
    answer:
      "Pricing is based on your organisation size, modules, and onboarding requirements. View indicative plans on the homepage or book a complimentary founder session for a tailored proposal.",
  },
  {
    question: "How long does onboarding take?",
    answer:
      "Most organisations begin with a structured discovery and setup phase. Timelines depend on data migration, user count, and module scope. We align milestones with your launch or operational priorities.",
  },
  {
    question: "Can we migrate existing data?",
    answer:
      "Yes. We support structured imports from spreadsheets, legacy CRMs, and common business tools. Your onboarding plan includes a data review and migration approach suited to your current systems.",
  },
  {
    question: "Is Unit311 Central secure?",
    answer:
      "Security is built into the platform architecture — role-based access, encrypted transport, audit-friendly workflows, and isolated client workspaces. Read more on our Platform Security page.",
  },
  {
    question: "Do you offer demos or discovery calls?",
    answer:
      "Yes. Book a complimentary founder session to walk through the platform, discuss your use case, and outline a practical next step for your team.",
  },
  {
    question: "How do I get support?",
    answer:
      "Active subscribers receive in-platform support and messaging. For sales, billing, or general enquiries, contact us by email and we respond within one business day.",
  },
] as const;

function FaqItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 bg-white px-4 py-4 text-left transition-colors hover:bg-[#f8fafc] sm:gap-4 sm:px-6 sm:py-5"
      >
        <span className="min-w-0 flex-1 break-words text-[15px] font-semibold text-[#0b2d63] sm:text-[17px]">{question}</span>
        <ChevronDown
          className={`mt-0.5 h-5 w-5 shrink-0 text-[#0b2d63] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <p className="border-t border-[#0b2d63]/10 bg-[#eef5ff] px-5 pb-5 pt-4 text-[15px] leading-relaxed text-[#0b2d63] sm:px-6">
            {answer}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function FaqPageContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <MarketingPageShell
      contentClassName={`${MARKETING_CONTENT_CLASS} space-y-14 sm:space-y-16 lg:space-y-20`}
    >
      <div className={`max-w-3xl ${marketingFadeIn}`}>
        <h1 className={marketingPageTitle}>Frequently asked questions</h1>
        <p className={marketingPageIntro}>
          Answers to common questions about the platform, onboarding, pricing, and support. If you
          need something specific, our team is happy to help.
        </p>
      </div>

      <div className="grid max-w-4xl gap-4">
        {FAQ_ITEMS.map((item, index) => (
          <FaqItem
            key={item.question}
            question={item.question}
            answer={item.answer}
            open={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
          />
        ))}
      </div>

      <div
        className={`rounded-[28px] border border-[#3b82f6]/20 bg-gradient-to-b from-[#1a4668] to-[#0f2f4d] px-6 py-10 text-center shadow-[0_8px_24px_rgba(0,0,0,0.25)] sm:px-10 ${marketingFadeIn}`}
        style={{ animationDelay: "120ms" }}
      >
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Still have questions?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-[17px]">
          Book a founder session or email{" "}
          <a
            href={`mailto:${CONTACT.infoEmail}`}
            className="font-medium text-[#93c5fd] hover:text-[#bfdbfe] hover:underline"
          >
            {CONTACT.infoEmail}
          </a>{" "}
          and we&apos;ll respond within one business day.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/book"
            className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#0b2d63] transition-colors hover:bg-white/90"
          >
            Book a session
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            Contact us
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
