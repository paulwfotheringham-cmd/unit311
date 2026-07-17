import { NextRequest, NextResponse } from "next/server";

import { requireInternalAdministratorSession } from "@/lib/internal-admin-auth";
import {
  createExternalUser,
  listExternalUsers,
} from "@/lib/external-platform-users-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireInternalAdministratorSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const users = await listExternalUsers();
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load external users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireInternalAdministratorSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      organisation?: string;
      username?: string;
      redirectPath?: string;
      password?: string;
    };

    if (!body.username?.trim()) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const result = await createExternalUser({
      name: body.name ?? "",
      organisation: body.organisation ?? "",
      username: body.username,
      redirectPath: body.redirectPath,
      password: body.password,
    });

    return NextResponse.json({
      user: result.user,
      temporaryPassword: result.temporaryPassword,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create external user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
