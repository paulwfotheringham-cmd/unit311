import type { PayrollRun } from "@/lib/payroll/types";

export type BenefitsProvider = {
  id: string;
  label: string;
  /** V1 stub — no 401k / healthcare / pension. */
  applyBenefits(gross: number): { deduction: number; employerContribution: number };
};

export const noopBenefitsProvider: BenefitsProvider = {
  id: "none",
  label: "No benefits (V1)",
  applyBenefits() {
    return { deduction: 0, employerContribution: 0 };
  },
};

export type PaymentBatchResult = {
  batchId: string;
  status: "pending" | "submitted" | "paid" | "failed";
  paymentIds: string[];
  message?: string;
};

export type PaymentProvider = {
  id: string;
  label: string;
  generateBatchPayment(run: PayrollRun): Promise<PaymentBatchResult>;
};

export type JournalPostResult = {
  journalEntryId: string;
};

export type JournalProvider = {
  id: string;
  label: string;
  postAccrual(run: PayrollRun): Promise<JournalPostResult>;
  postPayment(run: PayrollRun): Promise<JournalPostResult>;
};
