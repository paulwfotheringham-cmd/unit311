import { NextRequest, NextResponse } from "next/server";

import type { ExpenseCurrency } from "@/lib/expenses-data";
import { createExpense, listExpenses } from "@/lib/financial-expenses-service";
import { ensureFinancialExpensesTable } from "@/lib/internal-db-migrations";
import { requirePlatformSession } from "@/lib/platform-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    await ensureFinancialExpensesTable();
    const expenses = await listExpenses({ workspaceId: workspace.id });
    return NextResponse.json({ expenses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load expenses";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    await requirePlatformSession();
    const workspace = await requireCurrentWorkspace();
    const body = (await request.json()) as {
      submitterUserId?: string;
      purposeDescription?: string;
      amount?: number;
      currency?: ExpenseCurrency;
      dateSubmitted?: string;
      paid?: boolean;
      supplier?: string | null;
      categoryAccountCode?: string | null;
      expenseDate?: string;
    };

    if (!body.submitterUserId?.trim()) {
      return NextResponse.json({ error: "Submitter is required" }, { status: 400 });
    }
    if (!body.purposeDescription?.trim()) {
      return NextResponse.json({ error: "Purpose description is required" }, { status: 400 });
    }
    if (body.amount === undefined || Number.isNaN(body.amount) || body.amount < 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    }

    await ensureFinancialExpensesTable();
    const expense = await createExpense(
      {
        submitterUserId: body.submitterUserId,
        purposeDescription: body.purposeDescription,
        amount: body.amount,
        currency: body.currency,
        dateSubmitted: body.dateSubmitted,
        paid: body.paid,
        supplier: body.supplier,
        categoryAccountCode: body.categoryAccountCode,
        expenseDate: body.expenseDate,
      },
      { workspaceId: workspace.id },
    );

    return NextResponse.json({ expense });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create expense";
    const status =
      message.includes("Authentication required") || message.includes("Workspace context")
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
