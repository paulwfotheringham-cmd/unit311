import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Westport Logistics Hub — Intelligence Platform | Unit311",
  description:
    "Enterprise aerial intelligence dashboard for TerraBuild Infrastructure — Westport Logistics Hub, Western Australia.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function Test1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-none bg-[#07111F] text-white supports-[height:100dvh]:h-dvh safe-area-pt">
      {children}
    </div>
  );
}
