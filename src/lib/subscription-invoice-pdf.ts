import { readFile } from "fs/promises";
import path from "path";

import { jsPDF } from "jspdf";

import {
  PAYMENT_AMOUNT_NUMERIC,
  PAYMENT_BANK_DETAILS,
  SUBSCRIPTION_INVOICE_DESCRIPTION,
  SUBSCRIPTION_INVOICE_QUANTITY,
} from "@/lib/payment-data";

const PAGE_W = 210;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H = 40;
const LOGO_HEIGHT_MM = 16;
const LOGO_ASPECT = 198 / 90;

const INVOICE_LOGO_CANDIDATES = [
  "unit311central-hero.png",
  "unit311central.png",
] as const;

let cachedLogoDataUrl: Promise<string | null> | null = null;

async function loadInvoiceLogoDataUrl(): Promise<string | null> {
  for (const fileName of INVOICE_LOGO_CANDIDATES) {
    try {
      const filePath = path.join(process.cwd(), "public", "images", fileName);
      const buffer = await readFile(filePath);
      return `data:image/png;base64,${buffer.toString("base64")}`;
    } catch {
      // Try the next logo asset.
    }
  }

  return null;
}

function getInvoiceLogoDataUrl() {
  cachedLogoDataUrl ??= loadInvoiceLogoDataUrl();
  return cachedLogoDataUrl;
}

export type SubscriptionInvoiceInput = {
  companyName: string;
  contactName: string;
  contactEmail: string;
  /** Customer billing address only — never include workspace/client IDs. */
  billingAddress?: string;
  invoiceNumber: string;
  paymentReference?: string;
  issuedAt?: Date;
  dueDate?: Date;
  amount?: number;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  taxLabel?: string;
  paymentTerms?: string;
  statusLabel?: string;
};

function formatUsd(amount: number) {
  return `US$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function addLine(doc: jsPDF, y: number, label: string, value: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(label, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(value, MARGIN, y + 5);
}

function addInvoiceHeader(doc: jsPDF, invoiceNumber: string, logoDataUrl: string | null) {
  doc.setFillColor(11, 45, 99);
  doc.rect(0, 0, PAGE_W, HEADER_H, "F");

  if (logoDataUrl) {
    const logoWidth = LOGO_HEIGHT_MM * LOGO_ASPECT;
    doc.addImage(
      logoDataUrl,
      "PNG",
      PAGE_W - MARGIN - logoWidth,
      (HEADER_H - LOGO_HEIGHT_MM) / 2,
      logoWidth,
      LOGO_HEIGHT_MM,
    );
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("INVOICE", MARGIN, 16);
  doc.setFontSize(10);
  doc.setTextColor(147, 197, 253);
  doc.text("Unit311 Central — Quarterly Subscription", MARGIN, 24);
  doc.text(`Invoice #${invoiceNumber}`, MARGIN, 32);
}

export async function buildSubscriptionInvoicePdf(
  input: SubscriptionInvoiceInput,
): Promise<Uint8Array> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const issuedAt = input.issuedAt ?? new Date();
  const dueDate = input.dueDate ?? issuedAt;
  const quantity = input.quantity ?? SUBSCRIPTION_INVOICE_QUANTITY;
  const unitPrice = input.unitPrice ?? input.amount ?? PAYMENT_AMOUNT_NUMERIC;
  const amount = input.amount ?? unitPrice * quantity;
  const description = input.description ?? SUBSCRIPTION_INVOICE_DESCRIPTION;
  const taxLabel = input.taxLabel ?? "None";
  const paymentTerms = input.paymentTerms ?? "Due Immediately";
  const statusLabel = input.statusLabel ?? "Unpaid";
  const logoDataUrl = await getInvoiceLogoDataUrl();

  addInvoiceHeader(doc, input.invoiceNumber, logoDataUrl);

  let y = HEADER_H + 12;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Bill to", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.text(input.companyName, MARGIN, y + 6);
  doc.text(input.contactName, MARGIN, y + 12);
  doc.text(input.contactEmail, MARGIN, y + 18);
  let billToBottom = y + 18;
  if (input.billingAddress?.trim()) {
    const addressLines = doc.splitTextToSize(input.billingAddress.trim(), CONTENT_W / 2 - 4);
    doc.text(addressLines, MARGIN, y + 24);
    billToBottom = y + 24 + Math.max(0, addressLines.length - 1) * 5;
  }

  doc.setFont("helvetica", "bold");
  doc.text("From", PAGE_W / 2, y);
  doc.setFont("helvetica", "normal");
  doc.text("Nakama Technology Holdings Ltd", PAGE_W / 2, y + 6);
  doc.text("Unit311 Central", PAGE_W / 2, y + 12);
  doc.text(
    `Issued ${issuedAt.toLocaleDateString("en-US", { dateStyle: "long" })}`,
    PAGE_W / 2,
    y + 18,
  );
  doc.text(
    `Due ${dueDate.toLocaleDateString("en-US", { dateStyle: "long" })}`,
    PAGE_W / 2,
    y + 24,
  );

  y = Math.max(billToBottom, y + 24) + 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("Description", MARGIN, y);
  doc.text("Qty", MARGIN + 95, y);
  doc.text("Unit price", MARGIN + 112, y);
  doc.text("Tax", MARGIN + 145, y);
  doc.text("Amount", PAGE_W - MARGIN - 24, y);

  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const descriptionLines = doc.splitTextToSize(description, 90);
  doc.text(descriptionLines, MARGIN, y);
  doc.text(String(quantity), MARGIN + 95, y);
  doc.text(formatUsd(unitPrice), MARGIN + 112, y);
  doc.text(taxLabel, MARGIN + 145, y);
  doc.text(formatUsd(amount), PAGE_W - MARGIN - 24, y);

  y += Math.max(8, descriptionLines.length * 5) + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Total due", MARGIN, y);
  doc.setFontSize(14);
  doc.text(formatUsd(amount), PAGE_W - MARGIN - 40, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Payment terms: ${paymentTerms}`, MARGIN, y);
  doc.text(`Status: ${statusLabel}`, MARGIN, y + 5);

  y += 18;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Payment instructions", MARGIN, y);
  y += 8;

  const bank = PAYMENT_BANK_DETAILS;
  const lines: Array<[string, string]> = [
    ["Account name", bank.accountName],
    ["Bank name", bank.bankName],
    ["Routing (ABA)", bank.routingNumber],
    ["Account number", bank.accountNumber],
    ["SWIFT/BIC", bank.swift],
    ["Bank address", bank.bankAddress],
    [
      "Payment reference",
      input.paymentReference ||
        (input.invoiceNumber.startsWith("INV-")
          ? input.invoiceNumber
          : `INV-${input.invoiceNumber}`),
    ],
  ];

  for (const [label, value] of lines) {
    addLine(doc, y, label, value);
    y += 12;
  }

  y += 4;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Please include the payment reference above on your Wise transfer. Matching is automatic — no screenshot is required.",
    MARGIN,
    y,
    { maxWidth: CONTENT_W },
  );

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

export function buildInvoiceFileName(companyName: string, invoiceNumber: string) {
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
  return `${slug || "client"}${invoiceNumber}invoice.pdf`;
}

export function generateInvoiceNumber() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
