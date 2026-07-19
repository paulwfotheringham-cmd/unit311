import { NextRequest, NextResponse } from "next/server";

import { filterTreasuryTransactions } from "@/lib/treasury/treasury-utils";
import { requireWiseTreasuryConnection } from "@/lib/treasury/treasury-api-auth";
import { getWiseBalanceTransactions, wiseErrorToClientPayload } from "@/lib/wise-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ balanceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const gate = await requireWiseTreasuryConnection();
  if ("error" in gate) return gate.error;

  try {
    const { balanceId } = await context.params;
    const parsedBalanceId = Number(balanceId);
    if (!Number.isFinite(parsedBalanceId)) {
      return NextResponse.json({ error: "Invalid balance ID." }, { status: 400 });
    }

    const params = request.nextUrl.searchParams;
    const currency = params.get("currency")?.toUpperCase();
    if (!currency) {
      return NextResponse.json({ error: "currency is required." }, { status: 400 });
    }

    const intervalStart =
      params.get("intervalStart") ??
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const intervalEnd = params.get("intervalEnd") ?? new Date().toISOString();

    const result = await getWiseBalanceTransactions({
      balanceId: parsedBalanceId,
      currency,
      intervalStart,
      intervalEnd,
      profileId: gate.status.profileId ?? undefined,
    });

    const filtered = filterTreasuryTransactions(result.transactions, {
      search: params.get("search") ?? undefined,
      currency: params.get("filterCurrency") ?? undefined,
      direction: (params.get("direction") as "incoming" | "outgoing" | "all" | null) ?? "all",
      minAmount: params.get("minAmount") ? Number(params.get("minAmount")) : undefined,
      maxAmount: params.get("maxAmount") ? Number(params.get("maxAmount")) : undefined,
      dateFrom: params.get("dateFrom") ?? undefined,
      dateTo: params.get("dateTo") ?? undefined,
      page: params.get("page") ? Number(params.get("page")) : 1,
      pageSize: params.get("pageSize") ? Number(params.get("pageSize")) : 25,
    });

    return NextResponse.json({
      balanceId: parsedBalanceId,
      currency,
      intervalStart,
      intervalEnd,
      source: result.source,
      statementWarning: result.statementWarning,
      ...filtered,
      endOfStatementBalance: result.statement?.endOfStatementBalance ?? null,
    });
  } catch (error) {
    const payload = wiseErrorToClientPayload(error);
    return NextResponse.json(
      {
        ...payload.body,
        code: payload.isStatementAccessError ? "statement_access_denied" : undefined,
      },
      { status: payload.status },
    );
  }
}
