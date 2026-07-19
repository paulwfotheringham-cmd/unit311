import type { Metadata } from "next";
import { Suspense } from "react";

import CrmInviteSignupPage from "@/components/auth/CrmInviteSignupPage";
import SignupInviteInvalidPage from "@/components/auth/SignupInviteInvalidPage";
import Unit311SignupPage from "@/components/auth/Unit311SignupPage";
import { buildCrmInviteSignupPrefill } from "@/lib/crm-invite-signup-prefill";
import { resolveCrmSignupInvite } from "@/lib/crm-signup-invite";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Sign Up",
  description:
    "Request access to Unit311Central — the intelligent business operating platform for CRM, finance, HR, projects, and executive intelligence.",
  path: "/signup",
});

export const dynamic = "force-dynamic";

type SignupPageProps = {
  searchParams: Promise<{ t?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const inviteToken = firstParam(params.t)?.trim() ?? "";

  if (inviteToken) {
    const resolved = await resolveCrmSignupInvite(inviteToken);
    if (!resolved.ok) {
      return (
        <SignupInviteInvalidPage
          reason={resolved.reason === "missing" ? "invalid" : resolved.reason}
        />
      );
    }

    return (
      <CrmInviteSignupPage
        prefill={buildCrmInviteSignupPrefill(resolved.lead)}
        inviteToken={inviteToken}
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <Unit311SignupPage />
    </Suspense>
  );
}
