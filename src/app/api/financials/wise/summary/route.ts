import { NextResponse } from "next/server";

import {
  buildBalanceSnapshotAnalytics,
  buildTreasuryAnalytics,
  computeTreasurySummary,
} from "@/lib/treasury/treasury-analytics";
import { defaultStatementInterval } from "@/lib/treasury/treasury-utils";
import { listTreasuryActivity, listTreasuryNotifications } from "@/lib/treasury/treasury-store";
import { requireWiseTreasuryConnection } from "@/lib/treasury/treasury-api-auth";
import {
  getWiseBalanceTransactions,
  wiseErrorToClientPayload,
  listWiseBalances,
} from "@/lib/wise-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireWiseTreasuryConnection();
  if ("error" in gate) return gate.error;

  try {
    const balances = await listWiseBalances(gate.status.profileId ?? undefined);
    const { intervalStart, intervalEnd } = defaultStatementInterval(90);

    const statementResults: PromiseSettledResult<
      Awaited<ReturnType<typeof getWiseBalanceTransactions>>["transactions"]
    >[] = [];

    const statementWarnings: string[] = [];

    for (const balance of balances) {
      try {
        const result = await getWiseBalanceTransactions({
          balanceId: balance.id,
          currency: balance.currency,
          intervalStart,
          intervalEnd,
          profileId: gate.status.profileId ?? undefined,
        });
        statementResults.push({ status: "fulfilled", value: result.transactions });
        if (result.statementWarning) statementWarnings.push(result.statementWarning);
      } catch (error) {
        statementResults.push({ status: "rejected", reason: error });
      }
    }

    const allTransactions = statementResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );

    const statementFailures = statementResults.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    const statementsAvailable =
      balances.length === 0 || statementFailures.length === 0 || allTransactions.length > 0;
    const statementErrors = statementFailures.map((result) => {
      const payload = wiseErrorToClientPayload(result.reason);
      return payload.body;
    });
    const statementsWarning =
      statementWarnings[0] ??
      (!statementsAvailable && balances.length > 0
        ? (statementErrors[0]?.error ??
          "Some balance statements could not be loaded. Live balances are still shown below.")
        : null);

    const balanceAmounts = balances.map((balance) => ({
      currency: balance.currency,
      amount: balance.amount,
    }));

    const summary = computeTreasurySummary(allTransactions, balanceAmounts);
    const analytics =
      allTransactions.length > 0
        ? buildTreasuryAnalytics(allTransactions)
        : buildBalanceSnapshotAnalytics(balanceAmounts);
    const activity = await listTreasuryActivity(20);
    const notifications = await listTreasuryNotifications(20);

    return NextResponse.json({
      summary,
      analytics,
      activity,
      notifications,
      balances,
      statementsAvailable,
      statementsWarning,
      statementErrors: statementErrors.length > 0 ? statementErrors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load treasury summary.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
