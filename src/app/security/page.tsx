import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import SecurityPageContent from "@/components/security/SecurityPageContent";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Platform Security",
  description:
    "Learn how Unit311 Central protects your organisation with encryption, role-based access, and isolated workspaces.",
  path: "/security",
});

export default function SecurityPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Platform Security", path: "/security" },
        ])}
      />
      <SecurityPageContent />
    </>
  );
}
