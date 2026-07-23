import type { Metadata } from "next";

import AboutPageContent from "@/components/about/AboutPageContent";
import JsonLd from "@/components/JsonLd";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "About Unit311",
  description:
    "Learn about Unit311, the business operations software built to help growing companies consolidate applications, connect specialist systems, and run day-to-day work from one intelligent platform.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <AboutPageContent />
    </>
  );
}
