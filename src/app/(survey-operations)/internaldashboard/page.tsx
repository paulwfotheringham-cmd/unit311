import { Suspense } from "react";
import { headers } from "next/headers";

import InternalOperationsDashboard from "@/components/testflighthub/InternalOperationsDashboard";
import { getRequestHost } from "@/lib/app-domains";
import { resolveInternalOperationsBasePath } from "@/lib/internal-operations-data";

export default async function InternalDashboardPage() {
  const host = getRequestHost({ headers: await headers() });
  const basePath = resolveInternalOperationsBasePath(host);

  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[50vh] items-center justify-center bg-[#020617] text-sm text-white/50">
          Loading internal operations workspace...
        </div>
      }
    >
      <InternalOperationsDashboard basePath={basePath} />
    </Suspense>
  );
}
