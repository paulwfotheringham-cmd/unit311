import { NextRequest, NextResponse } from "next/server";

import {
  listAssistantActionDescriptors,
  type AssistantActionModule,
} from "@/lib/ai-operating-assistant/actions";
import { buildBusinessContext } from "@/lib/ai-operating-assistant/context-service";
import { getPlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";

/**
 * GET /api/executive-assistant/actions
 * Discover Action Framework operations available to the current user.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getPlatformSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const roleView = request.nextUrl.searchParams.get("roleView");
    const module = request.nextUrl.searchParams.get("module") as AssistantActionModule | null;
    const context = await buildBusinessContext({
      session,
      activeView: request.nextUrl.searchParams.get("activeView"),
      roleView,
    });

    const actions = listAssistantActionDescriptors({
      business: context,
      module: module || undefined,
    });

    return NextResponse.json({
      actions,
      count: actions.length,
      framework: "phase1",
      note:
        actions.length === 0
          ? "Action registry is empty — domain modules have not registered handlers yet."
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list actions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
