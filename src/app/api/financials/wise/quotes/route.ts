import { NextRequest, NextResponse } from "next/server";

import { createWiseQuote } from "@/lib/wise-service";
import { requireWiseTreasuryConnection } from "@/lib/treasury/treasury-api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const gate = await requireWiseTreasuryConnection();
  if ("error" in gate) return gate.error;

  try {
    const body = (await request.json()) as {
      sourceCurrency?: string;
      targetCurrency?: string;
      sourceAmount?: number;
      targetAmount?: number;
      targetAccount?: number;
    };

    if (!body.sourceCurrency || !body.targetCurrency) {
      return NextResponse.json({ error: "sourceCurrency and targetCurrency are required." }, { status: 400 });
    }
    if (body.sourceAmount === undefined && body.targetAmount === undefined) {
      return NextResponse.json({ error: "sourceAmount or targetAmount is required." }, { status: 400 });
    }

    const quote = await createWiseQuote({
      sourceCurrency: body.sourceCurrency,
      targetCurrency: body.targetCurrency,
      sourceAmount: body.sourceAmount,
      targetAmount: body.targetAmount,
      targetAccount: body.targetAccount,
      profileId: gate.status.profileId ?? undefined,
    });

    return NextResponse.json({ quote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create quote.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
