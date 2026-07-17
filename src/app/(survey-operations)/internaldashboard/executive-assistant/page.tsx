import { Suspense } from "react";

import InternalOperationsDashboard from "@/components/testflighthub/InternalOperationsDashboard";

export default function ExecutiveAssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[50vh] items-center justify-center bg-[#020617] text-sm text-white/50">
          Loading internal operations workspace...
        </div>
      }
    >
      <InternalOperationsDashboard initialView="executive-assistant" />
    </Suspense>
  );
}
