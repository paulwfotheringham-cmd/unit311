import {
  resolveSupportWorkspaceId,
  type SupportWorkspaceScope,
} from "@/lib/support-workspace";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function logWhatsAppInbound(
  input: {
    fromPhone?: string | null;
    fromName?: string | null;
    message: string;
    result?: string | null;
    error?: string | null;
  },
  scope?: SupportWorkspaceScope,
) {
  if (!isSupabaseConfigured()) return;

  try {
    const workspaceId = await resolveSupportWorkspaceId(scope);
    const supabase = createSupabaseServerClient();
    await supabase.from("whatsapp_inbound_log").insert({
      workspace_id: workspaceId,
      source: "textmebot",
      from_phone: input.fromPhone?.trim() || null,
      from_name: input.fromName?.trim() || null,
      message: input.message,
      result: input.result ?? null,
      error: input.error ?? null,
    });
  } catch (error) {
    console.error("[whatsapp/inbound] log failed", error);
  }
}
