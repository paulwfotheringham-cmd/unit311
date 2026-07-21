import type { NextConfig } from "next";

/**
 * Path aliases for local/dev (host-agnostic).
 * Production host routing (apex → internal.*, clean internal URLs) lives in middleware.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/testflighthub", destination: "/internaldashboard", permanent: true },
      { source: "/testflighthub/:path*", destination: "/internaldashboard", permanent: true },
      { source: "/crm", destination: "/internaldashboard?view=crm", permanent: false },
      { source: "/financials", destination: "/internaldashboard?view=financials", permanent: false },
      { source: "/messaging", destination: "/internaldashboard?view=messaging", permanent: false },
      { source: "/calendar", destination: "/internaldashboard?view=calendar", permanent: false },
      { source: "/info-email", destination: "/internaldashboard?view=info-email", permanent: false },
      { source: "/projects", destination: "/internaldashboard?view=projects", permanent: false },
      { source: "/files", destination: "/internaldashboard?view=files", permanent: false },
      { source: "/users", destination: "/internaldashboard?view=users", permanent: false },
      { source: "/telemetry", destination: "/internaldashboard?view=telemetry", permanent: false },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
};

export default nextConfig;
