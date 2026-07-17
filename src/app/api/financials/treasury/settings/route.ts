import { NextRequest, NextResponse } from "next/server";

import { getTreasurySettings, saveTreasurySettings } from "@/lib/treasury/treasury-store";
import { requirePlatformSession } from "@/lib/platform-session";
import type { TreasurySettings } from "@/lib/treasury/treasury-types";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const settings = await getTreasurySettings({ workspaceId: workspace.id });
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const body = (await request.json()) as { settings?: Partial<TreasurySettings> };
    const current = await getTreasurySettings({ workspaceId: workspace.id });
    const settings = await saveTreasurySettings(
      { ...current, ...(body.settings ?? {}) },
      { workspaceId: workspace.id },
    );
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save settings.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
