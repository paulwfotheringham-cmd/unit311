import { NextRequest, NextResponse } from "next/server";

import {
  CLIENT_PLATFORM_SUBDOMAIN_MIGRATION_PATH,
  ensureInternalClientsPlatformSubdomainColumns,
  getMigrationReadiness,
} from "@/lib/internal-db-migrations";

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

  const readiness = getMigrationReadiness();

  try {
    const applied = await ensureInternalClientsPlatformSubdomainColumns();
    if (!applied) {
      return NextResponse.json(
        {
          ok: false,
          migration: CLIENT_PLATFORM_SUBDOMAIN_MIGRATION_PATH,
          error: "Migration failed",
          readiness,
          hint:
            "Add SUPABASE_ACCESS_TOKEN or SUPABASE_DB_URL to the unit311central Vercel project, redeploy, then POST again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      migration: CLIENT_PLATFORM_SUBDOMAIN_MIGRATION_PATH,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed";
    return NextResponse.json({ error: message, readiness }, { status: 500 });
  }
}
