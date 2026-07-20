import { NextRequest, NextResponse } from "next/server";

import { requireInternalAdministratorWorkspaceSession } from "@/lib/internal-admin-auth";
import { createInternalOperator, listInternalOperators } from "@/lib/internal-operators-service";
import { ensureInternalOperatorsTable } from "@/lib/internal-db-migrations";
import type { UserRegion, UserRole, UserStatus } from "@/lib/user-management-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireInternalAdministratorWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await ensureInternalOperatorsTable();
    const users = await listInternalOperators();
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireInternalAdministratorWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      operatorLabel?: string;
      fullName?: string;
      username?: string;
      email?: string;
      phone?: string;
      role?: string;
      status?: string;
      region?: string;
      licenseId?: string;
      notes?: string;
    };

    if (!body.fullName?.trim() || !body.username?.trim()) {
      return NextResponse.json(
        { error: "Full name and username are required" },
        { status: 400 },
      );
    }

    await ensureInternalOperatorsTable();
    const result = await createInternalOperator({
      operatorLabel: body.operatorLabel,
      fullName: body.fullName,
      username: body.username,
      email: body.email,
      phone: body.phone,
      role: body.role as UserRole | undefined,
      status: body.status as UserStatus | undefined,
      region: body.region as UserRegion | undefined,
      licenseId: body.licenseId,
      notes: body.notes,
      password: (body as { password?: string }).password,
    });
    return NextResponse.json({ user: result.user, temporaryPassword: result.temporaryPassword });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
