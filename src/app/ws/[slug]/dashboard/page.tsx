import Link from "next/link";
import { notFound } from "next/navigation";

import MarketingPageShell from "@/components/layout/MarketingPageShell";
import Logo from "@/components/layout/Logo";
import { CENTRAL_SITE_URL, customerWorkspaceOrigin } from "@/lib/app-domains";
import {
  findWorkspaceBySlug,
  formatWorkspaceDisplayStatus,
} from "@/lib/workspace-host";
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

export default async function CustomerWorkspaceDashboardPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug ?? "").trim().toLowerCase();
  if (!slug) notFound();

  const workspace = await findWorkspaceBySlug(slug);
  if (!workspace) notFound();

  const displayStatus = formatWorkspaceDisplayStatus(workspace.status);
  const origin = customerWorkspaceOrigin(workspace.slug);

  return (
    <MarketingPageShell
      contentClassName={`${MARKETING_CONTENT_CLASS} flex min-h-[100dvh] flex-col items-center justify-center`}
    >
      <div className={`w-full max-w-xl ${marketingFadeIn}`}>
        <div className="mb-8 flex justify-center">
          <Logo href={origin ?? CENTRAL_SITE_URL} height={52} />
        </div>

        <div className={`${marketingCardLarge} px-6 py-8 text-center sm:px-10 sm:py-10`}>
          <p className={marketingEyebrow}>Workspace dashboard</p>
          <h1 className={`${marketingPageTitle} mt-3`}>{workspace.name}</h1>
          <p className={marketingPageIntro}>
            You are signed in to your workspace. Modules and branding from onboarding will appear
            here as they come online.
          </p>
          <p className="mt-5 text-sm text-white/40">
            Status: {displayStatus}
            {origin ? ` · ${origin.replace(/^https:\/\//, "")}` : null}
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href={CENTRAL_SITE_URL} className={marketingBtnSecondary}>
              Return to Unit311 Central
            </Link>
            <a href={origin ?? "#"} className={marketingBtnGreen}>
              Workspace home
            </a>
          </div>
        </div>
      </div>
    </MarketingPageShell>
  );
}
