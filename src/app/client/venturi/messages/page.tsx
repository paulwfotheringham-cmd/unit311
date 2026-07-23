import type { Metadata } from "next";

import DashboardShell from "@/components/dashboard/DashboardShell";
import ClientMessagingWorkspace from "@/components/messaging/ClientMessagingWorkspace";
import { createNoIndexMetadata } from "@/lib/metadata";

export const metadata: Metadata = createNoIndexMetadata({
  title: "Venturi messages",
  description: "Private Venturi client messaging workspace.",
  path: "/client/venturi/messages",
});

export default function VenturiMessagesPage() {
  return (
    <div className="fixed inset-0 z-[100] flex h-dvh max-h-dvh flex-col overflow-hidden overscroll-none bg-[#07111F] text-white supports-[height:100dvh]:h-dvh">
      <DashboardShell
        basePath="/client/venturi/projects"
        homeHref="/client/venturi"
        brand="venturi"
        variant="venturi"
        backLabel="Back to Venturi platform"
      >
        <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4 lg:p-6">
          <ClientMessagingWorkspace />
        </div>
      </DashboardShell>
    </div>
  );
}
