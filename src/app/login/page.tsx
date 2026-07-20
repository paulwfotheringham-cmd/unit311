import type { Metadata } from "next";
import { headers } from "next/headers";

import Unit311LoginPage from "@/components/auth/Unit311LoginPage";
import {
  getRequestHost,
  isCentralDomainHost,
  parseLoginReturnTo,
  parseSafePostLoginNext,
} from "@/lib/app-domains";

export async function generateMetadata(): Promise<Metadata> {
  const host = getRequestHost({ headers: await headers() });
  const isCentral = isCentralDomainHost(host);

  return {
    title: isCentral ? "Internal Operations | Sign In" : "Sign In | Unit311",
    description: isCentral
      ? "Secure access to the Unit311 Central Operations Platform."
      : "Sign in to your Unit311 workspace.",
    robots: { index: false, follow: false },
  };
}

type PageProps = {
  searchParams: Promise<{ return_to?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const host = getRequestHost({ headers: await headers() });
  const isCentral = isCentralDomainHost(host);
  const params = await searchParams;
  const returnTo = parseLoginReturnTo(params.return_to)?.origin ?? null;
  const nextPath = parseSafePostLoginNext(params.next);

  return (
    <Unit311LoginPage
      variant={isCentral ? "central" : "default"}
      returnTo={returnTo}
      nextPath={nextPath}
    />
  );
}
