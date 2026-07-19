import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import { isCentralDomainHost, isInternalDomainHost } from "@/lib/app-domains";

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host");
  const isCentral = isCentralDomainHost(host) || isInternalDomainHost(host);

  return {
    title: isCentral
      ? "Internal Operations | Unit311 Central"
      : "Internal Operations Dashboard | Unit311",
    description: isCentral
      ? "Unit311 Central internal operations — clients, projects, finance, files, logistics, and more."
      : "Unit311 internal operations workspace — clients, projects, finance, files, logistics, and more.",
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function InternalDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
