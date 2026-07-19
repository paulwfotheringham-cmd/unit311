import { NextRequest, NextResponse } from "next/server";

import { ensureSoftwareAssetRegisterTables } from "@/lib/internal-db-migrations";
import { requirePlatformSession } from "@/lib/platform-session";
import {
  createSoftwareAsset,
  getSoftwareAssetsSummary,
} from "@/lib/software-assets-service";
import type { SoftwareAsset } from "@/lib/software-assets-data";
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
    await ensureSoftwareAssetRegisterTables();
    const { assets, summary } = await getSoftwareAssetsSummary({ workspaceId: workspace.id });
    return NextResponse.json({
      assets,
      summary,
      workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load software assets";
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
    const body = (await request.json()) as Partial<SoftwareAsset> & { password?: string | null };
    await ensureSoftwareAssetRegisterTables();
    const asset = await createSoftwareAsset(body, { workspaceId: workspace.id });
    return NextResponse.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create software asset";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
