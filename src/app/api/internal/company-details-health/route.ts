/**
 * Post-deploy health probe for Company Details (MOD-081).
 * Confirms migration 092 created `company_details`. Never mutates schema.
 */
import { NextResponse } from "next/server";

import {
  COMPANY_DETAILS_MIGRATION_FILE,
  COMPANY_DETAILS_MIGRATION_REQUIRED,
  isCompanyDetailsSchemaReady,
} from "@/lib/company-details-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        feature: "company-details",
        ready: false,
        reason: "supabase-not-configured",
      },
      { status: 503 },
    );
  }

  try {
    const ready = await isCompanyDetailsSchemaReady();
    if (!ready) {
      return NextResponse.json(
        {
          ok: false,
          feature: "company-details",
          ready: false,
          table: "company_details",
          migration: COMPANY_DETAILS_MIGRATION_FILE,
          error: COMPANY_DETAILS_MIGRATION_REQUIRED,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      feature: "company-details",
      ready: true,
      table: "company_details",
      migration: COMPANY_DETAILS_MIGRATION_FILE,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        feature: "company-details",
        ready: false,
        error: error instanceof Error ? error.message : "Company Details health probe failed.",
      },
      { status: 503 },
    );
  }
}
