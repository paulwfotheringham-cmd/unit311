"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Footer from "./Footer";

function detectInternalAppHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  const onInternalHost =
    host === "internal.unit311central.com" || host === "internal.localhost";
  const onCustomerHost =
    host.endsWith(".unit311central.com") &&
    host !== "unit311central.com" &&
    host !== "www.unit311central.com" &&
    host !== "internal.unit311central.com";
  return onInternalHost || onCustomerHost;
}

export default function FooterGate() {
  const pathname = usePathname();
  const [isInternalAppHost] = useState(detectInternalAppHost);

  if (
    isInternalAppHost ||
    pathname?.startsWith("/ws/") ||
    pathname === "/clientlogin" ||
    pathname?.startsWith("/meet/") ||
    pathname?.startsWith("/executivecall/") ||
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
