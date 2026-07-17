import { NextRequest, NextResponse } from "next/server";

import { parseAccountId } from "@/lib/email/accounts";
import {
  getMailboxCredentialStatus,
  saveMailboxCredentials,
} from "@/lib/email/credentials-service";
import { emailErrorResponse } from "@/lib/email/api-utils";
import type { EmailAccountId } from "@/lib/email/types";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authErrorStatus(message: string) {
  return message.includes("Authentication required") || message.includes("Workspace context")
    ? 401
    : 500;
}

export async function GET() {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const status = await getMailboxCredentialStatus({ workspaceId: workspace.id });
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof Error && authErrorStatus(error.message) === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return emailErrorResponse(error, "Failed to load mailbox credential status.");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const body = (await request.json()) as {
      account?: EmailAccountId;
      password?: string;
      email?: string;
    };

    const account = parseAccountId(body.account ?? null);
    if (!account) {
      return NextResponse.json({ error: "Valid account is required." }, { status: 400 });
    }
    if (!body.password?.trim()) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    const saved = await saveMailboxCredentials(account, body.password, body.email, scope);
    const status = await getMailboxCredentialStatus(scope);

    return NextResponse.json({ ok: true, saved, status });
  } catch (error) {
    if (error instanceof Error && authErrorStatus(error.message) === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return emailErrorResponse(error, "Failed to save mailbox credentials.");
  }
}
