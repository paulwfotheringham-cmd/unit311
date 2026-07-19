import {
  postExpenseJournal,
  postExpensePaymentJournal,
} from "@/lib/accounting/posting-rules";
import {
  createBlankExpenseInput,
  getInternalUserById,
  mapFinancialExpense,
  type ExpenseCurrency,
  type FinancialExpense,
} from "@/lib/expenses-data";
import {
  resolveFinancialsWorkspaceId,
  type FinancialsWorkspaceScope,
} from "@/lib/financials-workspace";
import {
  ensureFinancialExpensesTable,
  withFinancialExpensesTable,
} from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type DbExpense = Parameters<typeof mapFinancialExpense>[0];

export type ExpensesWorkspaceScope = FinancialsWorkspaceScope;

function requireExpensesSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

export async function listExpenses(
  scope?: ExpensesWorkspaceScope,
): Promise<FinancialExpense[]> {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  await ensureFinancialExpensesTable();
  return withFinancialExpensesTable(async () => {
    const supabase = requireExpensesSupabase();
    const { data, error } = await supabase
      .from("financial_expenses")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("date_submitted", { ascending: false });

    if (error) throw new Error(error.message);
    return (data as DbExpense[]).map(mapFinancialExpense);
  });
}

export async function getExpense(
  id: string,
  scope?: ExpensesWorkspaceScope,
): Promise<FinancialExpense | null> {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  await ensureFinancialExpensesTable();
  return withFinancialExpensesTable(async () => {
    const supabase = requireExpensesSupabase();
    const { data, error } = await supabase
      .from("financial_expenses")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapFinancialExpense(data as DbExpense) : null;
  });
}

async function requireExpenseInWorkspace(id: string, scope?: ExpensesWorkspaceScope) {
  const expense = await getExpense(id, scope);
  if (!expense) throw new Error("Expense not found.");
  return expense;
}

export async function createExpense(
  input: Partial<ReturnType<typeof createBlankExpenseInput>> & {
    submitterUserId: string;
    purposeDescription: string;
    amount: number;
    workspaceId?: string;
  },
  scope?: ExpensesWorkspaceScope,
): Promise<FinancialExpense> {
  const workspaceId = await resolveFinancialsWorkspaceId({
    workspaceId: input.workspaceId ?? scope?.workspaceId,
  });
  await ensureFinancialExpensesTable();
  return withFinancialExpensesTable(async () => {
    const supabase = requireExpensesSupabase();
    const user = getInternalUserById(input.submitterUserId);
    const submitterName = user?.fullName ?? input.submitterName?.trim() ?? "Unknown";
    const expenseDate =
      input.expenseDate ?? input.dateSubmitted ?? new Date().toISOString().slice(0, 10);
    const categoryAccountCode = input.categoryAccountCode ?? "5090";
    const paid = input.paid ?? false;

    const { data, error } = await supabase
      .from("financial_expenses")
      .insert({
        workspace_id: workspaceId,
        submitter_user_id: input.submitterUserId,
        submitter_name: submitterName,
        purpose_description: input.purposeDescription.trim(),
        amount: input.amount,
        currency: input.currency ?? "EUR",
        date_submitted: input.dateSubmitted ?? expenseDate,
        paid,
        supplier: input.supplier ?? null,
        category_account_code: categoryAccountCode,
        expense_date: expenseDate,
        payment_method: input.paymentMethod ?? (paid ? "wise" : null),
        wise_balance_id: input.wiseBalanceId ?? null,
        attachment_path: input.attachmentPath ?? null,
        reference: input.reference ?? null,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    try {
      const journal = await postExpenseJournal({
        expenseId: data.id,
        amount: Number(data.amount),
        currency: String(data.currency),
        categoryAccountCode,
        description: String(data.purpose_description),
        journalDate: expenseDate,
        paid,
        workspaceId,
      });
      const { data: updated, error: updateError } = await supabase
        .from("financial_expenses")
        .update({
          journal_entry_id: journal.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .eq("workspace_id", workspaceId)
        .select("*")
        .single();
      if (updateError) throw new Error(updateError.message);
      return mapFinancialExpense(updated as DbExpense);
    } catch {
      return mapFinancialExpense(data as DbExpense);
    }
  });
}

export async function updateExpense(
  id: string,
  patch: Partial<{
    submitterUserId: string;
    purposeDescription: string;
    amount: number;
    currency: ExpenseCurrency;
    dateSubmitted: string;
    paid: boolean;
    supplier: string | null;
    categoryAccountCode: string | null;
    expenseDate: string;
    paymentMethod: string | null;
    reference: string | null;
  }>,
  scope?: ExpensesWorkspaceScope,
): Promise<FinancialExpense> {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  return withFinancialExpensesTable(async () => {
    const supabase = requireExpensesSupabase();
    const existingMapped = await requireExpenseInWorkspace(id, { workspaceId });
    const { data: existing, error: existingError } = await supabase
      .from("financial_expenses")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();
    if (existingError) throw new Error(existingError.message);

    const payload: Record<string, string | number | boolean | null> = {
      updated_at: new Date().toISOString(),
    };

    if (patch.submitterUserId !== undefined) {
      const user = getInternalUserById(patch.submitterUserId);
      payload.submitter_user_id = patch.submitterUserId;
      payload.submitter_name = user?.fullName ?? "Unknown";
    }
    if (patch.purposeDescription !== undefined) {
      payload.purpose_description = patch.purposeDescription.trim();
    }
    if (patch.amount !== undefined) payload.amount = patch.amount;
    if (patch.currency !== undefined) payload.currency = patch.currency;
    if (patch.dateSubmitted !== undefined) payload.date_submitted = patch.dateSubmitted;
    if (patch.paid !== undefined) payload.paid = patch.paid;
    if (patch.supplier !== undefined) payload.supplier = patch.supplier;
    if (patch.categoryAccountCode !== undefined) {
      payload.category_account_code = patch.categoryAccountCode;
    }
    if (patch.expenseDate !== undefined) payload.expense_date = patch.expenseDate;
    if (patch.paymentMethod !== undefined) payload.payment_method = patch.paymentMethod;
    if (patch.reference !== undefined) payload.reference = patch.reference;

    const becomingPaid = patch.paid === true && !existing.paid;

    if (becomingPaid && !existing.payment_journal_entry_id && existing.journal_entry_id) {
      try {
        const paymentJournal = await postExpensePaymentJournal({
          expenseId: id,
          amount: Number(patch.amount ?? existing.amount),
          currency: String(patch.currency ?? existing.currency),
          description: String(existing.purpose_description),
          journalDate: new Date().toISOString().slice(0, 10),
          workspaceId,
        });
        payload.payment_journal_entry_id = paymentJournal.id;
        payload.payment_method = patch.paymentMethod ?? "wise";
      } catch {
        // Keep paid flag even if journal posting fails before migration applied.
      }
    }

    void existingMapped;

    const { data, error } = await supabase
      .from("financial_expenses")
      .update(payload)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return mapFinancialExpense(data as DbExpense);
  });
}

export async function deleteExpense(id: string, scope?: ExpensesWorkspaceScope) {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  return withFinancialExpensesTable(async () => {
    await requireExpenseInWorkspace(id, { workspaceId });
    const supabase = requireExpensesSupabase();
    const { error } = await supabase
      .from("financial_expenses")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
  });
}
