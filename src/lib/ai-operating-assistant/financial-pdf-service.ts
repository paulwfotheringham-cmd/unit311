import { jsPDF } from "jspdf";

import type { FinancialOverviewSnapshot } from "@/lib/accounting/types";
import {
  createArtifactId,
  putAssistantArtifact,
  type AssistantStoredArtifact,
} from "@/lib/ai-operating-assistant/artifact-store";

function money(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `$${(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
}

function monthLabel(isoMonth: string) {
  const [year, month] = isoMonth.split("-").map(Number);
  if (!year || !month) return isoMonth;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function previousMonthKey(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

export function resolveFinancialPeriod(periodHint?: string | null) {
  const hint = (periodHint || "").toLowerCase();
  const now = new Date();
  if (/last\s+month|previous\s+month|prior\s+month/.test(hint)) {
    return previousMonthKey(now);
  }
  if (/ytd|year\s+to\s+date|this\s+year/.test(hint)) {
    return "ytd";
  }
  return now.toISOString().slice(0, 7);
}

/**
 * Board financial / P&L PDF from live overview figures — never invents metrics.
 */
export async function generateFinancialBoardPdf(input: {
  overview: FinancialOverviewSnapshot;
  userId: string;
  organisationName?: string | null;
  periodKey?: string;
  title?: string;
  filename?: string;
}): Promise<AssistantStoredArtifact> {
  const periodKey = input.periodKey || resolveFinancialPeriod(null);
  const isYtd = periodKey === "ytd";
  const periodTitle = isYtd ? `Year to date ${new Date().getUTCFullYear()}` : monthLabel(periodKey);

  const monthlyPl = input.overview.charts.monthlyProfitLoss.find((row) => row.month === periodKey);
  const monthlyRevenuePoint = input.overview.charts.monthlyRevenue.find(
    (row) => row.month === periodKey,
  );
  const monthlyOutPoint = input.overview.charts.monthlyOutgoings.find(
    (row) => row.month === periodKey,
  );

  const revenue = isYtd
    ? input.overview.annualRevenue || input.overview.revenueYtd
    : monthlyRevenuePoint?.amount ?? input.overview.monthlyRevenue;
  const expenses = isYtd
    ? input.overview.annualExpenses || input.overview.monthlyExpenses
    : monthlyOutPoint?.amount ?? input.overview.monthlyExpenses;
  const profit = isYtd
    ? input.overview.netProfit
    : monthlyPl
      ? monthlyPl.profit - monthlyPl.loss
      : revenue - expenses;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  doc.setFillColor(14, 165, 233);
  doc.roundedRect(40, 36, 28, 28, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("U3", 48, 54);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text("Unit311", 78, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(input.organisationName?.trim() || "Central", 78, 62);

  const title = input.title || "Board Financial Report";
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 40, 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(periodTitle, 40, 116);
  doc.text(dateLabel, pageWidth - 40, 116, { align: "right" });

  let y = 140;
  const left = 40;
  const usable = pageWidth - 80;

  const drawSection = (heading: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(heading, left, y);
    y += 16;
  };

  const drawRow = (label: string, value: string, emphasize = false) => {
    doc.setFillColor(emphasize ? 241 : 248, emphasize ? 245 : 250, emphasize ? 255 : 252);
    doc.rect(left, y - 12, usable, 22, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(label, left + 8, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(value, left + usable - 8, y, { align: "right" });
    y += 26;
  };

  drawSection("Profit & Loss");
  drawRow("Revenue", money(revenue));
  drawRow("Expenses", money(expenses));
  drawRow("Net profit / (loss)", money(profit), true);

  y += 10;
  drawSection("Balance sheet signals");
  drawRow("Cash position", money(input.overview.cashPosition));
  drawRow("Accounts receivable", money(input.overview.accountsReceivable));
  drawRow("Accounts payable", money(input.overview.accountsPayable));
  drawRow(
    "Monthly burn",
    money(input.overview.burnRate.monthly, input.overview.burnRate.currency || "USD"),
  );
  if (input.overview.burnRate.runwayMonths != null) {
    drawRow("Cash runway (months)", String(input.overview.burnRate.runwayMonths));
  }

  y += 10;
  drawSection("Receivables");
  drawRow("Outstanding invoices", String(input.overview.outstandingInvoices));
  drawRow("AR outstanding", money(input.overview.ar.outstanding));
  drawRow("AR overdue", money(input.overview.ar.overdue));
  drawRow("Collection rate", `${input.overview.ar.collectionRate}%`);

  if (input.overview.ar.recentUnpaid.length > 0) {
    y += 8;
    drawSection("Top unpaid invoices");
    for (const invoice of input.overview.ar.recentUnpaid.slice(0, 6)) {
      if (y > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        y = 48;
      }
      drawRow(
        `${invoice.clientName ?? invoice.invoiceNumber} · due ${invoice.dueDate}`,
        money(invoice.amount, invoice.currency || "USD"),
      );
    }
  }

  y += 12;
  if (y > doc.internal.pageSize.getHeight() - 48) {
    doc.addPage();
    y = 48;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Figures sourced from live Unit311 financials (GL, invoices, expenses, Wise cash). Zeros mean no posted activity — not estimates.",
    left,
    y,
    { maxWidth: usable },
  );

  const filename =
    input.filename?.trim() ||
    (title.toLowerCase().includes("board")
      ? `Board Financial Report - ${periodTitle}.pdf`
      : `Financial Report - ${periodTitle}.pdf`);
  const arrayBuffer = doc.output("arraybuffer");
  const bytes = Buffer.from(arrayBuffer);
  const id = createArtifactId();

  return putAssistantArtifact({
    id,
    kind: "pdf",
    title: title,
    filename,
    mimeType: "application/pdf",
    bytes,
    userId: input.userId,
    meta: {
      periodKey,
      revenue,
      expenses,
      profit,
      generatedAt: new Date().toISOString(),
    },
  });
}
