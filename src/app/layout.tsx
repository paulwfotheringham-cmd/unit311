import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import FooterGate from "@/components/layout/FooterGate";
import Navbar from "@/components/layout/Navbar";
import JsonLd from "@/components/JsonLd";
import {
  getRequestHost,
  isInternalDomainHost,
  parseClientPlatformSubdomainSafe,
} from "@/lib/app-domains";
import { homeMetadata } from "@/lib/metadata";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  ...homeMetadata,
  metadataBase: new URL(SITE_URL),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#020617",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const host = getRequestHost({ headers: requestHeaders });
  // Customer workspace + internal app hosts must not show marketing chrome
  // (bare /login links would drop return_to before hydrate hides the nav).
  const hideMarketingChrome =
    Boolean(parseClientPlatformSubdomainSafe(host)) || isInternalDomainHost(host);

  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col overflow-x-clip bg-background font-sans text-foreground antialiased">
        <JsonLd data={[organizationJsonLd(), webSiteJsonLd()]} />
        {hideMarketingChrome ? null : <Navbar />}
        <main className="flex-1">{children}</main>
        {hideMarketingChrome ? null : <FooterGate />}
      </body>
    </html>
  );
}
