import { jsPDF } from "jspdf";

import { moneyExact, type PurchaseOrder } from "@/lib/procurement-data";

/** Generate a professional purchase order PDF (client-side download). */
export function generatePurchaseOrderPdf(po: PurchaseOrder): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Unit311 Central", margin, y);
  y += 22;
  doc.setFontSize(14);
  doc.text("Purchase Order", margin, y);
  y += 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta = [
    [`PO Number`, po.poNumber],
    [`Status`, po.status],
    [`Supplier`, po.supplierName],
    [`Contact`, po.supplierContact],
    [`Currency`, po.currency],
    [`Payment terms`, po.paymentTerms],
    [`Expected delivery`, po.expectedDelivery],
  ];
  for (const [label, value] of meta) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), margin + 110, y);
    y += 14;
  }

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Delivery address", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.text(po.deliveryAddress, margin, y, { maxWidth: 500 });
  y += 28;

  doc.setFont("helvetica", "bold");
  doc.text("Billing address", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.text(po.billingAddress, margin, y, { maxWidth: 500 });
  y += 28;

  doc.setFont("helvetica", "bold");
  doc.text("Line items", margin, y);
  y += 16;

  const headers = ["SKU", "Description", "Qty", "Unit", "Tax%", "Total"];
  const colX = [margin, margin + 70, margin + 280, margin + 320, margin + 370, margin + 430];
  doc.setFontSize(9);
  headers.forEach((h, i) => doc.text(h, colX[i], y));
  y += 10;
  doc.setDrawColor(180);
  doc.line(margin, y, 547, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  for (const line of po.lines) {
    if (y > 740) {
      doc.addPage();
      y = margin;
    }
    const base = line.quantity * line.unitPrice;
    const afterDiscount = base * (1 - line.discountPct / 100);
    const total = afterDiscount * (1 + line.taxPct / 100);
    const cells = [
      line.sku,
      line.description.slice(0, 36),
      String(line.quantity),
      moneyExact(line.unitPrice, po.currency),
      `${line.taxPct}%`,
      moneyExact(total, po.currency),
    ];
    cells.forEach((cell, i) => doc.text(cell, colX[i], y));
    y += 14;
  }

  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text(`Subtotal: ${moneyExact(po.subtotal, po.currency)}`, margin + 320, y);
  y += 14;
  doc.text(`Tax: ${moneyExact(po.taxTotal, po.currency)}`, margin + 320, y);
  y += 14;
  doc.text(`Discount: ${moneyExact(po.discountTotal, po.currency)}`, margin + 320, y);
  y += 14;
  doc.setFontSize(11);
  doc.text(`Grand total: ${moneyExact(po.grandTotal, po.currency)}`, margin + 320, y);

  if (po.notes) {
    y += 28;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Notes", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(po.notes, margin, y, { maxWidth: 500 });
  }

  return doc.output("blob");
}

export function downloadPurchaseOrderPdf(po: PurchaseOrder) {
  const blob = generatePurchaseOrderPdf(po);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${po.poNumber}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
