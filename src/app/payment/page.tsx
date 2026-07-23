import type { Metadata } from "next";

import PaymentPageContent from "@/components/payment/PaymentPageContent";
import { createNoIndexMetadata } from "@/lib/metadata";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Payment",
  description: "Complete your Unit311 Central subscription payment.",
  path: "/payment",
});

export default function PaymentPage() {
  return <PaymentPageContent />;
}
