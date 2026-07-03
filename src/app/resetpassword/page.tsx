import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";

import ResetPasswordPage from "@/components/auth/ResetPasswordPage";
import { isCentralDomainHost } from "@/lib/app-domains";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host");
  const isCentral = isCentralDomainHost(host);

  return {
    title: isCentral ? "Reset Password | Unit311 Central" : "Reset Password | Unit311",
    description: "Reset your Unit311 account password.",
    robots: { index: false, follow: false },
  };
}

export default async function ResetPasswordRoute() {
  const host = (await headers()).get("host");
  const isCentral = isCentralDomainHost(host);

  return (
    <Suspense fallback={null}>
      <ResetPasswordPage variant={isCentral ? "central" : "default"} />
    </Suspense>
  );
}
