import { jsPDF } from "jspdf";

import type { BoardPackGraphType, BoardPackPage } from "@/lib/board-pack-data";
import { categoryLabel } from "@/lib/board-pack-data";
import type { ExecutiveSlideContent, ExecutiveSlideLayout } from "@/lib/executive-board-pack-types";
import {
  MONTHLY_REVENUE_DATA,
  PIPELINE_BY_REGION_DATA,
  PROFIT_LOSS_DATA,
} from "@/lib/financials-mock-data";

const SLIDE_W = 297;
const SLIDE_H = 167;
const MARGIN = 18;
const CONTENT_W = SLIDE_W - MARGIN * 2;

type BoardPackPdfPage = BoardPackPage & {
  layout?: ExecutiveSlideLayout;
  summary?: string;
  content?: ExecutiveSlideContent;
};

type BoardPackPdfInput = {
  packName?: string;
  companyName?: string;
  pages: BoardPackPdfPage[];
};

function slideCommentary(page: BoardPackPdfPage): string {
  if (page.content && "commentary" in page.content) return page.content.commentary;
  return page.bodyText.trim();
}

function drawCalloutBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  text: string,
  title = "Executive commentary",
) {
  doc.setDrawColor(56, 189, 248);
  doc.setFillColor(14, 36, 58);
  doc.roundedRect(x, y, width, 34, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setTextColor(96, 165, 250);
  doc.text(title.toUpperCase(), x + 4, y + 6);
  doc.setFontSize(8);
  doc.setTextColor(220, 228, 240);
  const lines = doc.splitTextToSize(text, width - 8);
  let lineY = y + 12;
  for (const line of lines.slice(0, 4)) {
    doc.text(line, x + 4, lineY);
    lineY += 4.2;
  }
}

function drawExecutiveAnalysisGrid(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  analysis: import("@/lib/executive-board-pack-types").ExecutiveAnalysisBlock,
) {
  const cellW = width / 2 - 2;
  const cellH = 16;
  const items = [
    { label: "What happened", text: analysis.whatHappened },
    { label: "Why it happened", text: analysis.whyItHappened },
    { label: "Business impact", text: analysis.businessImpact },
    { label: "Recommended action", text: analysis.recommendedAction },
  ];
  items.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const cellX = x + col * (cellW + 4);
    const cellY = y + row * (cellH + 3);
    doc.setDrawColor(60, 75, 95);
    doc.setFillColor(12, 24, 40);
    doc.roundedRect(cellX, cellY, cellW, cellH, 1.5, 1.5, "FD");
    doc.setFontSize(5.5);
    doc.setTextColor(96, 165, 250);
    doc.text(item.label.toUpperCase(), cellX + 2, cellY + 4);
    doc.setFontSize(6.5);
    doc.setTextColor(220, 228, 240);
    const lines = doc.splitTextToSize(item.text, cellW - 4);
    doc.text(lines[0] ?? "", cellX + 2, cellY + 9);
    if (lines[1]) doc.text(lines[1], cellX + 2, cellY + 13);
  });
}

function drawSlideFooter(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  content: ExecutiveSlideContent | undefined,
  fallbackCommentary: string,
) {
  if (content && "analysis" in content) {
    drawExecutiveAnalysisGrid(doc, x, y, width, content.analysis);
  } else {
    drawCalloutBox(doc, x, y, width, fallbackCommentary);
  }
}

function drawKpiTiles(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  labels: string[],
  values: string[],
  title: string,
) {
  doc.setFontSize(8);
  doc.setTextColor(96, 165, 250);
  doc.text(title, x, y - 2);
  const tileW = width / labels.length - 2;
  labels.forEach((label, index) => {
    const tileX = x + index * (tileW + 2);
    doc.setDrawColor(60, 75, 95);
    doc.setFillColor(12, 24, 40);
    doc.roundedRect(tileX, y, tileW, 22, 1.5, 1.5, "FD");
    doc.setFontSize(6);
    doc.setTextColor(140, 155, 175);
    doc.text(label.toUpperCase(), tileX + 3, y + 6);
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(values[index] ?? "—", tileX + 3, y + 14);
  });
}

function drawMiniTable(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  rows: { left: string; right: string }[],
  title: string,
) {
  doc.setFontSize(8);
  doc.setTextColor(96, 165, 250);
  doc.text(title, x, y - 2);
  doc.setDrawColor(60, 75, 95);
  doc.roundedRect(x, y, width, 8 + rows.length * 7, 2, 2, "S");
  rows.forEach((row, index) => {
    const rowY = y + 6 + index * 7;
    doc.setFontSize(7.5);
    doc.setTextColor(220, 228, 240);
    doc.text(row.left, x + 3, rowY);
    doc.text(row.right, x + width - 3, rowY, { align: "right" });
  });
}

function graphLabel(type: BoardPackGraphType) {
  switch (type) {
    case "accountancy-external":
      return "External accountancy package";
    case "projects-portfolio":
      return "Projects portfolio";
    case "financial-pl":
      return "Profit & loss";
    case "financial-revenue":
      return "Revenue trend";
    case "financial-pipeline":
      return "Pipeline by region";
    default:
      return "";
  }
}

function drawBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  labels: string[],
  values: number[],
  title: string,
) {
  doc.setFontSize(9);
  doc.setTextColor(96, 165, 250);
  doc.text(title, x, y - 4);

  const max = Math.max(...values, 1);
  const barW = width / values.length - 4;
  const chartBottom = y + height;

  doc.setDrawColor(40, 55, 75);
  doc.line(x, chartBottom, x + width, chartBottom);

  values.forEach((value, index) => {
    const barH = (value / max) * (height - 8);
    const barX = x + index * (barW + 4) + 2;
    const barY = chartBottom - barH;
    doc.setFillColor(56, 189, 248);
    doc.rect(barX, barY, barW, barH, "F");
    doc.setFontSize(7);
    doc.setTextColor(180, 190, 205);
    doc.text(labels[index] ?? "", barX + barW / 2, chartBottom + 4, { align: "center" });
  });
}

function drawGraph(doc: jsPDF, type: BoardPackGraphType, x: number, y: number, w: number, h: number) {
  if (type === "none") return;

  doc.setDrawColor(60, 75, 95);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 3, 3, "S");

  switch (type) {
    case "accountancy-external":
      drawBarChart(
        doc,
        x + 8,
        y + 14,
        w - 16,
        h - 28,
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        [420, 445, 468, 492, 510, 535],
        "Business Central · General ledger (€k)",
      );
      break;
    case "projects-portfolio":
      drawBarChart(
        doc,
        x + 8,
        y + 14,
        w - 16,
        h - 28,
        ["Live", "Upcoming", "Complete"],
        [4, 2, 6],
        "Active projects by phase",
      );
      break;
    case "financial-pl": {
      const rows = PROFIT_LOSS_DATA.slice(-6);
      drawBarChart(
        doc,
        x + 8,
        y + 14,
        w - 16,
        h - 28,
        rows.map((row) => row.month.slice(0, 3)),
        rows.map((row) => row.profit),
        "Monthly profit (€k)",
      );
      break;
    }
    case "financial-revenue": {
      const rows = MONTHLY_REVENUE_DATA.slice(-6);
      drawBarChart(
        doc,
        x + 8,
        y + 14,
        w - 16,
        h - 28,
        rows.map((row) => row.month.slice(0, 3)),
        rows.map((row) => row.revenue),
        "Monthly revenue (€k)",
      );
      break;
    }
    case "financial-pipeline":
      drawBarChart(
        doc,
        x + 8,
        y + 14,
        w - 16,
        h - 28,
        PIPELINE_BY_REGION_DATA.map((row) => row.region.slice(0, 3)),
        PIPELINE_BY_REGION_DATA.map((row) => row.value),
        "Pipeline by region (€k)",
      );
      break;
  }
}

class BoardPackDeck {
  private doc: jsPDF;
  private page = 0;

  constructor(
    private packName: string,
    private company: string,
  ) {
    this.doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [SLIDE_W, SLIDE_H] });
  }

  private footer() {
    this.doc.setFontSize(8);
    this.doc.setTextColor(120, 130, 145);
    this.doc.text(
      `${this.company} · ${this.packName} · Confidential`,
      MARGIN,
      SLIDE_H - 8,
    );
    this.doc.text(`Slide ${this.page}`, SLIDE_W - MARGIN, SLIDE_H - 8, { align: "right" });
  }

  addTitleSlide() {
    this.page += 1;
    this.doc.setFillColor(7, 17, 31);
    this.doc.rect(0, 0, SLIDE_W, SLIDE_H, "F");
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(11);
    this.doc.text("BOARD REVIEW PACK", MARGIN, 42);
    this.doc.setFontSize(24);
    this.doc.text(this.packName, MARGIN, 58);
    this.doc.setFontSize(14);
    this.doc.setTextColor(96, 165, 250);
    this.doc.text(this.company, MARGIN, 70);
    this.doc.setFontSize(10);
    this.doc.setTextColor(180, 190, 205);
    this.doc.text(
      `Generated ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}`,
      MARGIN,
      82,
    );
    this.footer();
  }

  addPage(page: BoardPackPdfPage) {
    if (page.layout) {
      this.addConsultingPage(page);
      return;
    }

    this.doc.addPage([SLIDE_W, SLIDE_H], "landscape");
    this.page += 1;

    this.doc.setFillColor(10, 21, 36);
    this.doc.rect(0, 0, SLIDE_W, SLIDE_H, "F");

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(16);
    this.doc.text(page.title || "Untitled page", MARGIN, 22);

    this.doc.setFontSize(9);
    this.doc.setTextColor(96, 165, 250);
    this.doc.text(categoryLabel(page.category).toUpperCase(), MARGIN, 30);

    const hasGraph = page.graphType !== "none";
    const textWidth = hasGraph ? CONTENT_W * 0.48 : CONTENT_W;
    let y = 38;

    if (page.bodyText.trim()) {
      this.doc.setFontSize(9.5);
      this.doc.setTextColor(220, 228, 240);
      const lines = this.doc.splitTextToSize(page.bodyText.trim(), textWidth - 4);
      for (const line of lines) {
        if (y > SLIDE_H - 20) break;
        this.doc.text(line, MARGIN, y);
        y += 5.2;
      }
    }

    if (hasGraph) {
      const graphX = MARGIN + textWidth + 8;
      const graphW = CONTENT_W - textWidth - 8;
      drawGraph(this.doc, page.graphType, graphX, 36, graphW, 90);
      this.doc.setFontSize(8);
      this.doc.setTextColor(140, 155, 175);
      this.doc.text(graphLabel(page.graphType), graphX, 132);
    }

    this.footer();
  }

  private addConsultingPage(page: BoardPackPdfPage) {
    this.doc.addPage([SLIDE_W, SLIDE_H], "landscape");
    this.page += 1;

    this.doc.setFillColor(7, 17, 31);
    this.doc.rect(0, 0, SLIDE_W, SLIDE_H, "F");

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(15);
    this.doc.text(page.title || "Untitled slide", MARGIN, 20);

    this.doc.setFontSize(8);
    this.doc.setTextColor(96, 165, 250);
    this.doc.text((page.layout ?? "consulting").replace(/-/g, " ").toUpperCase(), MARGIN, 27);

    if (page.summary?.trim()) {
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(180, 190, 205);
      const summaryLines = this.doc.splitTextToSize(page.summary.trim(), CONTENT_W);
      this.doc.text(summaryLines[0] ?? "", MARGIN, 33);
    }

    const layout = page.layout ?? "executive-dashboard";
    const content = page.content;
    const commentary = slideCommentary(page);

    if (layout === "executive-dashboard" && content?.layout === "executive-dashboard") {
      drawKpiTiles(
        this.doc,
        MARGIN,
        38,
        CONTENT_W,
        content.kpis.map((k) => k.label),
        content.kpis.map((k) => k.value),
        "Executive KPI dashboard",
      );
      drawBarChart(
        this.doc,
        MARGIN,
        68,
        CONTENT_W * 0.42,
        52,
        content.findings.map((_, i) => `F${i + 1}`),
        [88, 72, 79, 65].slice(0, content.findings.length),
        "Risk indicators",
      );
      drawMiniTable(
        this.doc,
        MARGIN + CONTENT_W * 0.46,
        68,
        CONTENT_W * 0.52,
        content.alerts.map((a) => ({ left: a.text.slice(0, 42), right: a.tone.toUpperCase() })),
        "Executive alerts",
      );
      drawSlideFooter(this.doc, MARGIN, 118, CONTENT_W, content, content.commentary);
    } else if (layout === "financial-waterfall" && content?.layout === "financial-waterfall") {
      drawBarChart(
        this.doc,
        MARGIN,
        38,
        CONTENT_W * 0.48,
        58,
        content.waterfall.map((b) => b.label.slice(0, 6)),
        content.waterfall.map((b) => Math.abs(b.value)),
        "ARR waterfall (indexed)",
      );
      drawBarChart(
        this.doc,
        MARGIN + CONTENT_W * 0.52,
        38,
        CONTENT_W * 0.46,
        58,
        content.revenueTrend.map((p) => p.month),
        content.revenueTrend.map((p) => p.value / 15),
        "Revenue trend",
      );
      drawKpiTiles(
        this.doc,
        MARGIN,
        102,
        CONTENT_W * 0.48,
        content.kpis.map((k) => k.label),
        content.kpis.map((k) => k.value),
        "Financial KPIs",
      );
      drawMiniTable(
        this.doc,
        MARGIN + CONTENT_W * 0.52,
        102,
        CONTENT_W * 0.46,
        content.variance.map((v) => ({ left: v.line, right: v.var })),
        "Variance analysis",
      );
      drawSlideFooter(this.doc, MARGIN, 122, CONTENT_W, content, commentary);
    } else if (layout === "customer-analysis" && content?.layout === "customer-analysis") {
      drawBarChart(
        this.doc,
        MARGIN,
        38,
        CONTENT_W * 0.38,
        55,
        content.topCustomers.slice(0, 5).map((c) => c.name.slice(0, 8)),
        content.topCustomers.slice(0, 5).map((c) => parseFloat(c.share) || 10),
        "Customer concentration",
      );
      drawMiniTable(
        this.doc,
        MARGIN + CONTENT_W * 0.42,
        38,
        CONTENT_W * 0.56,
        content.topCustomers.slice(0, 5).map((c) => ({ left: c.name, right: c.share })),
        "Top customers by ARR",
      );
      drawKpiTiles(
        this.doc,
        MARGIN,
        100,
        CONTENT_W * 0.48,
        content.concentration.map((c) => c.label),
        content.concentration.map((c) => `${c.pct}%`),
        "Concentration metrics",
      );
      this.doc.setDrawColor(60, 75, 95);
      this.doc.roundedRect(MARGIN + CONTENT_W * 0.52, 100, CONTENT_W * 0.46, 28, 2, 2, "S");
      this.doc.setFontSize(8);
      this.doc.setTextColor(96, 165, 250);
      this.doc.text("Account health heat map", MARGIN + CONTENT_W * 0.52 + 4, 106);
      content.heatmap.slice(0, 4).forEach((row, index) => {
        const rowY = 112 + index * 5;
        this.doc.setFontSize(6.5);
        this.doc.setTextColor(180, 190, 205);
        this.doc.text(row.account, MARGIN + CONTENT_W * 0.52 + 4, rowY);
        row.scores.forEach((score, col) => {
          const color =
            score === "bad" ? [244, 63, 94] : score === "warn" ? [245, 158, 11] : [52, 211, 153];
          this.doc.setFillColor(color[0], color[1], color[2]);
          this.doc.rect(MARGIN + CONTENT_W * 0.62 + col * 8, rowY - 3, 6, 4, "F");
        });
      });
      drawSlideFooter(this.doc, MARGIN, 124, CONTENT_W, content, commentary);
    } else if (layout === "sales-recovery" && content?.layout === "sales-recovery") {
      drawBarChart(
        this.doc,
        MARGIN,
        38,
        CONTENT_W * 0.28,
        55,
        content.funnel.map((s) => s.stage.slice(0, 5)),
        content.funnel.map((s) => s.value / 100),
        "Sales funnel",
      );
      drawMiniTable(
        this.doc,
        MARGIN + CONTENT_W * 0.32,
        38,
        CONTENT_W * 0.66,
        content.opportunities.map((o) => ({
          left: `${o.account} (${o.probability}%)`,
          right: o.value,
        })),
        "Recovery opportunities",
      );
      drawBarChart(
        this.doc,
        MARGIN,
        100,
        CONTENT_W * 0.48,
        28,
        content.forecast.map((f) => f.month),
        content.forecast.map((f) => f.upside / 5),
        "Forecast upside",
      );
      drawSlideFooter(this.doc, MARGIN + CONTENT_W * 0.52, 100, CONTENT_W * 0.46, content, commentary);
    } else if (layout === "engineering-roadmap" && content?.layout === "engineering-roadmap") {
      this.doc.setDrawColor(60, 75, 95);
      this.doc.roundedRect(MARGIN, 38, CONTENT_W * 0.58, 52, 2, 2, "S");
      this.doc.setFontSize(8);
      this.doc.setTextColor(96, 165, 250);
      this.doc.text("Delivery roadmap", MARGIN + 4, 44);
      content.roadmap.forEach((item, index) => {
        const rowY = 50 + index * 10;
        this.doc.setFontSize(7);
        this.doc.setTextColor(220, 228, 240);
        this.doc.text(item.initiative.slice(0, 18), MARGIN + 4, rowY);
        this.doc.setFillColor(96, 165, 250);
        this.doc.rect(MARGIN + 52, rowY - 4, item.duration * 12, 5, "F");
      });
      drawKpiTiles(
        this.doc,
        MARGIN + CONTENT_W * 0.62,
        38,
        CONTENT_W * 0.36,
        [...content.debt, ...content.platform].map((k) => k.label),
        [...content.debt, ...content.platform].map((k) => k.value),
        "Engineering health",
      );
      drawBarChart(
        this.doc,
        MARGIN,
        98,
        CONTENT_W * 0.58,
        30,
        content.burndown.map((_, i) => `S${i + 1}`),
        content.burndown,
        "Sprint burndown",
      );
      drawSlideFooter(this.doc, MARGIN + CONTENT_W * 0.62, 98, CONTENT_W * 0.36, content, commentary);
    } else if (layout === "operations-dashboard" && content?.layout === "operations-dashboard") {
      drawKpiTiles(
        this.doc,
        MARGIN,
        38,
        CONTENT_W,
        content.kpis.map((k) => k.label),
        content.kpis.map((k) => k.value),
        "Operational KPI dashboard",
      );
      drawBarChart(
        this.doc,
        MARGIN,
        68,
        CONTENT_W * 0.35,
        48,
        content.sla.map((s) => s.name),
        content.sla.map((s) => s.pct),
        "SLA performance",
      );
      drawMiniTable(
        this.doc,
        MARGIN + CONTENT_W * 0.38,
        68,
        CONTENT_W * 0.62,
        content.support.map((s) => ({ left: s.metric, right: s.value })),
        "Support metrics",
      );
      drawSlideFooter(this.doc, MARGIN, 114, CONTENT_W, content, commentary);
    } else if (layout === "risk-register" && content?.layout === "risk-register") {
      this.doc.setDrawColor(60, 75, 95);
      this.doc.roundedRect(MARGIN, 38, CONTENT_W * 0.32, 58, 2, 2, "S");
      this.doc.setFontSize(8);
      this.doc.setTextColor(96, 165, 250);
      this.doc.text("Risk heat map", MARGIN + 4, 44);
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          const score = row + col;
          this.doc.setFillColor(
            score > 6 ? 244 : score > 4 ? 245 : 52,
            score > 6 ? 63 : score > 4 ? 158 : 211,
            score > 6 ? 94 : score > 4 ? 11 : 153,
          );
          this.doc.rect(MARGIN + 8 + col * 10, 48 + row * 10, 8, 8, "F");
        }
      }
      drawMiniTable(
        this.doc,
        MARGIN + CONTENT_W * 0.36,
        38,
        CONTENT_W * 0.62,
        content.topRisks.map((r) => ({ left: `#${r.rank} ${r.risk.slice(0, 32)}`, right: r.trend })),
        "Top ten risks",
      );
      drawSlideFooter(this.doc, MARGIN, 92, CONTENT_W, content, commentary);
    } else if (layout === "strategy-matrix" && content?.layout === "strategy-matrix") {
      content.roadmap.forEach((horizon, index) => {
        const colX = MARGIN + index * (CONTENT_W / 3 + 2);
        this.doc.setDrawColor(60, 75, 95);
        this.doc.roundedRect(colX, 38, CONTENT_W / 3 - 2, 48, 2, 2, "S");
        this.doc.setFontSize(7.5);
        this.doc.setTextColor(96, 165, 250);
        this.doc.text(horizon.horizon, colX + 4, 44);
        horizon.initiatives.slice(0, 3).forEach((item, row) => {
          this.doc.setFontSize(7);
          this.doc.setTextColor(220, 228, 240);
          this.doc.text(`• ${item.slice(0, 28)}`, colX + 4, 50 + row * 8);
        });
      });
      drawMiniTable(
        this.doc,
        MARGIN,
        92,
        CONTENT_W * 0.52,
        content.actions90.map((a) => ({ left: a.action.slice(0, 34), right: a.due })),
        "90-day actions",
      );
      drawSlideFooter(this.doc, MARGIN + CONTENT_W * 0.56, 92, CONTENT_W * 0.42, content, commentary);
    } else if (layout === "board-decisions" && content?.layout === "board-decisions") {
      content.decisions.slice(0, 4).forEach((decision, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const boxX = MARGIN + col * (CONTENT_W / 2 + 4);
        const boxY = 38 + row * 52;
        this.doc.setDrawColor(60, 75, 95);
        this.doc.setFillColor(12, 24, 40);
        this.doc.roundedRect(boxX, boxY, CONTENT_W / 2 - 2, 46, 2, 2, "FD");
        this.doc.setFontSize(8);
        this.doc.setTextColor(255, 255, 255);
        this.doc.text(decision.title.slice(0, 40), boxX + 4, boxY + 8);
        this.doc.setFontSize(7);
        this.doc.setTextColor(180, 190, 205);
        const lines = this.doc.splitTextToSize(decision.implication, CONTENT_W / 2 - 10);
        this.doc.text(lines[0] ?? "", boxX + 4, boxY + 16);
        this.doc.text(decision.resolution.slice(0, 48), boxX + 4, boxY + 26);
        this.doc.setTextColor(52, 211, 153);
        this.doc.text(decision.outcome.slice(0, 42), boxX + 4, boxY + 36);
      });
      drawSlideFooter(this.doc, MARGIN, 132, CONTENT_W, content, commentary);
    } else {
      this.doc.setFontSize(9);
      this.doc.setTextColor(220, 228, 240);
      const lines = this.doc.splitTextToSize(commentary, CONTENT_W);
      let y = 38;
      for (const line of lines.slice(0, 18)) {
        this.doc.text(line, MARGIN, y);
        y += 4.8;
      }
    }

    this.footer();
  }

  outputBlob(): Blob {
    return this.doc.output("blob");
  }

  save(filename: string) {
    this.doc.save(filename);
  }
}

function buildFilename(input: BoardPackPdfInput) {
  const name = (input.packName ?? "Board-Pack").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
  const date = new Date().toISOString().slice(0, 10);
  return `${name}-${date}.pdf`;
}

function buildDeck(input: BoardPackPdfInput) {
  const packName = input.packName?.trim() || "Board Review Pack";
  const company = input.companyName ?? "OnwardAir";
  const deck = new BoardPackDeck(packName, company);
  deck.addTitleSlide();
  for (const page of input.pages) {
    deck.addPage(page);
  }
  return deck;
}

export function buildBoardPackPdfUrl(input: BoardPackPdfInput) {
  return URL.createObjectURL(buildDeck(input).outputBlob());
}

export function downloadBoardPackPdf(input: BoardPackPdfInput) {
  buildDeck(input).save(buildFilename(input));
}

export function buildBoardPackPdfBlob(input: BoardPackPdfInput) {
  return buildDeck(input).outputBlob();
}

export function boardPackPdfFilename(input: BoardPackPdfInput) {
  return buildFilename(input);
}
