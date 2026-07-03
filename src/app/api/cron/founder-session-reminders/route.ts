import { NextRequest, NextResponse } from "next/server";

import { sendDueFounderSessionReminders } from "@/lib/founder-booking/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDueFounderSessionReminders();
    return NextResponse.json({ ok: true, cron: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Founder session reminder cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
