import type { Metadata } from "next";

import PaymentTransferPageContent from "@/components/payment/PaymentTransferPageContent";
import { createNoIndexMetadata } from "@/lib/metadata";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Pay by bank transfer",
  description: "Complete your Unit311 Central subscription payment by bank transfer.",
  path: "/payment-transfer",
});

export default function PaymentTransferPage() {
  return <PaymentTransferPageContent />;
}
