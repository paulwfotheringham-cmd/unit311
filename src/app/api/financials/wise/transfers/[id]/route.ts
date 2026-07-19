import { NextResponse } from "next/server";

import { requireWiseTreasuryConnection } from "@/lib/treasury/treasury-api-auth";
import { getWiseTransfer, mapWiseTransferStage } from "@/lib/wise-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireWiseTreasuryConnection();
  if ("error" in gate) return gate.error;

  try {
    const { id } = await context.params;
    const transfer = await getWiseTransfer(Number(id));
    return NextResponse.json({
      transfer,
      stage: mapWiseTransferStage(transfer.status),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load transfer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
