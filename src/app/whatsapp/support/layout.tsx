import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/metadata";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Unit311 Support · WhatsApp",
  description: "Client WhatsApp support ticket intake preview.",
  path: "/whatsapp/support",
});

export default function WhatsAppSupportLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-[#0b141a]">{children}</div>;
}
