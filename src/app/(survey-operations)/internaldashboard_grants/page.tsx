import { Suspense } from "react";

import InternalOperationsDashboard from "@/components/testflighthub/InternalOperationsDashboard";
import WorkspaceLoadingFallback from "@/components/testflighthub/WorkspaceLoadingFallback";
import { INTERNAL_GRANTS_OPERATIONS_BASE_PATH } from "@/lib/internal-operations-data";

export default function InternalDashboardGrantsPage() {
  return (
    <Suspense fallback={<WorkspaceLoadingFallback variant="page" label="Loading grants workspace" />}>
      <InternalOperationsDashboard basePath={INTERNAL_GRANTS_OPERATIONS_BASE_PATH} />
    </Suspense>
  );
}
