import { NextRequest, NextResponse } from "next/server";

import type {
  ClientAccountStatus,
  ClientContractType,
  ClientIndustry,
  ClientRegion,
} from "@/lib/client-management-data";
import { createInternalClient, listInternalClients } from "@/lib/internal-clients-service";
import { ensureInternalClientsTable } from "@/lib/internal-db-migrations";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    await ensureInternalClientsTable();
    const clients = await listInternalClients({ workspaceId: workspace.id });
    return NextResponse.json({
      clients,
      workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load clients";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const body = (await request.json()) as {
      companyName?: string;
      industry?: ClientIndustry;
      primaryContact?: string;
      email?: string;
      phone?: string;
      region?: ClientRegion;
      accountStatus?: ClientAccountStatus;
      contractType?: ClientContractType;
      taxId?: string;
      billingAddress?: string;
      activeProjects?: number;
      notes?: string;
      platformUrl?: string;
    };

    await ensureInternalClientsTable();
    const client = await createInternalClient(body, { workspaceId: workspace.id });
    return NextResponse.json({ client });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create client";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
