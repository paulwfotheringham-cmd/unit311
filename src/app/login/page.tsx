import type { Metadata } from "next";

import Unit311LoginPage from "@/components/auth/Unit311LoginPage";

export const metadata: Metadata = {
  title: "Sign In | Unit311",
  description: "Sign in to your Unit311 workspace.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <Unit311LoginPage />;
}
