import type { Metadata } from "next";

import AboutPageContent from "@/components/about/AboutPageContent";
import JsonLd from "@/components/JsonLd";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "About",
  description: SITE_DESCRIPTION,
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
