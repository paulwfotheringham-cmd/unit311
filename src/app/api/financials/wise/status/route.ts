import { NextResponse } from "next/server";

import { requireInternalWiseWorkspace } from "@/lib/treasury/treasury-api-auth";
import { getWiseConnectionStatus, getWiseScaKeyDiagnostics } from "@/lib/wise-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireInternalWiseWorkspace();
  if ("error" in gate) return gate.error;

  try {
    const status = await getWiseConnectionStatus();
    const sca = getWiseScaKeyDiagnostics();
    return NextResponse.json({
      ...status,
      scaPrivateKeyConfigured: sca.parseable,
      scaKey: sca,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check Wise connection.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
