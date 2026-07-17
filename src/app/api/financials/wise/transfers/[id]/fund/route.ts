import { NextRequest, NextResponse } from "next/server";

import { requireWiseTreasuryConnection } from "@/lib/treasury/treasury-api-auth";
import { fundWiseTransfer, getWiseTransfer, mapWiseTransferStage } from "@/lib/wise-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const gate = await requireWiseTreasuryConnection();
  if ("error" in gate) return gate.error;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { balanceId?: number };
    if (!body.balanceId) {
      return NextResponse.json({ error: "balanceId is required." }, { status: 400 });
    }

    await fundWiseTransfer({
      transferId: Number(id),
      balanceId: body.balanceId,
      profileId: gate.status.profileId ?? undefined,
    });

    const transfer = await getWiseTransfer(Number(id));
    return NextResponse.json({
      transfer,
      stage: mapWiseTransferStage(transfer.status),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fund transfer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
