import Link from "next/link";
import type { ReactNode } from "react";

import MarketingPageShell from "@/components/layout/MarketingPageShell";
import {
  marketingEyebrow,
  marketingFadeIn,
  marketingLegalLink,
  marketingPageIntro,
  marketingPageTitle,
  MARKETING_CONTENT_CLASS,
} from "@/lib/marketing-ui";

type LegalPageContentProps = {
  title: string;
  intro: string;
  children: ReactNode;
};

export default function LegalPageContent({ title, intro, children }: LegalPageContentProps) {
  return (
    <MarketingPageShell contentClassName={MARKETING_CONTENT_CLASS}>
      <div className={`max-w-3xl ${marketingFadeIn}`}>
        <p className={marketingEyebrow}>Unit311 Central</p>
        <h1 className={`mt-4 ${marketingPageTitle}`}>{title}</h1>
        <p className={marketingPageIntro}>{intro}</p>

        <div className="prose-legal mt-10 space-y-8">{children}</div>

        <p className="mt-12 text-sm text-white/55">
          Questions?{" "}
          <Link href="/contact" className={marketingLegalLink}>
            Contact us
          </Link>
          .
        </p>
      </div>
    </MarketingPageShell>
  );
}
