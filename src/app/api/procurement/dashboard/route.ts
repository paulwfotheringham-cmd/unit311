import { NextResponse } from "next/server";

import {
  buildDashboardSnapshot,
  getProcurementMockSnapshot,
} from "@/lib/procurement-mock-store";
import { requirePlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";

/**
 * Procurement dashboard snapshot.
 * Currently served from the client mock store seed for demos;
 * swap to Supabase tables from migration 107 when wiring persistence.
 */
export async function GET() {
  try {
    await requirePlatformSession();
    const snapshot = getProcurementMockSnapshot();
    return NextResponse.json({
      dashboard: buildDashboardSnapshot(snapshot),
      counts: {
        suppliers: snapshot.suppliers.length,
        requisitions: snapshot.requisitions.length,
        purchaseOrders: snapshot.purchaseOrders.length,
        goodsReceipts: snapshot.goodsReceipts.length,
        invoiceMatches: snapshot.invoiceMatches.length,
        contracts: snapshot.contracts.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load procurement dashboard.";
    const status = message.includes("Authentication") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
