import { NextRequest, NextResponse } from "next/server";

import { requireInternalAdministratorWorkspaceSession } from "@/lib/internal-admin-auth";
import {
  INTEGRATION_FRAMEWORK_MIGRATION_REQUIRED,
  isIntegrationConnectionStatus,
} from "@/lib/integration-framework-data";
import {
  deleteWorkspaceIntegrationConnection,
  getWorkspaceIntegrationConnectionByProviderCode,
  upsertWorkspaceIntegrationConnection,
} from "@/lib/integration-framework-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ providerCode: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireInternalAdministratorWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { providerCode } = await context.params;
    const connection = await getWorkspaceIntegrationConnectionByProviderCode(
      auth.workspace.id,
      decodeURIComponent(providerCode),
    );
    if (!connection) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    }
    return NextResponse.json({ connection });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load integration connection";
    const status = message === INTEGRATION_FRAMEWORK_MIGRATION_REQUIRED ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireInternalAdministratorWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { providerCode } = await context.params;
    const body = (await request.json()) as {
      enabled?: boolean;
      status?: string;
      manualMode?: boolean;
      authMethod?: string | null;
      isDefaultForCategory?: boolean;
      displayLabel?: string | null;
      config?: Record<string, unknown>;
      capabilities?: string[];
      notes?: string | null;
      credentials?: Record<string, unknown> | null;
      clearCredentials?: boolean;
    };

    if (body.status !== undefined && !isIntegrationConnectionStatus(body.status)) {
      return NextResponse.json(
        { error: "status must be disconnected, connected, or error." },
        { status: 400 },
      );
    }

    const connection = await upsertWorkspaceIntegrationConnection({
      workspaceId: auth.workspace.id,
      providerCode: decodeURIComponent(providerCode),
      actor: auth.session.username,
      enabled: body.enabled,
      status: isIntegrationConnectionStatus(body.status) ? body.status : undefined,
      manualMode: body.manualMode,
      authMethod: body.authMethod,
      isDefaultForCategory: body.isDefaultForCategory,
      displayLabel: body.displayLabel,
      config: body.config,
      capabilities: body.capabilities,
      notes: body.notes,
      credentials: body.credentials,
      clearCredentials: body.clearCredentials === true,
    });

    return NextResponse.json({ connection });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upsert integration connection";
    const status =
      message === INTEGRATION_FRAMEWORK_MIGRATION_REQUIRED
        ? 503
        : message.startsWith("Unknown provider")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireInternalAdministratorWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { providerCode } = await context.params;
    await deleteWorkspaceIntegrationConnection(
      auth.workspace.id,
      decodeURIComponent(providerCode),
      auth.session.username,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect integration";
    const status = message === INTEGRATION_FRAMEWORK_MIGRATION_REQUIRED ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
