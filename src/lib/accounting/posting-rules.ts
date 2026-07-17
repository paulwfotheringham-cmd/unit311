import {
  ACCOUNT_CODES,
  wiseAccountCodeForCurrency,
} from "@/lib/accounting/chart-of-accounts";
import { createAndPostJournal } from "@/lib/accounting/journal-service";
import type { JournalLineInput } from "@/lib/accounting/types";

export async function postInvoiceIssueJournal(input: {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  amount: number;
  currency: string;
  journalDate: string;
  workspaceId?: string | null;
}) {
  const lines: JournalLineInput[] = [
    {
      accountCode: ACCOUNT_CODES.accountsReceivable,
      debit: input.amount,
      description: `AR ${input.invoiceNumber}`,
    },
    {
      accountCode: ACCOUNT_CODES.deferredRevenue,
      credit: input.amount,
      description: `Deferred revenue ${input.invoiceNumber}`,
    },
  ];

  return createAndPostJournal({
    reference: `INV-${input.invoiceNumber}`,
    description: `Invoice issued ${input.invoiceNumber}`,
    clientId: input.clientId,
    workspaceId: input.workspaceId ?? null,
    sourceType: "invoice_issue",
    sourceId: input.invoiceId,
    journalDate: input.journalDate,
    lines,
  });
}

export async function postInvoicePaymentJournal(input: {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  amount: number;
  currency: string;
  journalDate: string;
  wiseTransactionId?: string;
  workspaceId?: string | null;
}) {
  const wiseCode = wiseAccountCodeForCurrency(input.currency);
  const cashLines: JournalLineInput[] = [
    {
      accountCode: wiseCode,
      debit: input.amount,
      description: `Wise receipt ${input.invoiceNumber}`,
    },
    {
      accountCode: ACCOUNT_CODES.accountsReceivable,
      credit: input.amount,
      description: `Clear AR ${input.invoiceNumber}`,
    },
  ];

  const cashJournal = await createAndPostJournal({
    reference: `PAY-${input.invoiceNumber}`,
    description: `Invoice payment ${input.invoiceNumber}`,
    clientId: input.clientId,
    workspaceId: input.workspaceId ?? null,
    sourceType: "invoice_payment",
    sourceId: input.invoiceId,
    journalDate: input.journalDate,
    lines: cashLines,
  });

  await createAndPostJournal({
    reference: `REV-${input.invoiceNumber}`,
    description: `Recognise subscription revenue ${input.invoiceNumber}`,
    clientId: input.clientId,
    workspaceId: input.workspaceId ?? null,
    sourceType: "invoice_payment",
    sourceId: `${input.invoiceId}:revenue`,
    journalDate: input.journalDate,
    lines: [
      {
        accountCode: ACCOUNT_CODES.deferredRevenue,
        debit: input.amount,
        description: `Clear deferred revenue ${input.invoiceNumber}`,
      },
      {
        accountCode: ACCOUNT_CODES.subscriptionRevenue,
        credit: input.amount,
        description: `Subscription revenue ${input.invoiceNumber}`,
      },
    ],
  });

  return cashJournal;
}

export async function postExpenseJournal(input: {
  expenseId: string;
  amount: number;
  currency: string;
  categoryAccountCode: string;
  description: string;
  journalDate: string;
  paid: boolean;
  clientId?: string | null;
  workspaceId?: string | null;
}) {
  const expenseCode = input.categoryAccountCode || ACCOUNT_CODES.miscExpenses;
  const creditCode = input.paid
    ? wiseAccountCodeForCurrency(input.currency)
    : ACCOUNT_CODES.accountsPayable;

  return createAndPostJournal({
    reference: `EXP-${input.expenseId.slice(0, 8)}`,
    description: input.description || "Expense",
    clientId: input.clientId ?? null,
    workspaceId: input.workspaceId ?? null,
    sourceType: "expense",
    sourceId: input.expenseId,
    journalDate: input.journalDate,
    lines: [
      {
        accountCode: expenseCode,
        debit: input.amount,
        description: input.description,
      },
      {
        accountCode: creditCode,
        credit: input.amount,
        description: input.paid ? "Paid via Wise" : "Accounts payable",
      },
    ],
  });
}

export async function postExpensePaymentJournal(input: {
  expenseId: string;
  amount: number;
  currency: string;
  description: string;
  journalDate: string;
  workspaceId?: string | null;
}) {
  return createAndPostJournal({
    reference: `EXPPAY-${input.expenseId.slice(0, 8)}`,
    description: `Pay expense ${input.description}`,
    workspaceId: input.workspaceId ?? null,
    sourceType: "expense_payment",
    sourceId: input.expenseId,
    journalDate: input.journalDate,
    lines: [
      {
        accountCode: ACCOUNT_CODES.accountsPayable,
        debit: input.amount,
        description: "Clear AP",
      },
      {
        accountCode: wiseAccountCodeForCurrency(input.currency),
        credit: input.amount,
        description: "Wise payment",
      },
    ],
  });
}

export async function postWiseOutboundJournal(input: {
  transferId: string;
  amount: number;
  currency: string;
  description: string;
  journalDate: string;
  expenseAccountCode?: string;
  workspaceId?: string | null;
}) {
  return createAndPostJournal({
    reference: `WISEOUT-${input.transferId.slice(0, 10)}`,
    description: input.description || "Wise outbound transfer",
    workspaceId: input.workspaceId ?? null,
    sourceType: "wise_outbound",
    sourceId: input.transferId,
    journalDate: input.journalDate,
    lines: [
      {
        accountCode: input.expenseAccountCode ?? ACCOUNT_CODES.miscExpenses,
        debit: input.amount,
        description: input.description,
      },
      {
        accountCode: wiseAccountCodeForCurrency(input.currency),
        credit: input.amount,
        description: "Wise outbound",
      },
    ],
  });
}
