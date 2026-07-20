/**
 * Wave 0 foundation health probe.
 * Confirms isolation + onboarding + company_details schema presence. Never mutates schema.
 */
import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/server";
import { verifyWave0FoundationSchema } from "@/lib/wave0-foundation-verify";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        feature: "wave0-foundation",
        ready: false,
        reason: "supabase-not-configured",
      },
      { status: 503 },
    );
  }

  try {
    const report = await verifyWave0FoundationSchema();
    if (!report.ok) {
      return NextResponse.json(
        {
          ok: false,
          feature: "wave0-foundation",
          ready: false,
          method: report.method,
          checks: report.checks,
          error:
            report.method === "unavailable"
              ? "Unable to query database for Wave 0 foundation checks."
              : "One or more Wave 0 foundation schema checks failed.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      feature: "wave0-foundation",
      ready: true,
      method: report.method,
      checks: report.checks,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        feature: "wave0-foundation",
        ready: false,
        error:
          error instanceof Error ? error.message : "Wave 0 foundation health probe failed.",
      },
      { status: 503 },
    );
  }
}
