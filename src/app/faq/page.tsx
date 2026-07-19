import type { Metadata } from "next";

import FaqPageContent from "@/components/faq/FaqPageContent";
import JsonLd from "@/components/JsonLd";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "FAQ",
  description: SITE_DESCRIPTION,
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ])}
      />
      <FaqPageContent />
    </>
  );
}
