import type { Metadata, Viewport } from "next";

import VenturiClientDashboard from "@/components/client-platform/VenturiClientDashboard";

export const metadata: Metadata = {
  title: "Venturi Aeronautical — Intelligence Platform | Unit311",
  description:
    "Customised client intelligence platform for Venturi Aeronautical — feasibility, R&D, regulatory compliance, certification, and test site operations.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function VenturiClientPage() {
  return (
    <div className="fixed inset-0 z-[100] flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-none bg-[#07111F] text-white supports-[height:100dvh]:h-dvh">
      <VenturiClientDashboard />
    </div>
  );
}
