import assert from "node:assert/strict";
import {
  classifyReportIntent,
  inferReportTypeFromHistory,
  reportDisplayMeta,
} from "../report-intent";
import { resolveDirectIntent } from "../intent-router";

function check(label: string, condition: boolean) {
  assert.equal(condition, true, label);
}

// Explicit engineering — must NOT become financial
{
  const classified = classifyReportIntent(
    "Create me an engineering report PDF for my boss",
  );
  check("engineering classified", classified?.reportType === "engineering");
  check(
    "engineering filename",
    classified?.filename === "Engineering Status Report.pdf",
  );
  const intent = resolveDirectIntent(
    "Create me an engineering report PDF for my boss",
    [],
  );
  check("engineering tool", intent?.tool === "generateReportPdf");
  check(
    "engineering args",
    intent?.args.reportType === "engineering",
  );
}

{
  const intent = resolveDirectIntent("Create a financial report", []);
  check("financial tool", intent?.tool === "generateFinancialReportPdf");
}

{
  const intent = resolveDirectIntent("Export all employees to PDF", []);
  check("employee tool", intent?.tool === "generateEmployeeListPdf");
}

{
  const intent = resolveDirectIntent("Create a board report PDF", []);
  check("board tool", intent?.tool === "generateReportPdf");
  check("board type", intent?.args.reportType === "board");
}

{
  const intent = resolveDirectIntent("Create a project report PDF", []);
  check("project tool", intent?.tool === "generateReportPdf");
  check("project type", intent?.args.reportType === "project");
}

{
  const intent = resolveDirectIntent("Create a client report PDF", []);
  check("client tool", intent?.tool === "generateReportPdf");
  check("client type", intent?.args.reportType === "client");
}

// Follow-up after engineering discussion — must NOT default to financial
{
  const history = [
    {
      id: "1",
      role: "user" as const,
      content: "Create me an engineering report PDF for my boss",
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      role: "assistant" as const,
      content: "Engineering Status Report.pdf",
      createdAt: new Date().toISOString(),
      artifacts: [
        {
          id: "art_1",
          kind: "pdf" as const,
          title: "Engineering Status Report",
          filename: "Engineering Status Report.pdf",
          downloadUrl: "/x",
          openUrl: "/y",
        },
      ],
    },
  ];
  check(
    "history infers engineering",
    inferReportTypeFromHistory(history) === "engineering",
  );
  const followUp = resolveDirectIntent("Generate it.", history);
  check("follow-up tool", followUp?.tool === "generateReportPdf");
  check("follow-up type", followUp?.args.reportType === "engineering");
}

// Email after PDF
{
  const history = [
    {
      id: "1",
      role: "assistant" as const,
      content: "ready",
      createdAt: new Date().toISOString(),
      artifacts: [
        {
          id: "art_abc",
          kind: "pdf" as const,
          title: "Engineering Status Report",
          filename: "Engineering Status Report.pdf",
          downloadUrl: "/x",
          openUrl: "/y",
        },
      ],
    },
  ];
  const email = resolveDirectIntent("Email artifact art_abc to the Board.", history);
  check("email tool", email?.tool === "emailAssistantArtifact");
  check("email artifact id", email?.args.artifactId === "art_abc");
}

{
  const meta = reportDisplayMeta("board");
  check("board filename has month", /Board Report - /.test(meta.filename));
  check("no duplicated iso date", !/\d{4}-\d{2}-\d{2}/.test(meta.filename));
}

console.log("report-intent checks passed");
