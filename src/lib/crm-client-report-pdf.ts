import { jsPDF } from "jspdf";

import {
  buildClientReportSections,
  buildClientReportSummary,
  clientReportSlideCount,
} from "@/lib/crm-client-report-content";
import {
  CRM_COMPANY_LOGO_PDF_HEIGHT_MM,
  CRM_COMPANY_LOGO_PDF_WIDTH_MM,
  type ClientReportLogo,
} from "@/lib/crm-company-logo-data";
import type { CrmLead } from "@/lib/crm-data";
import type { DiscoveryQuestionnaireData } from "@/lib/discovery-questions-data";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BODY_BOTTOM = PAGE_H - MARGIN;

export function clientReportFileName(organization: string) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
  const safeOrg = organization.replace(/[<>:"/\\|?*]+/g, "").trim() || "Client";
  return `Executive Report — ${safeOrg} — ${date}.pdf`;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number) {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

function lineHeightForFont(fontSize: number) {
  return fontSize * 0.45;
}

function measureParagraphsHeight(doc: jsPDF, paragraphs: string[], fontSize: number, maxWidth: number) {
  doc.setFontSize(fontSize);
  let height = 0;
  for (const paragraph of paragraphs) {
    const lines = wrapText(doc, paragraph, maxWidth);
    height += lines.length * lineHeightForFont(fontSize) + 2;
  }
  return height;
}

function writeParagraphsWithinBounds(
  doc: jsPDF,
  paragraphs: string[],
  startY: number,
  maxY: number,
  preferredFontSize = 10,
) {
  let fontSize = preferredFontSize;
  while (fontSize >= 7) {
    const requiredHeight = measureParagraphsHeight(doc, paragraphs, fontSize, CONTENT_W);
    if (requiredHeight <= maxY - startY || fontSize <= 7) {
      doc.setFontSize(fontSize);
      let y = startY;
      for (const paragraph of paragraphs) {
        const lines = wrapText(doc, paragraph, CONTENT_W);
        for (const line of lines) {
          if (y > maxY) return y;
          doc.text(line, MARGIN, y);
          y += lineHeightForFont(fontSize);
        }
        y += 2;
      }
      return y;
    }
    fontSize -= 0.5;
  }

  doc.setFontSize(7);
  let y = startY;
  for (const paragraph of paragraphs) {
    const lines = wrapText(doc, paragraph, CONTENT_W);
    for (const line of lines) {
      if (y > maxY) return y;
      doc.text(line, MARGIN, y);
      y += lineHeightForFont(7);
    }
    y += 2;
  }
  return y;
}

function drawTitlePage(doc: jsPDF, lead: CrmLead, generatedAt: string, logo: ClientReportLogo | null) {
  doc.setFillColor(11, 45, 99);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(
      PAGE_W - MARGIN - CRM_COMPANY_LOGO_PDF_WIDTH_MM - 2,
      MARGIN - 2,
      CRM_COMPANY_LOGO_PDF_WIDTH_MM + 4,
      CRM_COMPANY_LOGO_PDF_HEIGHT_MM + 4,
      2,
      2,
      "F",
    );
    doc.addImage(
      logo.dataUrl,
      "PNG",
      PAGE_W - MARGIN - CRM_COMPANY_LOGO_PDF_WIDTH_MM,
      MARGIN,
      CRM_COMPANY_LOGO_PDF_WIDTH_MM,
      CRM_COMPANY_LOGO_PDF_HEIGHT_MM,
    );
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Executive Strategy Report", MARGIN, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(18);
  doc.setTextColor(226, 232, 240);
  doc.text(lead.companyName.trim() || "Client organisation", MARGIN, 68);
  doc.setFontSize(12);
  doc.setTextColor(191, 219, 254);
  doc.text(`Prepared for ${lead.contactName.trim() || "Contact"}`, MARGIN, 82);
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated ${formatLondonDateTime(generatedAt)} GMT`, MARGIN, 260);
  doc.text("Unit311 Central", MARGIN, 268);
}

function drawSummaryPage(doc: jsPDF, lead: CrmLead) {
  doc.setTextColor(11, 45, 99);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Summary", MARGIN, 28);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  writeParagraphsWithinBounds(doc, [buildClientReportSummary(lead)], 40, BODY_BOTTOM, 11);
}

function drawSectionPage(doc: jsPDF, heading: string, lines: string[]) {
  doc.setTextColor(11, 45, 99);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(heading, MARGIN, 28);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  writeParagraphsWithinBounds(doc, lines, 40, BODY_BOTTOM, 10);
}

export async function buildCrmClientReportPdf(
  lead: CrmLead,
  questionnaire: DiscoveryQuestionnaireData | null,
  logo: ClientReportLogo | null = null,
): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const generatedAt = new Date().toISOString();
  const sections = buildClientReportSections({ lead, questionnaire });

  drawTitlePage(doc, lead, generatedAt, logo);

  doc.addPage();
  drawSummaryPage(doc, lead);

  for (const section of sections) {
    doc.addPage();
    drawSectionPage(doc, section.heading, section.lines);
  }

  const expectedPages = clientReportSlideCount(sections);
  const actualPages = doc.getNumberOfPages();
  if (actualPages !== expectedPages) {
    throw new Error(
      `PDF page count mismatch: expected ${expectedPages} pages to match the PowerPoint deck, got ${actualPages}.`,
    );
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
