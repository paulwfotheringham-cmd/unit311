import { NextRequest, NextResponse } from "next/server";

import { requireInternalAdministratorWorkspaceSession } from "@/lib/internal-admin-auth";
import {
  createExternalUser,
  listExternalUsers,
} from "@/lib/external-platform-users-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireInternalAdministratorWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const users = await listExternalUsers();
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load external users";
    const status = message.includes("migration 095") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
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
      name?: string;
      clientId?: string;
      organisation?: string;
      username?: string;
      email?: string;
      redirectPath?: string;
      password?: string;
    };

    if (!body.username?.trim()) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    if (!body.clientId?.trim()) {
      return NextResponse.json(
        { error: "clientId is required (Client Directory FK)." },
        { status: 400 },
      );
    }

    const result = await createExternalUser({
      name: body.name ?? "",
      clientId: body.clientId,
      username: body.username,
      email: body.email,
      redirectPath: body.redirectPath,
      password: body.password,
    });

    return NextResponse.json({
      user: result.user,
      temporaryPassword: result.temporaryPassword,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create external user";
    const status =
      message.includes("migration 095")
        ? 503
        : message.includes("required") || message.includes("not found")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
