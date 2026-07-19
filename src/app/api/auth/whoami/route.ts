import { NextResponse } from "next/server";

import { getPlatformSession } from "@/lib/platform-session";
import { getCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  // Active workspace comes from host → authz → getCurrentWorkspace only.
  // Never fall back to session workspace claim fields for tenancy.
  const workspace = await getCurrentWorkspace();

  return NextResponse.json({
    displayName: session.displayName,
    userId: session.sub,
    workspaceId: workspace?.id ?? null,
    workspaceSlug: workspace?.slug ?? null,
    workspaceName: workspace?.name ?? null,
  });
}
