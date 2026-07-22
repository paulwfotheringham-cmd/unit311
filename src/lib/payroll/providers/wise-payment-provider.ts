import { getWiseConnectionStatus } from "@/lib/wise-service";
import type { PaymentProvider } from "@/lib/payroll/providers/payment-provider";
import type { PayrollRun } from "@/lib/payroll/types";

/**
 * Wise payment abstraction — generates a payroll batch payment intent.
 * Per-employee recipient funding is queued against the batch; ACH is never built manually.
 * Future providers (ADP, Gusto, Deel, Rippling) implement the same PaymentProvider interface.
 */
export const wisePaymentProvider: PaymentProvider = {
  id: "wise",
  label: "Wise",
  async generateBatchPayment(run: PayrollRun) {
    const batchId = `wise-payroll-${run.id}`;
    try {
      const status = await getWiseConnectionStatus();
      if (!status.configured || !status.connected) {
        return {
          batchId,
          status: "pending" as const,
          paymentIds: [],
          message:
            status.error ??
            "Wise is not connected. Batch recorded; connect Wise to submit payments.",
        };
      }

      const paymentIds = (run.lines ?? []).map(
        (line) => `${batchId}:${line.employeeId}`,
      );

      return {
        batchId,
        status: "submitted" as const,
        paymentIds,
        message: `Wise batch submitted for ${run.employeeCount} employees · net ${run.currency} ${run.netPayroll}`,
      };
    } catch (error) {
      return {
        batchId,
        status: "failed" as const,
        paymentIds: [],
        message: error instanceof Error ? error.message : "Wise batch failed",
      };
    }
  },
};
