import { NextRequest, NextResponse } from "next/server";

import {
  listCrmActivitiesForLead,
  listCrmContactHistoryForLead,
} from "@/lib/crm-contact-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const workspaceId = workspace.id;
    const [history, activities] = await Promise.all([
      listCrmContactHistoryForLead(id, { workspaceId }),
      listCrmActivitiesForLead(id, { workspaceId }),
    ]);

    return NextResponse.json({ history, activities });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load CRM timeline";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : message.includes("does not exist") || message.includes("schema cache")
          ? 503
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
