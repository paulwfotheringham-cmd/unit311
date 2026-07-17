import { NextRequest, NextResponse } from "next/server";

import { deleteSupportTicket, getSupportTicket, updateSupportTicket } from "@/lib/support-tickets-service";
import type { SupportTicketPriority } from "@/lib/support-data";
import { notifyClientTicketAssigned } from "@/lib/support-client-notify";
import { withSupportTicketsTable } from "@/lib/internal-db-migrations";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function authErrorStatus(message: string) {
  return message.includes("Authentication required") || message.includes("Workspace context")
    ? 401
    : 500;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const { id } = await context.params;
    const ticket = await withSupportTicketsTable(() => getSupportTicket(id, scope));
    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }
    return NextResponse.json({ ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load support ticket";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      organisation?: string;
      priority?: SupportTicketPriority;
      description?: string;
      userAssigned?: string | null;
      archived?: boolean;
    };

    const ticket = await withSupportTicketsTable(async () => {
      const existing = await getSupportTicket(id, scope);
      if (!existing) {
        throw new Error("Support ticket not found.");
      }

      const updated = await updateSupportTicket(id, body, scope);
      const nextAssignee = body.userAssigned?.trim() || null;
      const previousAssignee = existing.userAssigned?.trim() || null;

      if (nextAssignee && nextAssignee !== previousAssignee) {
        await notifyClientTicketAssigned(updated, nextAssignee);
      }

      return updated;
    });
    return NextResponse.json({ ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update support ticket";
    const status = authErrorStatus(message) === 401 ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const scope = { workspaceId: workspace.id };

    const { id } = await context.params;
    await withSupportTicketsTable(() => deleteSupportTicket(id, scope));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete support ticket";
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) });
  }
}
