import { jsPDF } from "jspdf";

import type { BookThankYouSelections } from "@/lib/book-thank-you-data";
import {
  BOOK_THANK_YOU_GENERAL_ITEMS,
  BOOK_THANK_YOU_MODULE_ITEMS,
  getSelectedBookThankYouItems,
} from "@/lib/book-thank-you-data";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";

const PAGE_W = 210;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

export type BookThankYouPdfInput = {
  contactName: string;
  organization: string;
  email: string;
  sessionWhenGmt: string;
  sessionWhenClient?: string | null;
  meetingLink: string;
  selections: BookThankYouSelections;
};

export function bookThankYouPdfFileName(organization: string) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
  const safeOrg = organization.replace(/[<>:"/\\|?*]+/g, "").trim() || "Client";
  return `Session Focus Areas — ${safeOrg} — ${date}.pdf`;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number) {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

function ensureSpace(doc: jsPDF, y: number, needed: number) {
  if (y + needed <= 280) return y;
  doc.addPage();
  return 24;
}

function renderCheckboxList(
  doc: jsPDF,
  items: readonly string[],
  selected: Set<string>,
  startY: number,
) {
  let y = startY;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  for (const item of items) {
    y = ensureSpace(doc, y, 8);
    const checked = selected.has(item);
    doc.setFont("helvetica", checked ? "bold" : "normal");
    doc.setTextColor(checked ? 11 : 71, checked ? 45 : 85, checked ? 99 : 105);
    const prefix = checked ? "[x]" : "[ ]";
    const lines = wrapText(doc, `${prefix} ${item}`, CONTENT_W - 4);
    doc.text(lines, MARGIN + 2, y);
    y += lines.length * 5 + 2;
  }

  return y;
}

export async function buildBookThankYouFocusPdf(input: BookThankYouPdfInput): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const generatedAt = new Date().toISOString();
  const { general, modules } = getSelectedBookThankYouItems(input.selections);
  const selectedGeneral = new Set(general);
  const selectedModules = new Set(modules);

  doc.setFillColor(11, 45, 99);
  doc.rect(0, 0, PAGE_W, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Discovery Session Focus Areas", MARGIN, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(147, 197, 253);
  doc.text("Unit311 Central", MARGIN, 24);
  doc.text(`Generated ${formatLondonDateTime(generatedAt)} GMT`, MARGIN, 30);

  let y = 48;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(input.organization.trim() || "Client organisation", MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Prepared for ${input.contactName.trim() || "Contact"}`, MARGIN, y);
  y += 5;
  doc.text(input.email.trim(), MARGIN, y);
  y += 10;

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Session details", MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`When (GMT): ${input.sessionWhenGmt}`, MARGIN, y);
  y += 5;
  if (input.sessionWhenClient) {
    doc.text(`Client time: ${input.sessionWhenClient}`, MARGIN, y);
    y += 5;
  }
  const meetingLines = wrapText(doc, `Meeting link: ${input.meetingLink}`, CONTENT_W);
  doc.text(meetingLines, MARGIN, y);
  y += meetingLines.length * 5 + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(14, 116, 144);
  doc.text("General focus areas", MARGIN, y);
  y += 7;
  y = renderCheckboxList(doc, BOOK_THANK_YOU_GENERAL_ITEMS, selectedGeneral, y) + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(91, 33, 182);
  doc.text("Modules of interest", MARGIN, y);
  y += 7;
  y = renderCheckboxList(doc, BOOK_THANK_YOU_MODULE_ITEMS, selectedModules, y) + 6;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const summary =
    general.length + modules.length === 0
      ? "No specific focus areas were selected. The team will explore priorities during the discovery call."
      : `${general.length} general area${general.length === 1 ? "" : "s"} and ${modules.length} module${modules.length === 1 ? "" : "s"} selected for discussion.`;
  const summaryLines = wrapText(doc, summary, CONTENT_W);
  y = ensureSpace(doc, y, summaryLines.length * 5 + 4);
  doc.text(summaryLines, MARGIN, y);

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
