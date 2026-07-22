import { jsPDF } from "jspdf";

import {
  createArtifactId,
  putAssistantArtifact,
  type AssistantStoredArtifact,
} from "@/lib/ai-operating-assistant/artifact-store";
import type { PayrollDashboardSnapshot, PayrollRun } from "@/lib/payroll/types";

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function startDoc(title: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 40, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated ${new Date().toISOString().slice(0, 10)}`, 40, 66);
  return doc;
}

async function toArtifact(
  doc: jsPDF,
  title: string,
  filename: string,
  userId: string,
): Promise<AssistantStoredArtifact> {
  const bytes = Buffer.from(doc.output("arraybuffer"));
  const id = createArtifactId();
  return putAssistantArtifact({
    id,
    kind: "pdf",
    title,
    filename,
    mimeType: "application/pdf",
    bytes,
    userId,
  });
}

export async function generatePayrollSummaryPdf(
  dashboard: PayrollDashboardSnapshot,
  userId: string,
): Promise<AssistantStoredArtifact> {
  const doc = startDoc("Payroll Summary");
  const currency = dashboard.currency;
  let y = 96;
  const rows = [
    ["Monthly gross", money(dashboard.monthlyGrossPayroll, currency)],
    ["Employee tax withheld", money(dashboard.estimatedEmployeeTaxWithheld, currency)],
    ["Employer taxes", money(dashboard.estimatedEmployerTaxes, currency)],
    ["Net payroll", money(dashboard.estimatedNetPayroll, currency)],
    ["Next payroll date", dashboard.nextPayrollDate],
    ["Employees", String(dashboard.employeeCount)],
    ["Average salary", money(dashboard.averageSalary, currency)],
  ];
  for (const [label, value] of rows) {
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(label, 40, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 240, y);
    y += 18;
  }
  return toArtifact(doc, "Payroll Summary", "payroll-summary.pdf", userId);
}

export async function generateDepartmentPayrollPdf(
  dashboard: PayrollDashboardSnapshot,
  userId: string,
): Promise<AssistantStoredArtifact> {
  const doc = startDoc("Department Payroll");
  let y = 96;
  doc.setFont("helvetica", "bold");
  doc.text("Department", 40, y);
  doc.text("Employees", 220, y);
  doc.text("Gross", 320, y);
  doc.text("Net", 420, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  for (const row of dashboard.departmentBreakdown) {
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
    doc.text(row.department.slice(0, 28), 40, y);
    doc.text(String(row.employees), 220, y);
    doc.text(money(row.gross, dashboard.currency), 320, y);
    doc.text(money(row.net, dashboard.currency), 420, y);
    y += 16;
  }
  return toArtifact(doc, "Department Payroll", "department-payroll.pdf", userId);
}

export async function generateEmployeePayrollSummaryPdf(
  run: PayrollRun,
  userId: string,
): Promise<AssistantStoredArtifact> {
  const doc = startDoc(`Employee Payroll · ${run.payDate}`);
  let y = 96;
  doc.setFont("helvetica", "bold");
  doc.text("Employee", 40, y);
  doc.text("Gross", 220, y);
  doc.text("Tax", 300, y);
  doc.text("Net", 400, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  for (const line of run.lines ?? []) {
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
    const tax = line.federalTax + line.stateTax + line.socialSecurity + line.medicare;
    doc.text(line.employeeName.slice(0, 28), 40, y);
    doc.text(money(line.gross, line.currency), 220, y);
    doc.text(money(tax, line.currency), 300, y);
    doc.text(money(line.net, line.currency), 400, y);
    y += 16;
  }
  return toArtifact(doc, "Employee Payroll Summary", `employee-payroll-${run.payDate}.pdf`, userId);
}

export async function generatePayrollCostReportPdf(
  dashboard: PayrollDashboardSnapshot,
  userId: string,
): Promise<AssistantStoredArtifact> {
  const doc = startDoc("Payroll Cost Report");
  let y = 96;
  const totalCost = dashboard.monthlyGrossPayroll + dashboard.estimatedEmployerTaxes;
  doc.setTextColor(15, 23, 42);
  doc.text(`Total monthly employment cost: ${money(totalCost, dashboard.currency)}`, 40, y);
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.text("Month", 40, y);
  doc.text("Gross", 140, y);
  doc.text("Net", 260, y);
  doc.text("Employer tax", 360, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  for (const point of dashboard.trend) {
    doc.text(point.month, 40, y);
    doc.text(money(point.gross, dashboard.currency), 140, y);
    doc.text(money(point.net, dashboard.currency), 260, y);
    doc.text(money(point.employerTax, dashboard.currency), 360, y);
    y += 16;
  }
  return toArtifact(doc, "Payroll Cost Report", "payroll-cost-report.pdf", userId);
}

export async function generateBoardPayrollReportPdf(
  dashboard: PayrollDashboardSnapshot,
  userId: string,
): Promise<AssistantStoredArtifact> {
  const doc = startDoc("Board Payroll Report");
  let y = 96;
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const paragraphs = [
    `Headcount on payroll: ${dashboard.employeeCount}`,
    `Monthly gross payroll: ${money(dashboard.monthlyGrossPayroll, dashboard.currency)}`,
    `Estimated net payroll: ${money(dashboard.estimatedNetPayroll, dashboard.currency)}`,
    `Employer tax estimate: ${money(dashboard.estimatedEmployerTaxes, dashboard.currency)}`,
    `Next payroll date: ${dashboard.nextPayrollDate}`,
    `Latest run status: ${dashboard.payrollRunStatus}`,
    `Top department by cost: ${dashboard.departmentBreakdown[0]?.department ?? "n/a"} (${money(dashboard.departmentBreakdown[0]?.gross ?? 0, dashboard.currency)})`,
  ];
  for (const line of paragraphs) {
    doc.text(line, 40, y);
    y += 20;
  }
  return toArtifact(doc, "Board Payroll Report", "board-payroll-report.pdf", userId);
}
