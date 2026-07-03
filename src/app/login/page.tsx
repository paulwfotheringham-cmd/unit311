import type { Metadata } from "next";
import { headers } from "next/headers";

import Unit311LoginPage from "@/components/auth/Unit311LoginPage";
import { isCentralDomainHost } from "@/lib/app-domains";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host");
  const isCentral = isCentralDomainHost(host);

  return {
    title: isCentral ? "Sign In | Unit311 Central" : "Sign In | Unit311",
    description: isCentral
      ? "Sign in to Unit311 Central — your internal operations workspace."
      : "Sign in to your Unit311 workspace.",
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage() {
  const host = (await headers()).get("host");
  const isCentral = isCentralDomainHost(host);

  return <Unit311LoginPage variant={isCentral ? "central" : "default"} />;
}
