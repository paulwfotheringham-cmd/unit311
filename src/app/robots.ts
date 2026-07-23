import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/login",
        "/clientlogin",
        "/resetpassword",
        "/resetpassowrd",
        "/payment",
        "/payment-card",
        "/payment-transfer",
        "/app-download",
        "/ws/",
        "/onboarding/",
        "/meet/",
        "/report-chat/",
        "/whatsapp/",
        "/internaldashboard",
        "/internaldashboard_grants",
        "/client/",
        "/executivecall/",
        "/signup/check-email",
        "/test1",
        "/testflighthub",
        "/crm",
        "/files",
        "/messaging",
        "/telemetry",
        "/users",
        "/financials",
        "/projects",
        "/calendar",
        "/info-email",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
