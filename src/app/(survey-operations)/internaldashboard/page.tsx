import { Suspense } from "react";
import { headers } from "next/headers";

import InternalOperationsDashboard from "@/components/testflighthub/InternalOperationsDashboard";
import WorkspaceLoadingFallback from "@/components/testflighthub/WorkspaceLoadingFallback";
import { getRequestHost } from "@/lib/app-domains";
import { resolveInternalOperationsBasePath } from "@/lib/internal-operations-data";

export default async function InternalDashboardPage() {
  const host = getRequestHost({ headers: await headers() });
  const basePath = resolveInternalOperationsBasePath(host);

  return (
    <Suspense fallback={<WorkspaceLoadingFallback variant="page" label="Loading operations shell" />}>
      <InternalOperationsDashboard basePath={basePath} />
    </Suspense>
  );
}
