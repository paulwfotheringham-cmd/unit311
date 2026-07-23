import type { Metadata } from "next";
import ContactPageContent from "@/components/contact/ContactPageContent";
import JsonLd from "@/components/JsonLd";
import { createPageMetadata } from "@/lib/metadata";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "Contact Unit311",
  description:
    "Speak with Unit311 about business operations software for growing companies. Book a conversation, request a demo, or ask about CRM, finance, HR, and project workflows — we respond within one business day.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
      <ContactPageContent />
    </>
  );
}
