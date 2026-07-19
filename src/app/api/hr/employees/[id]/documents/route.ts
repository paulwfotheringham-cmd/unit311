import { NextRequest, NextResponse } from "next/server";

import {
  deleteEmployeeDocument,
  listEmployeeDocuments,
  uploadEmployeeDocument,
} from "@/lib/hr-employees-service";
import { HR_DOCUMENT_TYPES, type HrDocumentType } from "@/lib/hr-data";
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
    const documents = await listEmployeeDocuments(id, { workspaceId: workspace.id });
    return NextResponse.json({ documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load documents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  try {
    const session = await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const { id } = await context.params;
    const form = await request.formData();
    const file = form.get("file");
    const documentType = String(form.get("documentType") ?? "");
    const title = String(form.get("title") ?? "");
    const notes = String(form.get("notes") ?? "");
    const expiresAt = String(form.get("expiresAt") ?? "");
    const uploadedBy =
      String(form.get("uploadedBy") ?? "") ||
      session.displayName ||
      session.username ||
      "system";

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }
    if (!(HR_DOCUMENT_TYPES as readonly string[]).includes(documentType)) {
      return NextResponse.json({ error: "Valid documentType is required." }, { status: 400 });
    }

    const document = await uploadEmployeeDocument(
      id,
      {
        file,
        documentType: documentType as HrDocumentType,
        title: title || undefined,
        uploadedBy,
        expiresAt: expiresAt || null,
        notes: notes || null,
      },
      { workspaceId: workspace.id },
    );
    return NextResponse.json({ document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
