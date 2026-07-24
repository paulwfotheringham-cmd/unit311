import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Communications | Unit311",
  description: "Unit311 Central communications hub — messaging, voice, and video.",
  robots: { index: false, follow: false },
};

export default function CommunicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
