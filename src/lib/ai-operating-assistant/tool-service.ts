import type { AssistantBusinessContext, AssistantToolDefinition, AssistantToolHandler } from "./types";
import type { AssistantToolExecutionContext } from "./tool-result";
import {
  generateReport,
  searchClients,
  searchContracts,
  searchCRM,
  searchEmployees,
  searchFiles,
  searchProjects,
  searchTasks,
} from "./tool-implementations";
import {
  emailAssistantArtifact,
  generateEmployeeListPdf,
  generateFinancialReportPdf,
  generateReportPdf,
} from "./artifact-tools";
import {
  getPageGuideTool,
  highlightUiTarget,
  listPageGuidesTool,
  startGuidedTour,
} from "./guided-learning-tools";
import {
  detectWorkflowIntentTool,
  getBusinessHealthTool,
  getDailyBriefTool,
  getProactiveNotificationsTool,
  getReleaseIntelligenceTool,
  getRoleFocusTool,
  getSmartInsightsTool,
  guideWorkflowTool,
  listReleaseFeaturesTool,
  listWorkflowsTool,
  queryBusinessTool,
} from "./proactive-tools";

/**
 * Tool Service — register OpenAI function tools and handlers here.
 * Adding a tool = define schema + implement handler. Routes stay thin.
 */

export const ASSISTANT_TOOL_DEFINITIONS: AssistantToolDefinition[] = [
  {
    name: "queryBusiness",
    description:
      "Answer ANY open business question with a live snapshot (clients, projects, finance, HR, CRM, overview). Call this first for questions like how the business is doing, risks, cash, headcount, pipeline, overdue work, or general operating status. Prefer this over refusing or guessing.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The user question being answered",
        },
        domain: {
          type: "string",
          enum: ["all", "overview", "clients", "projects", "finance", "hr", "crm"],
          description: "Optional domain focus; default all/overview",
        },
        topic: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "searchClients",
    description:
      "Search live client directory. Use for active clients, inactive clients, contract type, and client details. Respects selected client in context.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search text" },
        status: { type: "string", description: "Optional account status filter" },
        clientId: { type: "string" },
        inactiveDays: {
          type: "number",
          description: "Approximate inactive filter when last-activity is unavailable",
        },
        page: { type: "number" },
        pageSize: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "searchProjects",
    description:
      "Search live projects. Use overdue=true for projects past end date. Uses selected client/project from context when relevant.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        phase: { type: "string", enum: ["live", "upcoming", "all"] },
        overdue: { type: "boolean" },
        clientId: { type: "string" },
        projectId: { type: "string" },
        page: { type: "number" },
        pageSize: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "searchEmployees",
    description:
      "Search HR employees, leave balances, and recruitment open roles. Requires HR permission.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        employeeId: { type: "string" },
        onLeave: { type: "boolean" },
        page: { type: "number" },
        pageSize: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "searchFiles",
    description:
      "Search files or analyze a selected/document fileId for text excerpts (summaries, risks, ISO mentions, payment terms).",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        mention: { type: "string", description: "Phrase to find, e.g. ISO 13485" },
        fileId: { type: "string" },
        analyze: { type: "boolean" },
        scope: { type: "string", enum: ["internal", "external", "client"] },
        page: { type: "number" },
        pageSize: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "searchContracts",
    description:
      "Search commercial client contract types and employment contracts. Uses selected client when present.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        clientId: { type: "string" },
        contractId: { type: "string" },
        expireWithinDays: { type: "number" },
        page: { type: "number" },
        pageSize: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "searchTasks",
    description:
      "Search open/overdue tasks from command-centre actions and CRM next actions. Use for workload and overdue questions.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        status: { type: "string", enum: ["open", "overdue"] },
        overdue: { type: "boolean" },
        page: { type: "number" },
        pageSize: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "searchCRM",
    description: "Search CRM leads and pipeline opportunities from live Supabase data.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        status: { type: "string", enum: ["Cold", "Warm", "Hot", "Won", "Lost"] },
        page: { type: "number" },
        pageSize: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "generateReport",
    description:
      "Generate a text executive/board/client/project/HR/finance/engineering summary from live tool data. Prefer generateReportPdf / generateFinancialReportPdf / generateEmployeeListPdf when the user asked for a PDF.",
    parameters: {
      type: "object",
      properties: {
        reportType: {
          type: "string",
          enum: [
            "board",
            "weekly",
            "client",
            "finance",
            "project",
            "hr",
            "executive",
            "engineering",
          ],
        },
        focus: { type: "string" },
        clientId: { type: "string" },
      },
      required: ["reportType"],
      additionalProperties: false,
    },
  },
  {
    name: "generateReportPdf",
    description:
      "Generate a real PDF from live workspace data for engineering, board, project portfolio, or client reports. Use immediately when the user asks for those PDFs. Do not ask for confirmation. Do not use this for financial P&L (use generateFinancialReportPdf) or employee directory (use generateEmployeeListPdf).",
    parameters: {
      type: "object",
      properties: {
        reportType: {
          type: "string",
          enum: ["engineering", "board", "project", "client"],
        },
        title: { type: "string" },
        filename: { type: "string" },
      },
      required: ["reportType"],
      additionalProperties: false,
    },
  },
  {
    name: "generateFinancialReportPdf",
    description:
      "Generate a real financial/P&L PDF from live GL, invoices, expenses, and cash. Use for financial report, P&L, board financials. Do not use for engineering/project/client/employee PDFs.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          description: "Optional period hint such as 'last month', 'YTD', or YYYY-MM",
        },
        title: { type: "string" },
        filename: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "generateEmployeeListPdf",
    description:
      "Generate a real employee directory PDF (name, department, job title, status only — never salary). Call ONLY when the user explicitly asks for a PDF/export/download of employees. Do NOT call this for a plain list/show employees request — use searchEmployees instead.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        filename: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "emailAssistantArtifact",
    description:
      "Email a previously generated assistant PDF/artifact (resolve pronouns like it/that PDF/the report to the latest artifactId). Use immediately when the user asks to email it. Default recipient is the Board distribution. artifactId is optional when a PDF already exists in conversation context.",
    parameters: {
      type: "object",
      properties: {
        artifactId: { type: "string" },
        to: { type: "string", description: "Optional recipient override" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getPageGuide",
    description:
      "Load AI Guided Learning metadata for the current (or specified) page: purpose, KPIs, buttons, tables, workflows, common questions, highlight targets.",
    parameters: {
      type: "object",
      properties: {
        viewId: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "startGuidedTour",
    description:
      "Start an interactive Show Me Around walkthrough for the current page. Returns a clientAction the UI must dispatch.",
    parameters: {
      type: "object",
      properties: {
        viewId: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "highlightUiTarget",
    description:
      "Highlight and scroll to a specific UI control while explaining it (KPI, button, table, form, filter).",
    parameters: {
      type: "object",
      properties: {
        targetId: { type: "string" },
        viewId: { type: "string" },
        explanation: { type: "string" },
      },
      required: ["targetId"],
      additionalProperties: false,
    },
  },
  {
    name: "listPageGuides",
    description: "List registered pages available for guided learning.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "getDailyBrief",
    description:
      "Generate today's personalised Daily Executive Brief from live platform data (priorities, risks, deadlines, finance, HR, CRM).",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "getSmartInsights",
    description:
      "Continuously analysed smart insights with recommended actions (stale projects, inactive clients, overdue invoices, leave, recruitment).",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string" },
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getBusinessHealth",
    description:
      "AI Business Health Score across Projects, Finance, HR, Compliance, CRM, Operations — with strengths, risks, actions, confidence.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "getProactiveNotifications",
    description: "Meaningful proactive notifications only (critical/high severity events).",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "listWorkflows",
    description:
      "List Workflow Registry entries (Onboard Client, Create Project, etc.). Prefer recommending workflows over individual pages.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "detectWorkflowIntent",
    description:
      "Detect which workflow the user wants (e.g. “I need to onboard a client”) and return a guided session. Must guide via UI, not text-only.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string" },
        query: { type: "string" },
        intent: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "guideWorkflow",
    description:
      "Guide the user through a workflow step with navigate/highlight clientActions using existing guided learning.",
    parameters: {
      type: "object",
      properties: {
        workflowId: { type: "string" },
        id: { type: "string" },
        stepIndex: { type: "number" },
      },
      required: ["workflowId"],
      additionalProperties: false,
    },
  },
  {
    name: "getReleaseIntelligence",
    description:
      "Features added since last visit; offer a 90-second guided tour for returning users after updates.",
    parameters: {
      type: "object",
      properties: {
        lastSeenAt: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "getRoleFocus",
    description: "Role-aware focus profile (CEO, HR, Project Manager, Finance, Operator).",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "listReleaseFeatures",
    description: "List tracked product releases for release intelligence.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

type ContextualToolHandler = (
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) => Promise<unknown>;

const handlers: Record<string, ContextualToolHandler> = {
  queryBusiness: queryBusinessTool,
  searchClients,
  searchProjects,
  searchEmployees,
  searchFiles,
  searchContracts,
  searchTasks,
  searchCRM,
  generateReport,
  generateEmployeeListPdf,
  generateFinancialReportPdf,
  generateReportPdf,
  emailAssistantArtifact,
  getPageGuide: getPageGuideTool,
  startGuidedTour,
  highlightUiTarget,
  listPageGuides: listPageGuidesTool,
  getDailyBrief: getDailyBriefTool,
  getSmartInsights: getSmartInsightsTool,
  getBusinessHealth: getBusinessHealthTool,
  getProactiveNotifications: getProactiveNotificationsTool,
  listWorkflows: listWorkflowsTool,
  detectWorkflowIntent: detectWorkflowIntentTool,
  guideWorkflow: guideWorkflowTool,
  getReleaseIntelligence: getReleaseIntelligenceTool,
  getRoleFocus: getRoleFocusTool,
  listReleaseFeatures: listReleaseFeaturesTool,
};

/** @deprecated Prefer contextual handlers — kept for registerAssistantTool compatibility. */
export type { AssistantToolHandler };

export function registerAssistantTool(name: string, handler: ContextualToolHandler) {
  handlers[name] = handler;
}

export function getOpenAIToolSchemas() {
  return ASSISTANT_TOOL_DEFINITIONS.map((tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    strict: false,
  }));
}

export async function executeAssistantTool(
  name: string,
  rawArgs: unknown,
  businessContext?: AssistantBusinessContext,
) {
  const handler = handlers[name];
  if (!handler) {
    return {
      status: "error",
      tool: name,
      message: `Unknown tool: ${name}`,
    };
  }

  let args: Record<string, unknown> = {};
  if (typeof rawArgs === "string") {
    try {
      args = JSON.parse(rawArgs) as Record<string, unknown>;
    } catch {
      args = { raw: rawArgs };
    }
  } else if (rawArgs && typeof rawArgs === "object") {
    args = rawArgs as Record<string, unknown>;
  }

  if (!businessContext) {
    return {
      status: "error",
      tool: name,
      message: "Business context is required for tool execution.",
    };
  }

  return handler(args, { business: businessContext });
}

export function listAssistantToolNames() {
  return ASSISTANT_TOOL_DEFINITIONS.map((tool) => tool.name);
}
