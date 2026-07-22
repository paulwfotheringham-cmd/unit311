import { jsPDF } from "jspdf";

import {
  HR_EMPLOYMENT_STATUS_LABELS,
  type HrEmployee,
} from "@/lib/hr-data";
import {
  createArtifactId,
  putAssistantArtifact,
  type AssistantStoredArtifact,
} from "@/lib/ai-operating-assistant/artifact-store";

type PdfEmployeeRow = {
  fullName: string;
  department: string;
  jobTitle: string;
  status: string;
};

function toRows(employees: HrEmployee[]): PdfEmployeeRow[] {
  return [...employees]
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((employee) => ({
      fullName: employee.fullName || "—",
      department: employee.department || "—",
      jobTitle: employee.role || "—",
      status: HR_EMPLOYMENT_STATUS_LABELS[employee.employmentStatus] ?? employee.employmentStatus,
    }));
}

function drawTable(doc: jsPDF, rows: PdfEmployeeRow[], startY: number) {
  const left = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usable = pageWidth - 80;
  const cols = [
    { key: "fullName" as const, label: "Name", width: usable * 0.32 },
    { key: "department" as const, label: "Department", width: usable * 0.24 },
    { key: "jobTitle" as const, label: "Job title", width: usable * 0.28 },
    { key: "status" as const, label: "Status", width: usable * 0.16 },
  ];
  const rowHeight = 22;
  let y = startY;

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(left, y, usable, rowHeight, "F");
    doc.setTextColor(248, 250, 252);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let x = left + 6;
    for (const col of cols) {
      doc.text(col.label, x, y + 14);
      x += col.width;
    }
    y += rowHeight;
  };

  drawHeader();

  doc.setFont("helvetica", "normal");
  rows.forEach((row, index) => {
    if (y + rowHeight > doc.internal.pageSize.getHeight() - 48) {
      doc.addPage();
      y = 48;
      drawHeader();
      doc.setFont("helvetica", "normal");
    }
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(left, y, usable, rowHeight, "F");
    }
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    let x = left + 6;
    for (const col of cols) {
      const text = doc.splitTextToSize(String(row[col.key]), col.width - 10);
      doc.text(text[0] ?? "", x, y + 14);
      x += col.width;
    }
    y += rowHeight;
  });
}

/**
 * Executive employee directory PDF — logo/title/date + non-sensitive columns only.
 */
export async function generateEmployeeDirectoryPdf(input: {
  employees: HrEmployee[];
  userId: string;
  organisationName?: string | null;
  title?: string;
  filename?: string;
}): Promise<AssistantStoredArtifact> {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const title = input.title?.trim() || "Employee Directory";
  const filename = input.filename?.trim() || "Employee Directory.pdf";

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

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 40, 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(dateLabel, 40, 116);
  doc.text(`${input.employees.length} people`, pageWidth - 40, 116, { align: "right" });

  drawTable(doc, toRows(input.employees), 132);

  const arrayBuffer = doc.output("arraybuffer");
  const bytes = Buffer.from(arrayBuffer);
  const id = createArtifactId();

  return putAssistantArtifact({
    id,
    kind: "pdf",
    title,
    filename,
    mimeType: "application/pdf",
    bytes,
    userId: input.userId,
    meta: {
      employeeCount: input.employees.length,
      generatedAt: new Date().toISOString(),
    },
  });
}
