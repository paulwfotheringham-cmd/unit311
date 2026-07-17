import { NextRequest, NextResponse } from "next/server";

import { reconcileWiseIncomingPayments } from "@/lib/accounting/wise-reconcile";

export const dynamic = "force-dynamic";

/**
 * Wise balance notification endpoint.
 * Verifies optional shared secret, then runs the same reconcile matcher as polling.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.WISE_WEBHOOK_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("x-wise-webhook-secret") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  try {
    await request.json().catch(() => ({}));
    const result = await reconcileWiseIncomingPayments();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 500 },
    );
  }
}
