import type { Metadata } from "next";

import PaymentTransferPageContent from "@/components/payment/PaymentTransferPageContent";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "Pay by bank transfer",
    description: "Complete your Unit311 Central subscription payment by bank transfer.",
    path: "/payment-transfer",
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentTransferPage() {
  return <PaymentTransferPageContent />;
}
