import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "CRM | Unit311",
  description: "Internal CRM for tracking leads, pipeline status, and next actions.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return children;
}
