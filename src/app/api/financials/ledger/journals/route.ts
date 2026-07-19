import { NextRequest, NextResponse } from "next/server";

import { createAndPostJournal, listJournals } from "@/lib/accounting/journal-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const journals = await listJournals(undefined, { workspaceId: workspace.id });
    return NextResponse.json({ journals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load journals.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const body = await request.json();
    const journal = await createAndPostJournal(
      {
        reference: String(body.reference ?? `MAN-${Date.now()}`),
        description: String(body.description ?? ""),
        clientId: body.clientId ?? null,
        sourceType: body.sourceType ?? "manual",
        sourceId: body.sourceId ?? `manual-${Date.now()}`,
        journalDate: body.journalDate,
        lines: body.lines ?? [],
      },
      { workspaceId: workspace.id },
    );
    return NextResponse.json({ journal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to post journal.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
