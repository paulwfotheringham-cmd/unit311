import { NextRequest, NextResponse } from "next/server";

import { requireInternalWorkspaceSession } from "@/lib/internal-admin-auth";
import {
  isModuleGoLiveStatus,
  type ModuleGoLiveEntry,
} from "@/lib/module-go-live-data";
import {
  getModuleGoLiveRegister,
  saveModuleGoLiveRegister,
  updateModuleGoLiveStatus,
} from "@/lib/module-go-live-service";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireInternalWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const modules = await getModuleGoLiveRegister({ workspaceId: auth.workspace.id });
    return NextResponse.json({ modules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Module Go-Live register";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireInternalWorkspaceSession();
  if ("error" in auth) return auth.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const scope = { workspaceId: auth.workspace.id };

  try {
    const body = (await request.json()) as {
      id?: string;
      status?: string;
      modules?: ModuleGoLiveEntry[];
    };

    if (Array.isArray(body.modules)) {
      const modules = await saveModuleGoLiveRegister(body.modules, scope);
      return NextResponse.json({ modules });
    }

    const id = body.id?.trim();
    if (!id || !isModuleGoLiveStatus(body.status)) {
      return NextResponse.json(
        { error: "id and status (Not Started | Needs Work | Ready) are required." },
        { status: 400 },
      );
    }

    const modules = await updateModuleGoLiveStatus(id, body.status, scope);
    return NextResponse.json({ modules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update Module Go-Live register";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
