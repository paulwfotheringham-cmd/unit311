import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Internal Files | Unit311",
  description: "Internal document repository for survey operations files and deliverables.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function FilesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
