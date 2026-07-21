import { NextResponse } from "next/server";

import { getFinancialOverview } from "@/lib/accounting/overview-service";
import { listLeads } from "@/lib/crm-leads-service";
import { listOpenActionItems } from "@/lib/internal-action-items-service";
import { listCalendarEvents } from "@/lib/internal-calendar-service";
import { listInternalClients } from "@/lib/internal-clients-service";
import { listProjects } from "@/lib/internal-projects-service";
import { getPlatformSession } from "@/lib/platform-session";
import { listSupportTickets } from "@/lib/support-tickets-service";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Single round-trip Command Centre payload — parallel live reads.
 */
export async function GET() {
  const started = Date.now();
  try {
    const session = await getPlatformSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const workspace = await requireCurrentWorkspace();
    const workspaceId = workspace.id;
    const scope = { workspaceId };

    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 1);
    const to = new Date(today);
    to.setDate(to.getDate() + 1);

    const [projects, clients, leads, events, tickets, financials, apiActions] =
      await Promise.all([
        listProjects(scope).catch(() => []),
        listInternalClients(scope).catch(() => []),
        listLeads("All", scope).catch(() => []),
        listCalendarEvents(from.toISOString(), to.toISOString(), scope).catch(() => []),
        listSupportTickets(false, scope).catch(() => []),
        getFinancialOverview(scope).catch(() => null),
        listOpenActionItems(scope).catch(() => []),
      ]);

    return NextResponse.json({
      projects,
      clients,
      leads,
      events,
      tickets,
      financials,
      apiActions,
      elapsedMs: Date.now() - started,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load command centre",
        elapsedMs: Date.now() - started,
      },
      { status: 500 },
    );
  }
}
