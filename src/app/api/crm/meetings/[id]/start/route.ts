import { NextResponse } from "next/server";

import { sendFounderSessionStartReminder } from "@/lib/founder-booking/service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const result = await sendFounderSessionStartReminder(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send meeting reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
