import { NextRequest, NextResponse } from "next/server";

import { requireInternalClientInWorkspace } from "@/lib/internal-clients-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";
import { resetWorkspaceOnboardingForClient } from "@/lib/workspace-customer-onboarding-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    await requireInternalClientInWorkspace(id, { workspaceId: workspace.id });
    const result = await resetWorkspaceOnboardingForClient(id);
    return NextResponse.json({
      ...result,
      message: "Workspace onboarding reset. Next login will open the wizard.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reset onboarding.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : message.includes("Client not found")
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
