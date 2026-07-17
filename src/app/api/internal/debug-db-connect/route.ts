import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

import {
  getMigrationReadiness,
  listDatabaseConnectionCandidates,
  probeDatabaseConnection,
} from "@/lib/internal-db-migrations";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.INTERNAL_FILES_SETUP_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-setup-secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const readiness = getMigrationReadiness();
  const candidates = listDatabaseConnectionCandidates().map((entry) => ({
    label: entry.label,
    urlPreview: entry.url.replace(/:[^:@/]+@/, ":***@"),
  }));

  const probes = [];
  for (const candidate of listDatabaseConnectionCandidates()) {
    probes.push({
      label: candidate.label,
      ...(await probeDatabaseConnection(candidate.url)),
    });
  }

  let platformSubdomainColumn: boolean | null = null;
  const working = probes.find((entry) => entry.ok);
  if (working) {
    const candidate = listDatabaseConnectionCandidates().find((entry) => entry.label === working.label);
    if (candidate) {
      const client = new Client({
        connectionString: candidate.url,
        ssl: { rejectUnauthorized: false },
      });
      try {
        await client.connect();
        const result = await client.query<{ exists: boolean }>(
          `select exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = 'internal_clients'
              and column_name = 'platform_subdomain'
          ) as exists`,
        );
        platformSubdomainColumn = result.rows[0]?.exists === true;
      } catch (error) {
        probes.push({
          label: `${candidate.label}:column-check`,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        await client.end().catch(() => undefined);
      }
    }
  }

  return NextResponse.json({
    readiness,
    candidates,
    probes,
    platformSubdomainColumn,
  });
}
