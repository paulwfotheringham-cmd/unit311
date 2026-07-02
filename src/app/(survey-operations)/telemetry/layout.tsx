import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Live Telemetry | Unit311",
  description:
    "Operational telemetry monitoring dashboard for Unit311 survey fleet and FlightHub integrations.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function TelemetryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
