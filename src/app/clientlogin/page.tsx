import type { Metadata } from "next";

import BcdLoginPage from "@/components/auth/BcdLoginPage";

export const metadata: Metadata = {
  title: "Client Login | Unit311",
  description: "Sign in to your Unit311 client intelligence workspace.",
  robots: { index: false, follow: false },
};

export default function ClientLoginPage() {
  return <BcdLoginPage variant="client" />;
}
