import type { FinancialActivityItem } from "@/lib/accounting/types";
import {
  resolveFinancialsWorkspaceId,
  type FinancialsWorkspaceScope,
} from "@/lib/financials-workspace";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function activityLabel(sourceType: string, description: string) {
  const lower = description.toLowerCase();
  if (lower.includes("refund")) return "Refund";
  if (sourceType === "invoice_issue") return "Invoice Created";
  if (sourceType === "invoice_payment") return "Invoice Paid";
  if (sourceType === "wise_inbound") return "Wise Payment Received";
  if (sourceType === "wise_outbound") return "Wise Payment";
  if (sourceType === "expense") return "Expense Recorded";
  if (sourceType === "expense_payment") return "Expense Recorded";
  return "Journal Posted";
}

export async function listFinancialActivity(
  limit = 40,
  scope?: FinancialsWorkspaceScope,
): Promise<FinancialActivityItem[]> {
  if (!isSupabaseConfigured()) return [];

  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  const supabase = requireSupabase();
  const items: FinancialActivityItem[] = [];

  const { data: journals } = await supabase
    .from("journal_entries")
    .select("id, reference, description, source_type, created_at, posted_at, status")
    .eq("workspace_id", workspaceId)
    .eq("status", "posted")
    .order("posted_at", { ascending: false })
    .limit(limit);

  for (const journal of journals ?? []) {
    const sourceType = String(journal.source_type ?? "manual");
    const description = String(journal.description || journal.reference || "");
    items.push({
      id: `journal-${journal.id}`,
      type: sourceType,
      label: activityLabel(sourceType, description),
      description,
      amount: null,
      currency: null,
      at: journal.posted_at ?? journal.created_at,
      href: `?view=general-ledger&journal=${journal.id}`,
    });
  }

  items.sort((a, b) => b.at.localeCompare(a.at));
  return items.slice(0, limit);
}
