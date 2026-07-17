import type { Metadata } from "next";

import PaymentCardPageContent from "@/components/payment/PaymentCardPageContent";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Pay by card",
    description: "Complete your Unit311 Central subscription payment by card.",
    path: "/payment-card",
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentCardPage() {
  return <PaymentCardPageContent />;
}
