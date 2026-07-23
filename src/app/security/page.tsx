import type { Metadata } from "next";

import JsonLd from "@/components/JsonLd";
import SecurityPageContent from "@/components/security/SecurityPageContent";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Platform Security",
  description:
    "Discover how Unit311 Central secures business operations with encryption, role-based access control, audit-friendly workflows, and isolated client workspaces.",
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
