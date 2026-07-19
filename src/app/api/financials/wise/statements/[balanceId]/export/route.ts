import { NextRequest, NextResponse } from "next/server";

import { transactionsToCsv } from "@/lib/treasury/treasury-utils";
import { requireWiseTreasuryConnection } from "@/lib/treasury/treasury-api-auth";
import { getWiseBalanceStatement, wiseErrorToClientPayload } from "@/lib/wise-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ balanceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const gate = await requireWiseTreasuryConnection();
  if ("error" in gate) return gate.error;

  try {
    const { balanceId } = await context.params;
    const parsedBalanceId = Number(balanceId);
    const params = request.nextUrl.searchParams;
    const currency = params.get("currency")?.toUpperCase();
    const format = params.get("format") === "pdf" ? "pdf" : "csv";

    if (!currency) {
      return NextResponse.json({ error: "currency is required." }, { status: 400 });
    }

    const intervalStart =
      params.get("intervalStart") ??
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const intervalEnd = params.get("intervalEnd") ?? new Date().toISOString();

    if (format === "pdf") {
      const result = await getWiseBalanceStatement({
        balanceId: parsedBalanceId,
        currency,
        intervalStart,
        intervalEnd,
        profileId: gate.status.profileId ?? undefined,
        format: "pdf",
      });

      return new NextResponse(result.content, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="wise-${currency}-statement.pdf"`,
        },
      });
    }

    const result = await getWiseBalanceStatement({
      balanceId: parsedBalanceId,
      currency,
      intervalStart,
      intervalEnd,
      profileId: gate.status.profileId ?? undefined,
    });

    const csv = transactionsToCsv(result.transactions);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="wise-${currency}-statement.csv"`,
      },
    });
  } catch (error) {
    const payload = wiseErrorToClientPayload(error);
    return NextResponse.json(payload.body, { status: payload.status });
  }
}
