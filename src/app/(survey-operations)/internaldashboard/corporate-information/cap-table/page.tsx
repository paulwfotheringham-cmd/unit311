import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getRequestHost } from "@/lib/app-domains";
import {
  getInternalNavHref,
  resolveInternalOperationsBasePath,
} from "@/lib/internal-operations-data";

/** Legacy hard path — permanently folded into `?view=corporate-cap-table`. */
export default async function CapTableLegacyPage() {
  const host = getRequestHost({ headers: await headers() });
  const basePath = resolveInternalOperationsBasePath(host);
  redirect(getInternalNavHref("corporate-cap-table", basePath));
}
