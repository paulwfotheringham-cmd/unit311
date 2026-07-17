import { NextResponse } from "next/server";

import { ensureSoftwareAssetRegisterTables } from "@/lib/internal-db-migrations";
import { requirePlatformSession } from "@/lib/platform-session";
import { revealSoftwareAssetPassword } from "@/lib/software-assets-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    await ensureSoftwareAssetRegisterTables();
    const password = await revealSoftwareAssetPassword(id, { workspaceId: workspace.id });
    return NextResponse.json({ password });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reveal password";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : message.includes("No password")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
