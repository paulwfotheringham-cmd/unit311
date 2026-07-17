import { NextRequest, NextResponse } from "next/server";

import { ensureFounderSessionFocusOverviewColumns, getMigrationReadiness } from "@/lib/internal-db-migrations";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.INTERNAL_FILES_SETUP_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-setup-secret") === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const applied = await ensureFounderSessionFocusOverviewColumns();
    return NextResponse.json({
      ok: applied,
      readiness: getMigrationReadiness(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply focus overview migration";
    return NextResponse.json({ ok: false, error: message, readiness: getMigrationReadiness() }, { status: 500 });
  }
}
