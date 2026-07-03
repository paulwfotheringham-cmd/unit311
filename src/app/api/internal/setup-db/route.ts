import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

import {
  COMPETITORS_MIGRATION_PATH,
  FOUNDER_SESSION_BOOKINGS_MIGRATION_PATH,
  WHITEBOARD_MIGRATION_PATH,
  ensureCompetitorsTable,
  ensureFounderSessionBookingsTable,
  ensureWhiteboardTable,
} from "@/lib/internal-db-migrations";

export const dynamic = "force-dynamic";

function getDatabaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? null;
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.INTERNAL_FILES_SETUP_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-setup-secret") === secret;
}

async function tableExists(client: Client, tableName: string) {
  const result = await client.query<{ exists: boolean }>(
    `select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = $1
    ) as exists`,
    [tableName],
  );
  return result.rows[0]?.exists === true;
}

export async function GET() {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    return NextResponse.json(
      {
        ready: false,
        error: "SUPABASE_DB_URL is not set. Add your Supabase database connection string to Vercel.",
      },
      { status: 503 },
    );
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    const competitors = await tableExists(client, "competitors");
    const whiteboard = await tableExists(client, "internal_whiteboard");
    const founderSessionBookings = await tableExists(client, "founder_session_bookings");

    return NextResponse.json({
      ready: true,
      tables: { competitors, whiteboard, founderSessionBookings },
      canRunSetup: Boolean(process.env.INTERNAL_FILES_SETUP_SECRET),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json({ ready: false, error: message }, { status: 500 });
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getDatabaseUrl()) {
    return NextResponse.json(
      { error: "SUPABASE_DB_URL is not set. Add your Supabase database connection string to Vercel." },
      { status: 503 },
    );
  }

  try {
    const applied: string[] = [];
    const skipped: string[] = [];

    const client = new Client({
      connectionString: getDatabaseUrl()!,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    if (await tableExists(client, "competitors")) {
      skipped.push("competitors");
    } else {
      await ensureCompetitorsTable();
      applied.push("competitors");
    }

    if (await tableExists(client, "internal_whiteboard")) {
      skipped.push("internal_whiteboard");
    } else {
      await ensureWhiteboardTable();
      applied.push("internal_whiteboard");
    }

    if (await tableExists(client, "founder_session_bookings")) {
      skipped.push("founder_session_bookings");
    } else {
      await ensureFounderSessionBookingsTable();
      applied.push("founder_session_bookings");
    }

    await client.end().catch(() => undefined);

    return NextResponse.json({
      ok: true,
      applied,
      skipped,
      migrations: [
        COMPETITORS_MIGRATION_PATH,
        WHITEBOARD_MIGRATION_PATH,
        FOUNDER_SESSION_BOOKINGS_MIGRATION_PATH,
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
