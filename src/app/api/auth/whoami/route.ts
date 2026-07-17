import { NextResponse } from "next/server";

import { getPlatformSession } from "@/lib/platform-session";
import { getCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const workspace = await getCurrentWorkspace();

  return NextResponse.json({
    displayName: session.displayName,
    userId: session.sub,
    workspaceId: workspace?.id ?? session.workspaceId ?? null,
    workspaceSlug: workspace?.slug ?? session.workspaceSlug ?? null,
    workspaceName: workspace?.name ?? session.workspaceName ?? null,
  });
}
