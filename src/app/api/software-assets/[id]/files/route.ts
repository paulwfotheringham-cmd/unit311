import { NextRequest, NextResponse } from "next/server";

import { ensureSoftwareAssetRegisterTables } from "@/lib/internal-db-migrations";
import { requirePlatformSession } from "@/lib/platform-session";
import type { SoftwareAttachmentKind } from "@/lib/software-assets-data";
import {
  linkSoftwareAssetFile,
  unlinkSoftwareAssetFile,
} from "@/lib/software-assets-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json()) as {
      fileObjectId?: string;
      attachmentKind?: SoftwareAttachmentKind;
      linkId?: string;
      action?: "link" | "unlink";
    };

    await ensureSoftwareAssetRegisterTables();

    if (body.action === "unlink" || body.linkId) {
      if (!body.linkId) {
        return NextResponse.json({ error: "linkId is required to unlink." }, { status: 400 });
      }
      const asset = await unlinkSoftwareAssetFile({
        assetId: id,
        linkId: body.linkId,
        scope: { workspaceId: workspace.id },
      });
      return NextResponse.json({ asset });
    }

    if (!body.fileObjectId?.trim()) {
      return NextResponse.json({ error: "fileObjectId is required." }, { status: 400 });
    }

    const asset = await linkSoftwareAssetFile({
      assetId: id,
      fileObjectId: body.fileObjectId.trim(),
      attachmentKind: body.attachmentKind,
      scope: { workspaceId: workspace.id },
    });
    return NextResponse.json({ asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update attachments";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
