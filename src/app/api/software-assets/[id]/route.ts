import { NextRequest, NextResponse } from "next/server";

import { ensureSoftwareAssetRegisterTables } from "@/lib/internal-db-migrations";
import { requirePlatformSession } from "@/lib/platform-session";
import type { SoftwareAsset } from "@/lib/software-assets-data";
import {
  deleteSoftwareAsset,
  getSoftwareAsset,
  updateSoftwareAsset,
} from "@/lib/software-assets-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    await ensureSoftwareAssetRegisterTables();
    const asset = await getSoftwareAsset(id, { workspaceId: workspace.id });
    if (!asset) {
      return NextResponse.json({ error: "Software asset not found." }, { status: 404 });
    }
    return NextResponse.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load software asset";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json()) as Partial<SoftwareAsset> & { password?: string | null };
    await ensureSoftwareAssetRegisterTables();
    const asset = await updateSoftwareAsset(id, body, { workspaceId: workspace.id });
    return NextResponse.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update software asset";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : message.includes("not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    await ensureSoftwareAssetRegisterTables();
    await deleteSoftwareAsset(id, { workspaceId: workspace.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete software asset";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : message.includes("not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
