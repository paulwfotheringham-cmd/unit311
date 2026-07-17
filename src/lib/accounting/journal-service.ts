import { CHART_OF_ACCOUNTS_SEED } from "@/lib/accounting/chart-of-accounts";
import type {
  JournalEntry,
  JournalLineInput,
  JournalSourceType,
  LedgerAccount,
} from "@/lib/accounting/types";
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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function ensureChartOfAccountsSeeded(scope?: FinancialsWorkspaceScope) {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("accounts")
    .select("code")
    .eq("workspace_id", workspaceId)
    .limit(1);
  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") {
      throw new Error("General Ledger tables missing. Apply migration 071_general_ledger.sql.");
    }
    throw new Error(error.message);
  }
  if ((data?.length ?? 0) > 0) return;

  const { error: insertError } = await supabase.from("accounts").insert(
    CHART_OF_ACCOUNTS_SEED.map((account) => ({
      code: account.code,
      name: account.name,
      type: account.type,
      currency: account.currency ?? null,
      is_active: true,
      workspace_id: workspaceId,
    })),
  );
  if (insertError && !insertError.message.includes("duplicate")) {
    throw new Error(insertError.message);
  }
}

export async function listAccounts(scope?: FinancialsWorkspaceScope): Promise<LedgerAccount[]> {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  await ensureChartOfAccountsSeeded({ workspaceId });
  const supabase = requireSupabase();
  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, code, name, type, currency, is_active")
    .eq("workspace_id", workspaceId)
    .order("code", { ascending: true });
  if (error) throw new Error(error.message);

  const { data: lines, error: linesError } = await supabase
    .from("journal_lines")
    .select("account_id, debit, credit, journal_entries!inner(status)")
    .eq("workspace_id", workspaceId);
  if (linesError) throw new Error(linesError.message);

  const balances = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const line of lines ?? []) {
    const status = (line as { journal_entries?: { status?: string } }).journal_entries?.status;
    if (status !== "posted") continue;
    const accountId = String((line as { account_id: string }).account_id);
    const debit = Number((line as { debit: number }).debit) || 0;
    const credit = Number((line as { credit: number }).credit) || 0;
    const account = accounts?.find((row) => row.id === accountId);
    if (!account) continue;
    const signed =
      account.type === "asset" || account.type === "expense" ? debit - credit : credit - debit;
    balances.set(accountId, roundMoney((balances.get(accountId) ?? 0) + signed));
    counts.set(accountId, (counts.get(accountId) ?? 0) + 1);
  }

  return (accounts ?? []).map((account) => ({
    id: account.id,
    code: account.code,
    name: account.name,
    type: account.type,
    currency: account.currency,
    isActive: Boolean(account.is_active),
    balance: balances.get(account.id) ?? 0,
    transactionCount: counts.get(account.id) ?? 0,
  }));
}

export async function getAccountByCode(code: string, scope?: FinancialsWorkspaceScope) {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  await ensureChartOfAccountsSeeded({ workspaceId });
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, code, name, type, currency, is_active")
    .eq("workspace_id", workspaceId)
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function validateLinesBalance(lines: JournalLineInput[]) {
  const debitTotal = roundMoney(lines.reduce((sum, line) => sum + (line.debit ?? 0), 0));
  const creditTotal = roundMoney(lines.reduce((sum, line) => sum + (line.credit ?? 0), 0));
  if (lines.length < 2) {
    throw new Error("Journal requires at least two lines.");
  }
  for (const line of lines) {
    const debit = line.debit ?? 0;
    const credit = line.credit ?? 0;
    if (debit < 0 || credit < 0) throw new Error("Debit and credit must be non-negative.");
    if (debit > 0 && credit > 0) throw new Error("A line cannot have both debit and credit.");
    if (debit === 0 && credit === 0) throw new Error("A line must have a debit or credit.");
  }
  if (debitTotal !== creditTotal) {
    throw new Error(`Journal is unbalanced (debit ${debitTotal} ≠ credit ${creditTotal}).`);
  }
  return { debitTotal, creditTotal };
}

export async function createAndPostJournal(
  input: {
    reference: string;
    description: string;
    clientId?: string | null;
    workspaceId?: string | null;
    sourceType?: JournalSourceType | string | null;
    sourceId?: string | null;
    journalDate?: string;
    lines: JournalLineInput[];
  },
  scope?: FinancialsWorkspaceScope,
): Promise<JournalEntry> {
  const workspaceId = await resolveFinancialsWorkspaceId({
    workspaceId: input.workspaceId ?? scope?.workspaceId,
  });
  const workspaceScope: FinancialsWorkspaceScope = { workspaceId };

  await ensureChartOfAccountsSeeded(workspaceScope);
  validateLinesBalance(input.lines);

  if (input.sourceType && input.sourceId) {
    const existing = await findJournalBySource(input.sourceType, input.sourceId, workspaceScope);
    if (existing) return existing;
  }

  const supabase = requireSupabase();
  const accountCodes = [...new Set(input.lines.map((line) => line.accountCode))];
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, code, name")
    .eq("workspace_id", workspaceId)
    .in("code", accountCodes);
  if (accountsError) throw new Error(accountsError.message);

  const accountByCode = new Map((accounts ?? []).map((account) => [account.code, account]));
  for (const code of accountCodes) {
    if (!accountByCode.has(code)) {
      throw new Error(`Unknown account code: ${code}`);
    }
  }

  const journalDate = input.journalDate ?? new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const entryPayload = {
    reference: input.reference,
    description: input.description,
    client_id: input.clientId ?? null,
    source_type: input.sourceType ?? null,
    source_id: input.sourceId ?? null,
    status: "posted",
    journal_date: journalDate,
    posted_at: now,
    workspace_id: workspaceId,
  };

  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .insert(entryPayload)
    .select("*")
    .single();
  if (entryError) throw new Error(entryError.message);
  if (!entry) {
    throw new Error("Failed to create journal entry.");
  }

  const lineRows = input.lines.map((line) => {
    const account = accountByCode.get(line.accountCode)!;
    return {
      journal_entry_id: entry.id,
      account_id: account.id,
      debit: roundMoney(line.debit ?? 0),
      credit: roundMoney(line.credit ?? 0),
      description: line.description ?? "",
      workspace_id: workspaceId,
    };
  });

  const { error: linesError } = await supabase.from("journal_lines").insert(lineRows);
  if (linesError) {
    await supabase
      .from("journal_entries")
      .delete()
      .eq("id", entry.id)
      .eq("workspace_id", workspaceId);
    throw new Error(linesError.message);
  }

  return getJournalById(entry.id, workspaceScope);
}

export async function findJournalBySource(
  sourceType: string,
  sourceId: string,
  scope?: FinancialsWorkspaceScope,
) {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return getJournalById(data.id, { workspaceId });
}

export async function getJournalById(
  id: string,
  scope?: FinancialsWorkspaceScope,
): Promise<JournalEntry> {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  const supabase = requireSupabase();
  const { data: entry, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();
  if (error) throw new Error(error.message);

  const { data: lines, error: linesError } = await supabase
    .from("journal_lines")
    .select("id, account_id, debit, credit, description, accounts(code, name)")
    .eq("journal_entry_id", id)
    .eq("workspace_id", workspaceId);
  if (linesError) throw new Error(linesError.message);

  const mappedLines = (lines ?? []).map((line) => {
    const account = line.accounts as unknown as { code: string; name: string } | null;
    return {
      id: line.id,
      accountId: line.account_id,
      accountCode: account?.code ?? "",
      accountName: account?.name ?? "",
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
      description: line.description ?? "",
    };
  });

  const debitTotal = roundMoney(mappedLines.reduce((sum, line) => sum + line.debit, 0));
  const creditTotal = roundMoney(mappedLines.reduce((sum, line) => sum + line.credit, 0));

  return {
    id: entry.id,
    reference: entry.reference,
    description: entry.description ?? "",
    clientId: entry.client_id,
    sourceType: entry.source_type,
    sourceId: entry.source_id,
    status: entry.status,
    journalDate: entry.journal_date,
    createdAt: entry.created_at,
    postedAt: entry.posted_at,
    lines: mappedLines,
    debitTotal,
    creditTotal,
  };
}

export async function listJournals(
  limit = 200,
  scope?: FinancialsWorkspaceScope,
): Promise<JournalEntry[]> {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  await ensureChartOfAccountsSeeded({ workspaceId });
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("journal_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return Promise.all((data ?? []).map((row) => getJournalById(row.id, { workspaceId })));
}

export type AccountTransaction = {
  journalId: string;
  reference: string;
  description: string;
  journalDate: string;
  sourceType: string | null;
  debit: number;
  credit: number;
  lineDescription: string;
};

export async function listAccountTransactions(
  accountId: string,
  limit = 500,
  scope?: FinancialsWorkspaceScope,
): Promise<AccountTransaction[]> {
  const workspaceId = await resolveFinancialsWorkspaceId(scope);
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("journal_lines")
    .select(
      "debit, credit, description, journal_entries!inner(id, reference, description, journal_date, source_type, status, workspace_id)",
    )
    .eq("workspace_id", workspaceId)
    .eq("account_id", accountId)
    .eq("journal_entries.workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const entry = (
        row as {
          journal_entries?: {
            id?: string;
            reference?: string;
            description?: string;
            journal_date?: string;
            source_type?: string | null;
            status?: string;
          };
        }
      ).journal_entries;
      if (!entry || entry.status !== "posted") return null;
      return {
        journalId: String(entry.id),
        reference: String(entry.reference ?? ""),
        description: String(entry.description ?? ""),
        journalDate: String(entry.journal_date ?? ""),
        sourceType: entry.source_type ?? null,
        debit: Number((row as { debit: number }).debit) || 0,
        credit: Number((row as { credit: number }).credit) || 0,
        lineDescription: String((row as { description?: string }).description ?? ""),
      };
    })
    .filter((row): row is AccountTransaction => row !== null)
    .sort((a, b) => b.journalDate.localeCompare(a.journalDate));
}
