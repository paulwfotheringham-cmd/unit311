import type { Metadata, Viewport } from "next";

import DashboardShell from "@/components/dashboard/DashboardShell";
import Test1Dashboard from "@/components/dashboard/Test1Dashboard";

export const metadata: Metadata = {
  title: "Venturi Aeronautical — Project X | Unit311",
  description:
    "Project intelligence dashboard for Venturi Aeronautical — site analytics, earthworks progress, aerial intelligence, and stakeholder reporting.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function VenturiProjectsPage() {
  return (
    <div className="fixed inset-0 z-[100] flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-none bg-[#07111F] text-white supports-[height:100dvh]:h-dvh">
      <DashboardShell
        basePath="/client/venturi/projects"
        homeHref="/client/venturi"
        brand="venturi"
        variant="venturi"
        backLabel="Back to Venturi platform"
      >
        <Test1Dashboard />
      </DashboardShell>
    </div>
  );
}
