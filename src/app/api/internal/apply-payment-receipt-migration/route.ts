import { NextRequest, NextResponse } from "next/server";

import {
  PAYMENT_RECEIPT_FILE_ID_MIGRATION_PATH,
  ensurePaymentReceiptFileIdColumn,
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
    const applied = await ensurePaymentReceiptFileIdColumn();
    if (!applied) {
      return NextResponse.json(
        {
          ok: false,
          migration: PAYMENT_RECEIPT_FILE_ID_MIGRATION_PATH,
          error: "Migration failed",
          readiness,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      migration: PAYMENT_RECEIPT_FILE_ID_MIGRATION_PATH,
      readiness,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed";
    return NextResponse.json({ error: message, readiness }, { status: 500 });
  }
}
