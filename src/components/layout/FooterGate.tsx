"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function FooterGate() {
  const pathname = usePathname();

  if (
    pathname === "/login" ||
    pathname === "/clientlogin" ||
    pathname?.startsWith("/client/") ||
    pathname?.startsWith("/test1") ||
    pathname?.startsWith("/testflighthub") ||
    pathname?.startsWith("/internaldashboard") ||
    pathname?.startsWith("/files") ||
    pathname?.startsWith("/users") ||
    pathname?.startsWith("/messaging") ||
    pathname?.startsWith("/crm") ||
    pathname?.startsWith("/telemetry") ||
    pathname?.startsWith("/financials") ||
    pathname?.startsWith("/projects") ||
    pathname?.startsWith("/calendar") ||
    pathname?.startsWith("/info-email") ||
    pathname?.startsWith("/whatsapp/")
  ) {
    return null;
  }

  return <Footer />;
}
