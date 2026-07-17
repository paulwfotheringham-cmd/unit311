import { NextRequest, NextResponse } from "next/server";

import { reconcileWiseIncomingPayments } from "@/lib/accounting/wise-reconcile";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  const setupSecret = process.env.INTERNAL_FILES_SETUP_SECRET?.trim();
  const allowed =
    (cronSecret && auth === `Bearer ${cronSecret}`) ||
    (setupSecret && auth === `Bearer ${setupSecret}`);

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await reconcileWiseIncomingPayments();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reconcile failed." },
      { status: 500 },
    );
  }
}
