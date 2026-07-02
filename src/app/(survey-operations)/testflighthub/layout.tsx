import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Survey Operations Dashboard | Unit311",
  description:
    "Drone surveying operations dashboard with live FlightHub telemetry, fleet status, and mission overview.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function TestFlightHubLayout({ children }: { children: React.ReactNode }) {
  return children;
}
