import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Messaging | Unit311",
  description: "Persistent messaging for Unit311 — channels, DMs, and chat history.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function MessagingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
