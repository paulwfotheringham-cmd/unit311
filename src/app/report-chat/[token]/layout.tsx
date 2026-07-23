import type { Metadata } from "next";

import { createNoIndexMetadata } from "@/lib/metadata";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Client report chat",
  description: "Private Unit311 client report conversation.",
  path: "/report-chat",
});

export default function ReportChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
