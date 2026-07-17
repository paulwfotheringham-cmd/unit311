export type InvoiceStatus = "paid" | "awaiting";

export type BillingInvoice = {
  id: string;
  number: string;
  status: InvoiceStatus;
  issuedAt: string;
  amountUsd: number;
};

export const BILLING_PLAN = {
  name: "Professional",
  status: "Active" as const,
  priceLabel: "US$995/month",
  billingCycle: "Quarterly",
  nextInvoiceDate: "1 October 2026",
};

export const BILLING_PAYMENT_METHOD = {
  type: "Credit Card" as const,
  last4: "4242",
  masked: "************4242",
};

export const BILLING_INVOICES: BillingInvoice[] = [
  {
    id: "inv-1001",
    number: "INV-1001",
    status: "paid",
    issuedAt: "2026-04-01",
    amountUsd: 2997,
  },
  {
    id: "inv-1002",
    number: "INV-1002",
    status: "paid",
    issuedAt: "2026-01-01",
    amountUsd: 2997,
  },
  {
    id: "inv-1003",
    number: "INV-1003",
    status: "awaiting",
    issuedAt: "2026-07-01",
    amountUsd: 2997,
  },
];

export function invoiceStatusLabel(status: InvoiceStatus) {
  return status === "paid" ? "Paid" : "Awaiting payment";
}
