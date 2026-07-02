import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Internal Messaging | Unit311",
  description: "Real-time internal messaging for Unit311 operators.",
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
