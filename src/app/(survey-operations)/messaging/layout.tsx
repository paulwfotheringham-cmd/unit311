import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Communications | Unit311",
  description: "Unit311 Central communications hub — messaging, voice, and video.",
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
