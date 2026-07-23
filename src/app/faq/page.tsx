import type { Metadata } from "next";

import FaqPageContent from "@/components/faq/FaqPageContent";
import JsonLd from "@/components/JsonLd";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about Unit311 Central: platform modules, onboarding, security, pricing conversations, integrations, and how teams get started.",
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
