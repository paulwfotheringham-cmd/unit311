import { NextResponse } from "next/server";

import { requireInternalWiseWorkspace } from "@/lib/treasury/treasury-api-auth";
import { getWiseConnectionStatus, listWiseBalances } from "@/lib/wise-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireInternalWiseWorkspace();
  if ("error" in gate) return gate.error;

  try {
    const status = await getWiseConnectionStatus();
    if (!status.configured) {
      return NextResponse.json(
        {
          error: "Wise is not configured. Add WISE_API_TOKEN and WISE_PROFILE_ID in Vercel env.",
          status,
        },
        { status: 503 },
      );
    }

    if (!status.connected) {
      return NextResponse.json(
        {
          error: status.error ?? "Unable to connect to Wise.",
          status,
        },
        { status: 502 },
      );
    }

    const balances = await listWiseBalances(status.profileId ?? undefined);
    return NextResponse.json({
      balances,
      fetchedAt: new Date().toISOString(),
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Wise balances.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
