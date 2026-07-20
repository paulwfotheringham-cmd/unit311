import { NextResponse } from "next/server";

import { requireInternalAdministratorWorkspaceSession } from "@/lib/internal-admin-auth";
import { INTEGRATION_FRAMEWORK_MIGRATION_REQUIRED } from "@/lib/integration-framework-data";
import { listWorkspaceIntegrationConnections } from "@/lib/integration-framework-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireInternalAdministratorWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const connections = await listWorkspaceIntegrationConnections(auth.workspace.id);
    return NextResponse.json({ connections });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list integration connections";
    const status = message === INTEGRATION_FRAMEWORK_MIGRATION_REQUIRED ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
