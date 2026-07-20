import { NextRequest, NextResponse } from "next/server";

import {
  getDomainGoLiveRegister,
  setDomainGoLiveBlocked,
} from "@/lib/domain-go-live-service";
import { requireInternalWorkspaceSession } from "@/lib/internal-admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireInternalWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { domains, coverage } = await getDomainGoLiveRegister({
      workspaceId: auth.workspace.id,
    });
    return NextResponse.json({ domains, coverage });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Domain Go-Live register";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireInternalWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      blocked?: boolean;
      blockedReason?: string;
      notes?: string;
      status?: string;
    };

    if (body.status !== undefined) {
      return NextResponse.json(
        {
          error:
            "Domain Ready / In Progress / Not Started are derived from Module Go-Live and cannot be set directly. Only blocked (+ reason/notes) may be persisted.",
        },
        { status: 400 },
      );
    }

    const id = body.id?.trim();
    if (!id || typeof body.blocked !== "boolean") {
      return NextResponse.json(
        { error: "id and blocked (boolean) are required." },
        { status: 400 },
      );
    }

    const { domains, coverage } = await setDomainGoLiveBlocked(
      id,
      {
        blocked: body.blocked,
        blockedReason: body.blockedReason,
        notes: body.notes,
      },
      { workspaceId: auth.workspace.id },
    );

    return NextResponse.json({ domains, coverage });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update Domain Go-Live override";
    const status = message.startsWith("Unknown domain") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
