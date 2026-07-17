import { NextRequest, NextResponse } from "next/server";

import { activateCustomerFromPendingClient } from "@/lib/accounting/customer-activation-service";
import { requireInternalClientInWorkspace } from "@/lib/internal-clients-service";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Temporary test endpoint — runs the production Activation Service for a
 * Pending Payment client without settling the invoice (leaves it unpaid).
 * Wise automatic matching calls the same service with settleInvoice:true.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const session = await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    await requireInternalClientInWorkspace(id, { workspaceId: workspace.id });

    const result = await activateCustomerFromPendingClient({
      clientId: id,
      performedBy: session.sub,
      source: "manual_test",
      settleInvoice: false,
    });

    return NextResponse.json({
      ok: true,
      alreadyPaid: result.alreadyPaid,
      invoiceSettled: result.invoiceSettled,
      clientId: result.clientId,
      invoiceId: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
      invoiceStatus: result.invoice.status,
      workspaceId: result.workspaceId,
      workspaceSlug: result.workspaceSlug,
      workspaceUrl: result.workspaceUrl,
      loginEmail: result.loginEmail,
      welcomeEmailSent: result.welcomeEmailSent,
      crmLeadId: result.crmLeadId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to activate client.";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : message.includes("Client not found")
          ? 404
          : message.includes("only available") || message.includes("No invoice found")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
