import { NextResponse } from "next/server";

import { requireInternalWiseWorkspace } from "@/lib/treasury/treasury-api-auth";
import { reconcileWiseIncomingPayments } from "@/lib/accounting/wise-reconcile";

export const dynamic = "force-dynamic";

export async function POST() {
  const gate = await requireInternalWiseWorkspace();
  if ("error" in gate) return gate.error;

  try {
    const result = await reconcileWiseIncomingPayments();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to reconcile Wise payments." },
      { status: 500 },
    );
  }
}
