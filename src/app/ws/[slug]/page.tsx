import Link from "next/link";
import { notFound } from "next/navigation";

import MarketingPageShell from "@/components/layout/MarketingPageShell";
import Logo from "@/components/layout/Logo";
import { CENTRAL_SITE_URL, centralLoginUrl, customerWorkspaceOrigin } from "@/lib/app-domains";
import {
  findWorkspaceBySlug,
  formatWorkspaceDisplayStatus,
} from "@/lib/workspace-host";
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

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const returnHomeClassName = `${marketingBtnSecondary} h-11 px-7 text-[15px]`;

export default async function CustomerWorkspaceHostPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug ?? "").trim().toLowerCase();
  if (!slug) notFound();

  const workspace = await findWorkspaceBySlug(slug);

  if (!workspace) {
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
            <h1 className={`${marketingPageTitle} mt-3`}>Workspace unavailable</h1>
            <p className={marketingPageIntro}>
              The workspace <span className="font-semibold text-white">&apos;{slug}&apos;</span>{" "}
              could not be found.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-white/60 sm:text-[16px]">
              Please check the address or contact Unit311 Central if you believe this is an error.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={CENTRAL_SITE_URL} className={marketingBtnGreen}>
                Return to Unit311Central.com
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-white/35">
            {slug}.unit311central.com
          </p>
        </div>
      </MarketingPageShell>
    );
  }

  const displayStatus = formatWorkspaceDisplayStatus(workspace.status);
  const isActive = displayStatus === "Active";

  return (
    <MarketingPageShell
      contentClassName={`${MARKETING_CONTENT_CLASS} flex min-h-[100dvh] flex-col items-center justify-center`}
    >
      <div className={`w-full max-w-xl ${marketingFadeIn}`}>
        <div className="mb-8 flex justify-center">
          <Logo href={CENTRAL_SITE_URL} height={52} />
        </div>

        <div className={`${marketingCardLarge} px-6 py-8 text-center sm:px-10 sm:py-10`}>
          <p className={marketingEyebrow}>
            {isActive ? "Your workspace" : "Workspace onboarding"}
          </p>
          <h1 className={`${marketingPageTitle} mt-3`}>{workspace.name}</h1>

          <div className="mt-5 flex justify-center">
            <span
              className={
                isActive
                  ? "inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100"
                  : "inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-sky-100"
              }
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-300" : "bg-sky-300"}`}
                aria-hidden
              />
              {displayStatus}
            </span>
          </div>

          {isActive ? (
            <>
              <p className={marketingPageIntro}>
                Your workspace is active. Sign in with the email and password you created during
                signup.
              </p>
              <p className="mt-5 text-sm text-white/40">
                {workspace.slug}.unit311central.com
              </p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <a
                  href={centralLoginUrl(customerWorkspaceOrigin(workspace.slug)) ?? undefined}
                  className={marketingBtnGreen}
                >
                  Sign in
                </a>
                <Link href={CENTRAL_SITE_URL} className={returnHomeClassName}>
                  Return to Unit311Central.com
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className={marketingPageIntro}>
                Your workspace has been created and is currently being prepared.
                <br className="hidden sm:block" />
                You&apos;ll receive an email as soon as your platform is ready.
              </p>
              <p className="mt-5 text-sm text-white/40">
                {workspace.slug}.unit311central.com
              </p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <a href={`mailto:${CONTACT.infoEmail}`} className={marketingBtnGreen}>
                  Contact Support
                </a>
                <Link href={CENTRAL_SITE_URL} className={returnHomeClassName}>
                  Return to Unit311Central.com
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </MarketingPageShell>
  );
}
