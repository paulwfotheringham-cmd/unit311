import { listHrEmployees } from "@/lib/hr-employees-service";
import { getFinancialOverview } from "@/lib/accounting/overview-service";
import { sendMailboxEmail } from "@/lib/email/smtp";
import { generateEmployeeDirectoryPdf } from "@/lib/ai-operating-assistant/employee-pdf-service";
import {
  generateFinancialBoardPdf,
  resolveFinancialPeriod,
} from "@/lib/ai-operating-assistant/financial-pdf-service";
import {
  getAssistantArtifact,
  getLatestArtifactForUser,
  hydrateArtifactFromMessagePayload,
  loadArtifactBytes,
  persistArtifactToStorage,
} from "@/lib/ai-operating-assistant/artifact-store";
import {
  asString,
  toolError,
  toolForbidden,
  toolOk,
  type AssistantToolExecutionContext,
  type AssistantToolResult,
} from "@/lib/ai-operating-assistant/tool-result";

function artifactActions(artifactId: string) {
  return [
    {
      id: `download_${artifactId}`,
      label: "Download",
      kind: "download" as const,
      artifactId,
      href: `/api/executive-assistant/artifacts/${artifactId}?disposition=attachment`,
    },
    {
      id: `open_${artifactId}`,
      label: "Open",
      kind: "open" as const,
      artifactId,
      href: `/api/executive-assistant/artifacts/${artifactId}?disposition=inline`,
    },
    {
      id: `email_${artifactId}`,
      label: "Email",
      kind: "email_artifact" as const,
      artifactId,
      actionId: "emailAssistantArtifact",
    },
  ];
}

/**
 * Immediately generate an employee directory PDF (no salary / compensation).
 */
export async function generateEmployeeListPdf(
  _args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  if (!ctx.business.permissions.canAccessHr) {
    return toolForbidden(
      "generateEmployeeListPdf",
      "Your current role cannot access HR employee data.",
    );
  }

  try {
    const employees = await listHrEmployees();
    let artifact = await generateEmployeeDirectoryPdf({
      employees,
      userId: ctx.business.user.id,
      organisationName: ctx.business.organisation.name,
    });
    artifact = await persistArtifactToStorage(artifact);

    return toolOk(
      "generateEmployeeListPdf",
      [
        {
          artifactId: artifact.id,
          title: artifact.title,
          filename: artifact.filename,
          employeeCount: employees.length,
          downloadUrl: `/api/executive-assistant/artifacts/${artifact.id}?disposition=attachment`,
          openUrl: `/api/executive-assistant/artifacts/${artifact.id}?disposition=inline`,
          contentBase64: artifact.contentBase64,
          columns: ["Name", "Department", "Job title", "Status"],
        },
      ],
      {
        source: ["supabase:hr_employees", "assistant:pdf"],
        pageSize: 1,
        summary: {
          executed: true,
          artifactId: artifact.id,
          title: artifact.title,
          filename: artifact.filename,
          employeeCount: employees.length,
          byteLength: artifact.bytes.length,
          message: `${artifact.filename} ready (${employees.length} employees).`,
        },
        followUpActions: artifactActions(artifact.id),
      },
    );
  } catch (error) {
    return toolError(
      "generateEmployeeListPdf",
      error instanceof Error ? error.message : "Failed to generate employee PDF",
      ["supabase:hr_employees"],
    );
  }
}

/**
 * Generate a live P&L / board financials PDF from GL, AR/AP, expenses, and cash.
 */
export async function generateFinancialReportPdf(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  if (!ctx.business.permissions.canAccessFinancials) {
    return toolForbidden(
      "generateFinancialReportPdf",
      "Your current role cannot access financial reports.",
    );
  }

  try {
    const periodHint = asString(args.period) || asString(args.focus) || "";
    const periodKey = resolveFinancialPeriod(periodHint);
    const overview = await getFinancialOverview(
      ctx.business.workspace.id ? { workspaceId: ctx.business.workspace.id } : undefined,
    );
    let artifact = await generateFinancialBoardPdf({
      overview,
      userId: ctx.business.user.id,
      organisationName: ctx.business.organisation.name,
      periodKey,
      title: /board/i.test(periodHint) || /board/i.test(asString(args.title) || "")
        ? "Board Financial Report"
        : "Profit & Loss Report",
    });
    artifact = await persistArtifactToStorage(artifact);

    return toolOk(
      "generateFinancialReportPdf",
      [
        {
          artifactId: artifact.id,
          title: artifact.title,
          filename: artifact.filename,
          periodKey,
          downloadUrl: `/api/executive-assistant/artifacts/${artifact.id}?disposition=attachment`,
          openUrl: `/api/executive-assistant/artifacts/${artifact.id}?disposition=inline`,
          contentBase64: artifact.contentBase64,
        },
      ],
      {
        source: [
          "supabase:gl",
          "supabase:invoices",
          "supabase:financial_expenses",
          "wise:balances",
          "assistant:pdf",
        ],
        pageSize: 1,
        summary: {
          executed: true,
          artifactId: artifact.id,
          title: artifact.title,
          filename: artifact.filename,
          periodKey,
          byteLength: artifact.bytes.length,
          message: `${artifact.filename} ready.`,
        },
        followUpActions: artifactActions(artifact.id),
      },
    );
  } catch (error) {
    return toolError(
      "generateFinancialReportPdf",
      error instanceof Error ? error.message : "Failed to generate financial PDF",
      ["supabase:financials"],
    );
  }
}

/**
 * Email a previously generated assistant artifact (e.g. employee PDF) to the Board.
 */
export async function emailAssistantArtifact(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
): Promise<AssistantToolResult> {
  const artifactId =
    asString(args.artifactId) || getLatestArtifactForUser(ctx.business.user.id)?.id;
  const contentBase64 = asString(args.contentBase64);
  const title = asString(args.title) || "Document";
  const filename = asString(args.filename) || "document.pdf";

  if (!artifactId && !contentBase64) {
    return toolError(
      "emailAssistantArtifact",
      "No PDF is available in this conversation yet. Generate a PDF first.",
      [],
    );
  }

  let artifact =
    (artifactId
      ? getAssistantArtifact(artifactId, ctx.business.user.id) ||
        (await loadArtifactBytes(artifactId, ctx.business.user.id))
      : null) ?? null;

  if (!artifact && contentBase64 && artifactId) {
    artifact = hydrateArtifactFromMessagePayload({
      id: artifactId,
      title,
      filename,
      userId: ctx.business.user.id,
      contentBase64,
    });
  }

  if (!artifact) {
    return toolError(
      "emailAssistantArtifact",
      "That file could not be loaded. Generate the PDF again, then email it.",
      [],
    );
  }

  const to =
    asString(args.to) ||
    process.env.UNIT311_BOARD_EMAIL ||
    process.env.BOARD_EMAIL ||
    "paul@unit311central.com";

  try {
    await sendMailboxEmail({
      account: "paul",
      to,
      subject: `${artifact.title} — Unit311`,
      text: `Please find attached: ${artifact.title}.\n\nGenerated by the Unit311 AI Executive Assistant.`,
      html: `<p>Please find attached: <strong>${artifact.title}</strong>.</p><p>Generated by the Unit311 AI Executive Assistant.</p>`,
      attachments: [
        {
          filename: artifact.filename,
          content: artifact.bytes,
          contentType: artifact.mimeType,
        },
      ],
      workspaceId: ctx.business.workspace.id,
    });

    return toolOk(
      "emailAssistantArtifact",
      [{ artifactId: artifact.id, to, filename: artifact.filename }],
      {
        source: ["assistant:pdf", "smtp:paul"],
        pageSize: 1,
        summary: {
          executed: true,
          artifactId: artifact.id,
          emailedTo: to,
          message: `Emailed ${artifact.filename} to ${to}.`,
        },
        followUpActions: artifactActions(artifact.id),
      },
    );
  } catch (error) {
    return toolError(
      "emailAssistantArtifact",
      error instanceof Error ? error.message : "Failed to email the PDF",
      ["smtp"],
    );
  }
}
