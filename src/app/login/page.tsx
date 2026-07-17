import type { Metadata } from "next";
import { headers } from "next/headers";

import Unit311LoginPage from "@/components/auth/Unit311LoginPage";
import {
  getRequestHost,
  isCentralDomainHost,
  parseValidWorkspaceReturnTo,
} from "@/lib/app-domains";

export async function generateMetadata(): Promise<Metadata> {
  const host = getRequestHost({ headers: await headers() });
  const isCentral = isCentralDomainHost(host);

  return {
    title: isCentral ? "Sign In | Unit311 Central" : "Sign In | Unit311",
    description: isCentral
      ? "Sign in to Unit311 Central — your internal operations workspace."
      : "Sign in to your Unit311 workspace.",
    robots: { index: false, follow: false },
  };
}

type PageProps = {
  searchParams: Promise<{ return_to?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const host = getRequestHost({ headers: await headers() });
  const isCentral = isCentralDomainHost(host);
  const params = await searchParams;
  const returnTo = parseValidWorkspaceReturnTo(params.return_to);

  return (
    <Unit311LoginPage variant={isCentral ? "central" : "default"} returnTo={returnTo} />
  );
}
