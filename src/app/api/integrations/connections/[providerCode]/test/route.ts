import { NextRequest, NextResponse } from "next/server";

import { requireInternalAdministratorWorkspaceSession } from "@/lib/internal-admin-auth";
import { INTEGRATION_FRAMEWORK_MIGRATION_REQUIRED } from "@/lib/integration-framework-data";
import { stubTestWorkspaceIntegrationConnection } from "@/lib/integration-framework-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ providerCode: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const auth = await requireInternalAdministratorWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { providerCode } = await context.params;
    const result = await stubTestWorkspaceIntegrationConnection(
      auth.workspace.id,
      decodeURIComponent(providerCode),
      auth.session.username,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to test integration connection";
    const status = message === INTEGRATION_FRAMEWORK_MIGRATION_REQUIRED ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
