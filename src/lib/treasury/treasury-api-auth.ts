import { NextResponse } from "next/server";

import { requirePlatformSession, getPlatformSession } from "@/lib/platform-session";
import { getWiseConnectionStatus } from "@/lib/wise-service";
import {
  INTERNAL_WORKSPACE_SLUG,
  requireCurrentWorkspace,
  type CurrentWorkspace,
} from "@/lib/workspace-context";

export const WISE_INTERNAL_ONLY_MESSAGE = "Wise treasury is Internal-only.";

export async function requireTreasuryApiSession():
  Promise<
    | { error: NextResponse }
    | { session: NonNullable<Awaited<ReturnType<typeof getPlatformSession>>> }
  > {
  const session = await getPlatformSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  return { session };
}

/**
 * Session + workspace required. Wise bank data is Internal (unit311) only.
 */
export async function requireInternalWiseWorkspace():
  Promise<
    | { error: NextResponse }
    | {
        session: NonNullable<Awaited<ReturnType<typeof getPlatformSession>>>;
        workspace: CurrentWorkspace;
      }
  > {
  try {
    const session = await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    if (workspace.slug !== INTERNAL_WORKSPACE_SLUG) {
      return {
        error: NextResponse.json({ error: WISE_INTERNAL_ONLY_MESSAGE }, { status: 403 }),
      };
    }
    return { session, workspace };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return { error: NextResponse.json({ error: message }, { status }) };
  }
}

export async function requireWiseTreasuryConnection():
  Promise<
    | { error: NextResponse }
    | {
        session: NonNullable<Awaited<ReturnType<typeof getPlatformSession>>>;
        workspace: CurrentWorkspace;
        status: Awaited<ReturnType<typeof getWiseConnectionStatus>>;
      }
  > {
  const auth = await requireInternalWiseWorkspace();
  if ("error" in auth) return auth;

  const status = await getWiseConnectionStatus();
  if (!status.configured) {
    return {
      error: NextResponse.json(
        { error: "Wise is not configured.", status },
        { status: 503 },
      ),
    };
  }
  if (!status.connected || !status.profileId) {
    return {
      error: NextResponse.json(
        { error: status.error ?? "Unable to connect to Wise.", status },
        { status: 502 },
      ),
    };
  }

  return { session: auth.session, workspace: auth.workspace, status };
}
