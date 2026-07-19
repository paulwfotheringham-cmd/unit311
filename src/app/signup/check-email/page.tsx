import type { Metadata } from "next";
import Link from "next/link";

import Logo from "@/components/layout/Logo";
import MarketingPageShell from "@/components/layout/MarketingPageShell";
import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { createPageMetadata } from "@/lib/metadata";
import { CONTACT } from "@/lib/site";
import {
  marketingBtnSecondary,
  marketingCardLarge,
  marketingEyebrow,
  marketingFadeIn,
  marketingPageIntro,
  marketingPageTitle,
  MARKETING_CONTENT_CLASS,
} from "@/lib/marketing-ui";

export const metadata: Metadata = createPageMetadata({
  title: "Check your email",
  description: "Verify your email address before continuing Unit311 Central onboarding.",
  path: "/signup/check-email",
});

type CheckEmailPageProps = {
  searchParams: Promise<{ email?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SignupCheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const params = await searchParams;
  const email = firstParam(params.email)?.trim() ?? "";

  return (
    <MarketingPageShell
      contentClassName={`${MARKETING_CONTENT_CLASS} flex min-h-[100dvh] flex-col items-center justify-center`}
    >
      <div className={`w-full max-w-xl ${marketingFadeIn}`}>
        <div className="mb-8 flex justify-center">
          <Logo href={CENTRAL_SITE_URL} height={52} />
        </div>

        <div className={`${marketingCardLarge} px-6 py-8 text-center sm:px-10 sm:py-10`}>
          <p className={marketingEyebrow}>Unit311 Central</p>
          <h1 className={`${marketingPageTitle} mt-3`}>Check your email</h1>
          <p className={marketingPageIntro}>
            Please check your email and click the verification link before continuing to payment.
          </p>
          {email ? (
            <p className="mt-3 text-[15px] leading-relaxed text-white/60 sm:text-[16px]">
              We sent a verification link to{" "}
              <span className="font-semibold text-white">{email}</span>.
            </p>
          ) : null}
          <p className="mt-3 text-[15px] leading-relaxed text-white/50 sm:text-[16px]">
            The link expires in 48 hours. If you do not see the message, check your spam folder.
          </p>

          <div className="mt-8 flex justify-center">
            <Link href={CENTRAL_SITE_URL} className={`${marketingBtnSecondary} h-11 px-7 text-[15px]`}>
              Return home
            </Link>
          </div>

          <p className="mt-6 text-sm text-white/45">
            Need help?{" "}
            <a href={`mailto:${CONTACT.infoEmail}`} className="text-[#93c5fd] hover:underline">
              {CONTACT.infoEmail}
            </a>
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
