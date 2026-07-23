import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/metadata";

export const metadata: Metadata = createNoIndexMetadata({
  title: "WhatsApp ticket test",
  description: "Internal WhatsApp ticket intake test page.",
  path: "/whatsapp/ticket",
});

export default function WhatsAppTicketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
