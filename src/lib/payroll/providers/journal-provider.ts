import {
  postPayrollAccrualJournal,
  postPayrollPaymentJournal,
} from "@/lib/accounting/posting-rules";
import type { JournalProvider } from "@/lib/payroll/providers/payment-provider";
import type { PayrollRun } from "@/lib/payroll/types";
import { roundPayrollMoney } from "@/lib/payroll/types";

export const glJournalProvider: JournalProvider = {
  id: "gl-default",
  label: "General Ledger",
  async postAccrual(run: PayrollRun) {
    const journal = await postPayrollAccrualJournal({
      runId: run.id,
      payDate: run.payDate,
      gross: run.grossPayroll,
      employerTax: run.employerTax,
      employeeTax: run.employeeTax,
      net: run.netPayroll,
      currency: run.currency,
      workspaceId: run.workspaceId,
    });
    return { journalEntryId: journal.id };
  },
  async postPayment(run: PayrollRun) {
    const clearingAmount = roundPayrollMoney(run.netPayroll + run.employeeTax);
    const journal = await postPayrollPaymentJournal({
      runId: run.id,
      payDate: run.payDate,
      clearingAmount,
      employerTax: run.employerTax,
      currency: run.currency,
      wiseBatchId: run.wiseBatchId ?? undefined,
      workspaceId: run.workspaceId,
      remittanceEmployerTax: true,
    });
    return { journalEntryId: journal.id };
  },
};
