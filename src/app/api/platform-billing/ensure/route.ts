import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { isInternalDomainHost } from "@/lib/app-domains";
import {
  ensurePlatformCustomerSubscriptionsTable,
  getMigrationReadiness,
} from "@/lib/internal-db-migrations";
import { listPlatformCustomerSubscriptions } from "@/lib/platform-billing-service";
import { requirePlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";

async function assertInternalAccess() {
  await requirePlatformSession();
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";
  const internalHeader = headerStore.get("x-unit311-internal");
  if (!isInternalDomainHost(host) && internalHeader !== "1") {
    return NextResponse.json(
      { error: "Platform Billing schema setup is only available on Internal Unit311." },
      { status: 403 },
    );
  }
  return null;
}

/** Create platform_customer_subscriptions if missing, then return current rows. */
export async function POST() {
  try {
    const denied = await assertInternalAccess();
    if (denied) return denied;

    const readiness = getMigrationReadiness();
    const ensured = await ensurePlatformCustomerSubscriptionsTable();
    if (!ensured) {
      return NextResponse.json(
        {
          error:
            "Could not create platform_customer_subscriptions. Check SUPABASE_ACCESS_TOKEN / database URL on the Unit311 Central Vercel project.",
          readiness,
          ensured: false,
        },
        { status: 500 },
      );
    }

    const subscriptions = await listPlatformCustomerSubscriptions();
    return NextResponse.json({
      ok: true,
      ensured: true,
      customers: subscriptions.length,
      subscriptions,
      readiness,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to ensure platform billing schema.";
    const status = message === "Authentication required." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
