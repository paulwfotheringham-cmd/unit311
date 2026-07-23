import type { Metadata } from "next";

import PaymentCardPageContent from "@/components/payment/PaymentCardPageContent";
import { createNoIndexMetadata } from "@/lib/metadata";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Pay by card",
  description: "Complete your Unit311 Central subscription payment by card.",
  path: "/payment-card",
});

export default function PaymentCardPage() {
  return <PaymentCardPageContent />;
}
