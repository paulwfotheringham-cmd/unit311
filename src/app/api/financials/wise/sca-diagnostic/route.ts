import { NextResponse } from "next/server";

import { requireWiseTreasuryConnection } from "@/lib/treasury/treasury-api-auth";
import {
  buildWiseScaFixSteps,
  getWiseScaKeyDiagnostics,
  listWiseBalances,
  verifyWiseBalanceStatementAccess,
  WiseApiError,
  wiseErrorToClientPayload,
} from "@/lib/wise-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireWiseTreasuryConnection();
  if ("error" in gate) return gate.error;

  const key = getWiseScaKeyDiagnostics();

  try {
    const balances = await listWiseBalances(gate.status.profileId ?? undefined);
    const verification = await verifyWiseBalanceStatementAccess({
      profileId: gate.status.profileId ?? undefined,
      balanceId: balances[0]?.id,
      currency: balances[0]?.currency,
    });

    return NextResponse.json({
      ok: true,
      key,
      verification,
      message:
        verification.source === "activities"
          ? "Wise balance statements are SCA-blocked for this profile, but completed activities loaded successfully."
          : "Wise balance statement access verified successfully.",
    });
  } catch (error) {
    const payload = wiseErrorToClientPayload(error);
    const wiseDetails =
      "wise" in payload.body ? payload.body.wise : undefined;
    const requestParameters =
      error instanceof WiseApiError ? error.requestParameters : undefined;

    return NextResponse.json(
      {
        ok: false,
        key,
        error: payload.body.error,
        wise: wiseDetails,
        requestParameters,
        fixSteps: buildWiseScaFixSteps(key, requestParameters),
        message:
          "Statement access failed. Regenerate the RSA key pair, upload the public key to the same Wise API token, and set WISE_API_PRIVATE_KEY_B64 on Vercel.",
      },
      { status: payload.status >= 400 && payload.status < 600 ? payload.status : 500 },
    );
  }
}
