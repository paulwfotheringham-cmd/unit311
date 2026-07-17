import { NextRequest, NextResponse } from "next/server";

import { createSupportTicket, listSupportTickets } from "@/lib/support-tickets-service";
import type { SupportTicketPriority } from "@/lib/support-data";
import { ensureSupportTicketsTable, withSupportTicketsTable } from "@/lib/internal-db-migrations";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

function authErrorStatus(message: string) {
  return message.includes("Authentication required") || message.includes("Workspace context")
    ? 401
    : 500;
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    await ensureSupportTicketsTable();
    const includeArchived = request.nextUrl.searchParams.get("includeArchived") !== "false";
    const tickets = await withSupportTicketsTable(() => listSupportTickets(includeArchived, scope));
    return NextResponse.json({ tickets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load support tickets";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const body = (await request.json()) as {
      name?: string;
      organisation?: string;
      priority?: SupportTicketPriority;
      description?: string;
      userAssigned?: string | null;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const name = body.name.trim();
    const ticket = await withSupportTicketsTable(() =>
      createSupportTicket(
        {
          ...body,
          name,
        },
        scope,
      ),
    );
    return NextResponse.json({ ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create support ticket";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}
