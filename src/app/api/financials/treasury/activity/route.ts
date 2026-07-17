import { NextResponse } from "next/server";

import { listTreasuryActivity } from "@/lib/treasury/treasury-store";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    await requireCurrentWorkspace();
    const activity = await listTreasuryActivity(50);
    return NextResponse.json({ activity });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load activity.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
