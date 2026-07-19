import Link from "next/link";

import Logo from "@/components/layout/Logo";
import MarketingPageShell from "@/components/layout/MarketingPageShell";
import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { CONTACT } from "@/lib/site";
import {
  marketingBtnGreen,
  marketingBtnSecondary,
  marketingCardLarge,
  marketingEyebrow,
  marketingFadeIn,
  marketingPageIntro,
  marketingPageTitle,
  MARKETING_CONTENT_CLASS,
} from "@/lib/marketing-ui";

type SignupInviteInvalidPageProps = {
  reason: "missing" | "invalid" | "expired" | "not_found";
};

export default function SignupInviteInvalidPage({ reason }: SignupInviteInvalidPageProps) {
  const title =
    reason === "expired" ? "This signup link has expired" : "This signup link is no longer valid";

  const detail =
    reason === "expired"
      ? "For security, personalised signup links expire after a period of time."
      : "The link may have been copied incorrectly, already replaced, or is no longer active.";

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
          <h1 className={`${marketingPageTitle} mt-3`}>{title}</h1>
          <p className={marketingPageIntro}>{detail}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-white/60 sm:text-[16px]">
            Please contact Unit311 Central and we will send you a fresh personalised link.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={`mailto:${CONTACT.infoEmail}`} className={marketingBtnGreen}>
              Contact Unit311 Central
            </a>
            <Link href={CENTRAL_SITE_URL} className={`${marketingBtnSecondary} h-11 px-7 text-[15px]`}>
              Return home
            </Link>
          </div>

          <p className="mt-6 text-sm text-white/45">
            <a href={`mailto:${CONTACT.infoEmail}`} className="text-[#93c5fd] hover:underline">
              {CONTACT.infoEmail}
            </a>
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
