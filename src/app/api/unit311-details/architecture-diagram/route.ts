import { NextRequest, NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  regenerateWorkspaceArchitectureDiagram,
  resolveLatestWorkspaceArchitectureDiagram,
} from "@/lib/workspace-architecture-diagram-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const force = request.nextUrl.searchParams.get("regenerate") === "1";
    const format = request.nextUrl.searchParams.get("format");

    if (force) {
      await regenerateWorkspaceArchitectureDiagram();
    }

    const resolved = await resolveLatestWorkspaceArchitectureDiagram({
      regenerateIfMissing: true,
    });

    if (!resolved) {
      return NextResponse.json({ error: "Architecture diagram not found." }, { status: 404 });
    }

    if (format === "svg") {
      return new NextResponse(resolved.svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Disposition": `inline; filename="${resolved.link?.svgFileName ?? "workspace-architecture.svg"}"`,
        },
      });
    }

    return NextResponse.json({
      version: resolved.link?.version ?? null,
      generatedAt: resolved.link?.generatedAt ?? null,
      sourceDocument: resolved.link?.sourceDocument ?? "docs/WORKSPACE_ARCHITECTURE.md",
      svgFileName: resolved.link?.svgFileName ?? null,
      pngFileName: resolved.link?.pngFileName ?? null,
      svgFileId: resolved.svgFileId,
      pngFileId: resolved.pngFileId,
      svgDownloadUrl: resolved.svgDownloadUrl,
      pngDownloadUrl: resolved.pngDownloadUrl,
      folderId: resolved.folderId,
      regenerated: resolved.regenerated,
      svg: resolved.svg,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load architecture diagram";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const regenerated = await regenerateWorkspaceArchitectureDiagram();
    const latest = await resolveLatestWorkspaceArchitectureDiagram({
      regenerateIfMissing: false,
    });

    return NextResponse.json({
      version: regenerated.link.version,
      generatedAt: regenerated.link.generatedAt,
      sourceDocument: regenerated.link.sourceDocument,
      svgFileName: regenerated.link.svgFileName,
      pngFileName: regenerated.link.pngFileName,
      svgFileId: regenerated.svgFileId,
      pngFileId: regenerated.pngFileId,
      svgDownloadUrl: latest?.svgDownloadUrl ?? null,
      pngDownloadUrl: latest?.pngDownloadUrl ?? null,
      folderId: regenerated.folderId,
      regenerated: true,
      svg: regenerated.svg,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to regenerate architecture diagram";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
