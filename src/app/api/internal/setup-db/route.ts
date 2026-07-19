import { NextRequest, NextResponse } from "next/server";

import {
  CLIENT_ONBOARDING_MIGRATION_PATH,
  CLIENT_PLATFORM_SUBDOMAIN_MIGRATION_PATH,
  COMPETITORS_MIGRATION_PATH,
  FOUNDER_SESSION_BOOKINGS_MIGRATION_PATH,
  PAYMENT_RECEIPT_FILE_ID_MIGRATION_PATH,
  WHITEBOARD_MIGRATION_PATH,
  ensureClientOnboardingRecordsTable,
  ensureCompetitorsTable,
  ensureFounderSessionBookingsTable,
  ensureInternalClientsPlatformSubdomainColumns,
  ensurePaymentReceiptFileIdColumn,
  ensureWhiteboardTable,
  columnExistsViaRestApi,
  getMigrationReadiness,
  queryScalarViaManagementApi,
  resolveDatabaseUrl,
  withResolvedDatabaseClient,
} from "@/lib/internal-db-migrations";
import { Client, type ClientBase } from "pg";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.INTERNAL_FILES_SETUP_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-setup-secret") === secret;
}

async function tableExists(client: ClientBase, tableName: string) {
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

async function tableExistsAnywhere(tableName: string) {
  const viaApi = await queryScalarViaManagementApi<{ exists: boolean }>(
    `select exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = '${tableName}'
    ) as exists`,
  );
  if (viaApi?.exists === true) return true;

  const viaDb = await withResolvedDatabaseClient(async (client) => tableExists(client, tableName));
  if (viaDb === true) return true;

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (supabaseUrl && anonKey) {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${tableName}?select=id&limit=1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      },
    );
    if (response.ok) return true;
  }

  return false;
}

async function columnExistsAnywhere(tableName: string, columnName: string) {
  const viaApi = await queryScalarViaManagementApi<{ exists: boolean }>(
    `select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = '${tableName}'
        and column_name = '${columnName}'
    ) as exists`,
  );
  if (viaApi?.exists === true) return true;

  const viaDb = await withResolvedDatabaseClient(async (client) => {
    const result = await client.query<{ exists: boolean }>(
      `select exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = $1
          and column_name = $2
      ) as exists`,
      [tableName, columnName],
    );
    return result.rows[0]?.exists === true;
  });
  if (viaDb === true) return true;

  return (await columnExistsViaRestApi(tableName, columnName)) === true;
}

export async function GET() {
  const readiness = getMigrationReadiness();
  const hasDbAccess =
    Boolean(resolveDatabaseUrl()) ||
    readiness.hasSupabaseAccessToken ||
    (readiness.hasSupabaseUrl && Boolean(process.env.SUPABASE_ANON_KEY));

  if (!hasDbAccess) {
    return NextResponse.json(
      {
        ready: false,
        error:
          "Database credentials are not configured. Add SUPABASE_DB_URL, SUPABASE_DB_PASSWORD, or SUPABASE_ACCESS_TOKEN on Vercel.",
        readiness,
      },
      { status: 503 },
    );
  }

  try {
    const [competitors, whiteboard, founderSessionBookings, clientOnboardingRecords] =
      await Promise.all([
        tableExistsAnywhere("competitors"),
        tableExistsAnywhere("internal_whiteboard"),
        tableExistsAnywhere("founder_session_bookings"),
        tableExistsAnywhere("client_onboarding_records"),
      ]);
    const platformSubdomain = await columnExistsAnywhere("internal_clients", "platform_subdomain");
    const paymentReceiptFileId = await columnExistsAnywhere(
      "platform_organisations",
      "payment_receipt_file_id",
    );

    return NextResponse.json({
      ready: true,
      readiness,
      tables: {
        competitors,
        whiteboard,
        founderSessionBookings,
        clientOnboardingRecords,
        platformSubdomain,
        paymentReceiptFileId,
      },
      canRunSetup: readiness.hasSetupSecret,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database check failed";
    return NextResponse.json({ ready: false, error: message, readiness }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const readiness = getMigrationReadiness();
  if (!resolveDatabaseUrl() && !readiness.hasSupabaseAccessToken) {
    return NextResponse.json(
      {
        error:
          "Database credentials are not configured. Add SUPABASE_DB_URL, SUPABASE_DB_PASSWORD, or SUPABASE_ACCESS_TOKEN on Vercel.",
        readiness,
      },
      { status: 503 },
    );
  }

  try {
    const applied: string[] = [];
    const skipped: string[] = [];

    if (await tableExistsAnywhere("competitors")) {
      skipped.push("competitors");
    } else {
      await ensureCompetitorsTable();
      applied.push("competitors");
    }

    if (await tableExistsAnywhere("internal_whiteboard")) {
      skipped.push("internal_whiteboard");
    } else {
      await ensureWhiteboardTable();
      applied.push("internal_whiteboard");
    }

    if (await tableExistsAnywhere("founder_session_bookings")) {
      skipped.push("founder_session_bookings");
    } else {
      await ensureFounderSessionBookingsTable();
      applied.push("founder_session_bookings");
    }

    if (await tableExistsAnywhere("client_onboarding_records")) {
      skipped.push("client_onboarding_records");
    } else {
      await ensureClientOnboardingRecordsTable();
      applied.push("client_onboarding_records");
    }

    if (await columnExistsAnywhere("internal_clients", "platform_subdomain")) {
      skipped.push("platform_subdomain");
    } else {
      const ok = await ensureInternalClientsPlatformSubdomainColumns();
      if (!ok) throw new Error("Failed to apply platform subdomain migration.");
      applied.push("platform_subdomain");
    }

    if (await columnExistsAnywhere("platform_organisations", "payment_receipt_file_id")) {
      skipped.push("payment_receipt_file_id");
    } else {
      const ok = await ensurePaymentReceiptFileIdColumn();
      if (!ok) throw new Error("Failed to apply payment receipt file id migration.");
      applied.push("payment_receipt_file_id");
    }

    return NextResponse.json({
      ok: true,
      applied,
      skipped,
      readiness,
      migrations: [
        COMPETITORS_MIGRATION_PATH,
        WHITEBOARD_MIGRATION_PATH,
        FOUNDER_SESSION_BOOKINGS_MIGRATION_PATH,
        CLIENT_ONBOARDING_MIGRATION_PATH,
        CLIENT_PLATFORM_SUBDOMAIN_MIGRATION_PATH,
        PAYMENT_RECEIPT_FILE_ID_MIGRATION_PATH,
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed";
    return NextResponse.json({ error: message, readiness }, { status: 500 });
  }
}
