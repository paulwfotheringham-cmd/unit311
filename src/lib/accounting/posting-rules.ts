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

/** Accrue payroll: Dr salary + employer tax, Cr clearing + employer tax payable. */
export async function postPayrollAccrualJournal(input: {
  runId: string;
  payDate: string;
  gross: number;
  employerTax: number;
  employeeTax: number;
  net: number;
  currency: string;
  workspaceId?: string | null;
}) {
  const clearing = roundMoney(input.net + input.employeeTax);
  return createAndPostJournal({
    reference: `PAYROLL-${input.runId.slice(0, 8)}`,
    description: `Payroll accrual ${input.payDate}`,
    workspaceId: input.workspaceId ?? null,
    sourceType: "payroll",
    sourceId: input.runId,
    journalDate: input.payDate,
    lines: [
      {
        accountCode: ACCOUNT_CODES.payroll,
        debit: input.gross,
        description: "Salary expense",
      },
      {
        accountCode: ACCOUNT_CODES.employerPayrollTax,
        debit: input.employerTax,
        description: "Employer payroll tax",
      },
      {
        accountCode: ACCOUNT_CODES.payrollClearing,
        credit: clearing,
        description: "Payroll clearing (net + withholdings)",
      },
      {
        accountCode: ACCOUNT_CODES.employerPayrollTaxPayable,
        credit: input.employerTax,
        description: "Employer payroll tax payable",
      },
    ],
  });
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/** Pay payroll from Wise: clear payroll clearing (+ optional employer tax) against bank. */
export async function postPayrollPaymentJournal(input: {
  runId: string;
  payDate: string;
  clearingAmount: number;
  employerTax: number;
  currency: string;
  wiseBatchId?: string;
  workspaceId?: string | null;
  remittanceEmployerTax?: boolean;
}) {
  const remittance = input.remittanceEmployerTax !== false;
  const bankOut = remittance
    ? roundMoney(input.clearingAmount + input.employerTax)
    : roundMoney(input.clearingAmount);
  const lines = [
    {
      accountCode: ACCOUNT_CODES.payrollClearing,
      debit: input.clearingAmount,
      description: "Clear payroll liability",
    },
    ...(remittance && input.employerTax > 0
      ? [
          {
            accountCode: ACCOUNT_CODES.employerPayrollTaxPayable,
            debit: input.employerTax,
            description: "Remit employer payroll tax",
          },
        ]
      : []),
    {
      accountCode: wiseAccountCodeForCurrency(input.currency),
      credit: bankOut,
      description: input.wiseBatchId
        ? `Wise payroll batch ${input.wiseBatchId}`
        : "Wise payroll payment",
    },
  ];

  return createAndPostJournal({
    reference: `PAYROLLPAY-${input.runId.slice(0, 8)}`,
    description: `Payroll payment ${input.payDate}`,
    workspaceId: input.workspaceId ?? null,
    sourceType: "payroll_payment",
    sourceId: `${input.runId}:payment`,
    journalDate: input.payDate,
    lines,
  });
}
