import { notFound, redirect } from "next/navigation";

import WorkspaceOnboardingWizard from "@/components/workspace-onboarding/WorkspaceOnboardingWizard";
import { ensureWorkspaceOnboardingCompletedColumn } from "@/lib/internal-db-migrations";
import { createNoIndexMetadata } from "@/lib/metadata";
import {
  getWorkspaceOnboardingState,
  isWorkspaceOnboardingPrototypeSlug,
  workspaceDashboardUrl,
} from "@/lib/workspace-customer-onboarding-service";

export const dynamic = "force-dynamic";

export const metadata = createNoIndexMetadata({
  title: "Workspace onboarding",
  description: "Private Unit311 workspace onboarding wizard.",
  path: "/onboarding",
});

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ step?: string }>;
};

export default async function WorkspaceOnboardingPage({ params, searchParams }: PageProps) {
  const { slug: rawSlug } = await params;
  const { step } = await searchParams;
  const slug = decodeURIComponent(rawSlug ?? "").trim().toLowerCase();
  if (!slug || !isWorkspaceOnboardingPrototypeSlug(slug)) notFound();

  await ensureWorkspaceOnboardingCompletedColumn().catch(() => false);

  const state = await getWorkspaceOnboardingState(slug);
  if (!state) notFound();

  if (state.onboardingCompleted) {
    redirect(workspaceDashboardUrl(state.slug));
  }

  return <WorkspaceOnboardingWizard initialState={state} initialStep={step} />;
}
