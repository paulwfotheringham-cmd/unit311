import { NextResponse } from "next/server";

import { getPublicEmailAccounts, isAccountConfigured } from "@/lib/email/accounts";
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
    await requireCurrentWorkspace();

    const accounts = await Promise.all(
      getPublicEmailAccounts().map(async (account) => ({
        ...account,
        configured: await isAccountConfigured(account.id),
      })),
    );

    return NextResponse.json(accounts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load email accounts";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}
