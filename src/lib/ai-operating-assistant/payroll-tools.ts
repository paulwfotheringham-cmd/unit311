import { persistArtifactToStorage } from "@/lib/ai-operating-assistant/artifact-store";
import {
  asString,
  toolError,
  toolForbidden,
  toolOk,
  type AssistantToolExecutionContext,
  type AssistantToolResult,
} from "@/lib/ai-operating-assistant/tool-result";
import { isBoardPackPayrollEligible } from "@/lib/hr-data";
import { listHrEmployees } from "@/lib/hr-employees-service";
import { calculateEmployeePayroll } from "@/lib/payroll/engine";
import {
  calculateLivePayrollSnapshot,
  createPayrollRun,
  getPayrollDashboard,
  getPayrollRun,
  getPayrollSettings,
  listPayrollRuns,
} from "@/lib/payroll/payroll-service";
import {
  generateBoardPayrollReportPdf,
  generateDepartmentPayrollPdf,
  generateEmployeePayrollSummaryPdf,
  generatePayrollCostReportPdf,
  generatePayrollSummaryPdf,
} from "@/lib/payroll/payroll-pdf-service";

function workspaceScope(ctx: AssistantToolExecutionContext) {
  return ctx.business.workspace.id ? { workspaceId: ctx.business.workspace.id } : undefined;
}

function artifactActions(artifactId: string) {
  return [
    {
      id: `open_${artifactId}`,
      label: "Open",
      kind: "open" as const,
      artifactId,
      href: `/api/executive-assistant/artifacts/${artifactId}?disposition=inline`,
    },
    {
      id: `download_${artifactId}`,
      label: "Download",
      kind: "download" as const,
      artifactId,
      href: `/api/executive-assistant/artifacts/${artifactId}?disposition=attachment`,
    },
  ];
}

function okPdf(
  tool: string,
  artifact: { id: string; title: string; filename: string; bytes: Buffer },
  source: string[],
): AssistantToolResult {
  return toolOk(
    tool,
    [
      {
        artifactId: artifact.id,
        title: artifact.title,
        filename: artifact.filename,
        downloadUrl: `/api/executive-assistant/artifacts/${artifact.id}?disposition=attachment`,
        openUrl: `/api/executive-assistant/artifacts/${artifact.id}?disposition=inline`,
      },
    ],
    {
      source,
      followUpActions: artifactActions(artifact.id),
    },
  );
}

export async function queryPayroll(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  if (!ctx.business.permissions.canAccessHr && !ctx.business.permissions.canAccessFinancials) {
    return toolForbidden("queryPayroll", "Payroll access required for your role.");
  }
  const intent = asString(args.intent) || "overview";
  const scope = workspaceScope(ctx);

  try {
    if (intent === "next_payroll" || intent === "overview") {
      const dashboard = await getPayrollDashboard(scope);
      return toolOk(
        "queryPayroll",
        [
          {
            nextPayrollDate: dashboard.nextPayrollDate,
            monthlyGross: dashboard.monthlyGrossPayroll,
            net: dashboard.estimatedNetPayroll,
            employerTax: dashboard.estimatedEmployerTaxes,
            employeeTax: dashboard.estimatedEmployeeTaxWithheld,
            employees: dashboard.employeeCount,
            currency: dashboard.currency,
            runStatus: dashboard.payrollRunStatus,
          },
        ],
        { source: ["payroll_dashboard"] },
      );
    }

    if (intent === "trend") {
      const dashboard = await getPayrollDashboard(scope);
      return toolOk("queryPayroll", dashboard.trend, { source: ["payroll_dashboard"] });
    }

    if (intent === "department_cost") {
      const dashboard = await getPayrollDashboard(scope);
      const department = asString(args.department);
      const rows = department
        ? dashboard.departmentBreakdown.filter((row) =>
            row.department.toLowerCase().includes(department.toLowerCase()),
          )
        : dashboard.departmentBreakdown;
      return toolOk("queryPayroll", rows, { source: ["payroll_dashboard"] });
    }

    if (intent === "unpaid") {
      const runs = await listPayrollRuns(scope);
      const unpaid = runs.filter((run) =>
        ["draft", "ready", "approved", "processing"].includes(run.status),
      );
      return toolOk("queryPayroll", unpaid, { source: ["payroll_runs"] });
    }

    if (intent === "salary_filter") {
      const minAnnual = Number(args.minAnnualSalary ?? 0);
      const [settings, employees, live] = await Promise.all([
        getPayrollSettings(scope),
        listHrEmployees(scope),
        calculateLivePayrollSnapshot(scope),
      ]);
      const rows = live.lines
        .map((line) => ({
          employeeId: line.employee.id,
          name: line.employee.fullName,
          department: line.department,
          monthlyGross: line.calc.gross,
          annualGross: Math.round(line.calc.gross * 12 * 100) / 100,
          net: line.calc.net,
          currency: line.calc.currency,
        }))
        .filter((row) => row.annualGross >= minAnnual)
        .sort((a, b) => b.annualGross - a.annualGross);

      const seen = new Set(rows.map((row) => row.employeeId));
      for (const employee of employees.filter((entry) =>
        isBoardPackPayrollEligible(entry.employmentStatus),
      )) {
        if (seen.has(employee.id)) continue;
        const calc = calculateEmployeePayroll(
          {
            salaryCurrent: employee.salaryCurrent,
            bonus: employee.bonus,
            payFrequency: employee.payFrequency,
            currency: employee.currency,
          },
          settings,
        );
        const annual = calc.gross * 12;
        if (annual >= minAnnual) {
          rows.push({
            employeeId: employee.id,
            name: employee.fullName,
            department: employee.department || "Unassigned",
            monthlyGross: calc.gross,
            annualGross: Math.round(annual * 100) / 100,
            net: calc.net,
            currency: calc.currency,
          });
        }
      }

      return toolOk("queryPayroll", rows, { source: ["hr_employees", "payroll_engine"] });
    }

    return toolError("queryPayroll", `Unknown payroll intent: ${intent}`);
  } catch (error) {
    return toolError(
      "queryPayroll",
      error instanceof Error ? error.message : "Payroll query failed",
    );
  }
}

export async function createPayrollRunTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  if (!ctx.business.permissions.canAccessHr && !ctx.business.permissions.canAccessFinancials) {
    return toolForbidden("createPayrollRun", "Payroll access required for your role.");
  }
  try {
    const run = await createPayrollRun(
      { payDate: asString(args.payDate) || undefined, notes: asString(args.notes) || undefined },
      workspaceScope(ctx),
    );
    return toolOk(
      "createPayrollRun",
      [
        {
          id: run.id,
          status: run.status,
          payDate: run.payDate,
          employeeCount: run.employeeCount,
          grossPayroll: run.grossPayroll,
          netPayroll: run.netPayroll,
          currency: run.currency,
        },
      ],
      {
        source: ["payroll_runs"],
        followUpActions: [
          {
            id: "open_payroll",
            label: "Open Payroll",
            kind: "open" as const,
            href: "/internaldashboard?view=hr-payroll",
          },
        ],
      },
    );
  } catch (error) {
    return toolError(
      "createPayrollRun",
      error instanceof Error ? error.message : "Failed to create payroll run",
    );
  }
}

export async function generatePayrollPdf(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  if (!ctx.business.permissions.canAccessHr && !ctx.business.permissions.canAccessFinancials) {
    return toolForbidden("generatePayrollPdf", "Payroll access required for your role.");
  }
  const reportType = asString(args.reportType) || "summary";
  const userId = ctx.business.user.id;
  const scope = workspaceScope(ctx);
  try {
    const dashboard = await getPayrollDashboard(scope);
    let artifact;
    if (reportType === "department") {
      artifact = await generateDepartmentPayrollPdf(dashboard, userId);
    } else if (reportType === "cost") {
      artifact = await generatePayrollCostReportPdf(dashboard, userId);
    } else if (reportType === "board") {
      artifact = await generateBoardPayrollReportPdf(dashboard, userId);
    } else if (reportType === "employee") {
      const runId = asString(args.runId);
      const run = runId
        ? await getPayrollRun(runId, scope)
        : (await listPayrollRuns(scope))[0];
      if (!run) return toolError("generatePayrollPdf", "No payroll run available.");
      const detailed =
        run.lines && run.lines.length > 0
          ? run
          : (await getPayrollRun(run.id, scope))!;
      artifact = await generateEmployeePayrollSummaryPdf(detailed, userId);
    } else {
      artifact = await generatePayrollSummaryPdf(dashboard, userId);
    }
    artifact = await persistArtifactToStorage(artifact);
    return okPdf("generatePayrollPdf", artifact, ["payroll_dashboard", "payroll_runs"]);
  } catch (error) {
    return toolError(
      "generatePayrollPdf",
      error instanceof Error ? error.message : "Failed to generate payroll PDF",
    );
  }
}
