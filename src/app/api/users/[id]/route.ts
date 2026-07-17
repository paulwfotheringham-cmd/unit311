import { NextRequest, NextResponse } from "next/server";

import {
  deleteInternalOperator,
  setInternalOperatorPassword,
  updateInternalOperator,
} from "@/lib/internal-operators-service";
import type { UserRegion, UserRole, UserStatus } from "@/lib/user-management-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      operatorLabel?: string;
      fullName?: string;
      username?: string;
      email?: string;
      phone?: string;
      role?: UserRole;
      status?: UserStatus;
      region?: UserRegion;
      licenseId?: string;
      notes?: string;
    };

    const user = await updateInternalOperator(id, body);
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { action?: string; password?: string };

    if (body.action === "reset-password") {
      const result = await setInternalOperatorPassword(id);
      return NextResponse.json({ temporaryPassword: result.password });
    }

    if (body.action === "set-password") {
      const result = await setInternalOperatorPassword(id, body.password);
      return NextResponse.json({ password: result.password });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reset password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    await deleteInternalOperator(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
