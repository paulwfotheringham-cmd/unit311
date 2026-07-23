import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Grants Operations Dashboard | Unit311",
  description:
    "Unit311 grants operations workspace — clients, projects, finance, files, logistics, and more.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function InternalDashboardGrantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
