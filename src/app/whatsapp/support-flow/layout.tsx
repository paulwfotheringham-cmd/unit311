import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/metadata";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Support flow demo · WhatsApp",
  description: "Progressive four-panel support ticketing flow demo.",
  path: "/whatsapp/support-flow",
});

export default function WhatsAppSupportFlowLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 overflow-hidden bg-[#07111F]">{children}</div>;
}
