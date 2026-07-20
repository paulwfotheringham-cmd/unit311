import { NextResponse } from "next/server";

import { getInternalOperatorByUsername } from "@/lib/internal-operators-service";
import { getPlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
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

  let email: string | null = null;
  let role: string | null = null;

  if (session.userType === "internal" && isSupabaseConfigured()) {
    try {
      const operator = await getInternalOperatorByUsername(session.username);
      if (operator) {
        email = operator.email?.trim() || null;
        role = operator.role ?? null;
      }
    } catch {
      // Profile still returns session identity if operator lookup fails.
    }
  }

  return NextResponse.json({
    displayName: session.displayName,
    username: session.username,
    email,
    role,
    userType: session.userType,
    userId: session.sub,
    workspaceId: workspace?.id ?? null,
    workspaceSlug: workspace?.slug ?? null,
    workspaceName: workspace?.name ?? null,
  });
}
