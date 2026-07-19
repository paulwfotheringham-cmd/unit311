import { NextRequest, NextResponse } from "next/server";

import {
  appendCompensationHistory,
  listCompensationHistory,
} from "@/lib/hr-employees-service";
import {
  HR_COMPENSATION_CATEGORIES,
  type HrCompensationCategory,
} from "@/lib/hr-data";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const entries = await listCompensationHistory(id, { workspaceId: workspace.id });
    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load compensation history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const body = (await request.json()) as {
      category?: string;
      effectiveDate?: string;
      amount?: number | null;
      currency?: string;
      reason?: string;
      approvedBy?: string;
      terms?: string | null;
    };

    if (
      !body.category ||
      !(HR_COMPENSATION_CATEGORIES as readonly string[]).includes(body.category)
    ) {
      return NextResponse.json({ error: "Valid category is required." }, { status: 400 });
    }
    if (!body.effectiveDate?.trim() || !body.reason?.trim() || !body.approvedBy?.trim()) {
      return NextResponse.json(
        { error: "effectiveDate, reason, and approvedBy are required." },
        { status: 400 },
      );
    }

    const entry = await appendCompensationHistory(
      id,
      {
        category: body.category as HrCompensationCategory,
        effectiveDate: body.effectiveDate,
        amount: body.amount ?? null,
        currency: body.currency,
        reason: body.reason,
        approvedBy: body.approvedBy,
        terms: body.terms,
      },
      { workspaceId: workspace.id },
    );
    return NextResponse.json({ entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add compensation history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
