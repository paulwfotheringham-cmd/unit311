import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unit311 Support · WhatsApp",
  description: "Client WhatsApp support ticket intake preview",
};

export default function WhatsAppSupportLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-[#0b141a]">{children}</div>;
}
