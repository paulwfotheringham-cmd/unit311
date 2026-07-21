import type { InternalOperationsView } from "@/lib/internal-operations-data";
import { internalViewTitles } from "@/lib/internal-operations-data";

/**
 * AI Guided Learning — page metadata registry.
 * Pages expose structured UI knowledge so the Operating Assistant can teach
 * interactively (no static help pages / tutorials).
 */

export type AiUiTargetKind =
  | "kpi"
  | "button"
  | "table"
  | "chart"
  | "form"
  | "filter"
  | "nav"
  | "panel"
  | "workflow"
  | "permission";

export type AiUiTarget = {
  id: string;
  label: string;
  kind: AiUiTargetKind;
  /** Prefer data-ai-target; selector is fallback. */
  selector?: string;
  explanation: string;
  relatedActions?: string[];
};

export type AiPageGuide = {
  viewId: string;
  pageName: string;
  purpose: string;
  kpis: string[];
  buttons: string[];
  actions: string[];
  tables: string[];
  charts: string[];
  forms: string[];
  workflows: string[];
  permissions: string[];
  relationships: string[];
  commonQuestions: string[];
  targets: AiUiTarget[];
};

function baseTargets(viewId: string): AiUiTarget[] {
  return [
    {
      id: "platform-nav",
      label: "Platform navigation",
      kind: "nav",
      selector: '[data-ai-target="platform-nav"]',
      explanation:
        "Use the left sidebar to move between Unit311 modules. Your current page stays highlighted.",
      relatedActions: ["Open another module", "Return home"],
    },
    {
      id: "page-header",
      label: "Page header",
      kind: "panel",
      selector: '[data-ai-target="page-header"]',
      explanation: `You are on ${internalViewTitles[viewId as InternalOperationsView]?.title ?? viewId}. The header shows where you are in the platform.`,
    },
    {
      id: "page-main",
      label: "Main workspace",
      kind: "panel",
      selector: '[data-ai-target="page-main"]',
      explanation:
        "This is the main working area for the module — tables, KPIs, forms, and workflows live here.",
    },
    {
      id: "ai-assistant",
      label: "AI Executive Assistant",
      kind: "button",
      selector: '[data-ai-target="ai-assistant"]',
      explanation:
        "Open me anytime for guided tours, explanations, and live business questions. I already know this page.",
      relatedActions: ["Show Me Around", "Ask about this page"],
    },
  ];
}

function guide(
  viewId: InternalOperationsView | string,
  partial: Omit<AiPageGuide, "viewId" | "pageName" | "targets"> & {
    targets?: AiUiTarget[];
  },
): AiPageGuide {
  const title =
    isInternalView(viewId) && internalViewTitles[viewId]
      ? internalViewTitles[viewId].title
      : String(viewId);
  return {
    viewId,
    pageName: title,
    ...partial,
    targets: [...baseTargets(viewId), ...(partial.targets ?? [])],
  };
}

function isInternalView(viewId: string): viewId is InternalOperationsView {
  return viewId in internalViewTitles;
}

const PAGE_GUIDES: Record<string, AiPageGuide> = {
  home: guide("home", {
    purpose:
      "Command centre for executive overview — tiles for revenue, projects, pipeline, and actions.",
    kpis: ["Revenue overview", "Projects in progress", "Pipeline by region", "Action required"],
    buttons: ["Customise tiles", "Role view", "Open AI Assistant"],
    actions: ["Reorder dashboard tiles", "Drill into a module from a tile"],
    tables: ["Projects in progress", "CRM leads", "Outstanding invoices"],
    charts: ["Revenue overview", "Pipeline by region", "Support tickets trend"],
    forms: [],
    workflows: ["Scan priorities", "Open a module from a tile", "Ask AI for a briefing"],
    permissions: ["Staff may see fewer financial tiles depending on role view"],
    relationships: ["Tiles deep-link into Clients, CRM, Projects, Finance, HR, Support"],
    commonQuestions: [
      "What needs attention today?",
      "What does this KPI mean?",
      "How do I customise this dashboard?",
    ],
    targets: [
      {
        id: "home-tiles",
        label: "Dashboard tiles",
        kind: "kpi",
        selector: '[data-ai-target="home-tiles"]',
        explanation:
          "Each tile is a live snapshot. Click through to the full module when you need detail.",
      },
      {
        id: "home-customize",
        label: "Customise layout",
        kind: "button",
        selector: '[data-ai-target="home-customize"]',
        explanation: "Reorder or hide tiles so the command centre matches how you work.",
      },
    ],
  }),
  clients: guide("clients", {
    purpose: "Client directory — accounts, contacts, contract type, and account health.",
    kpis: ["Active clients", "Prospects", "Clients with active projects"],
    buttons: ["Add client", "Edit client", "Open files folder"],
    actions: ["Create client", "Update status", "Open related projects"],
    tables: ["Client list / directory table"],
    charts: [],
    forms: ["Client create/edit form"],
    workflows: ["Find a client", "Update account status", "Open client files"],
    permissions: ["All internal roles can view; sensitive finance links may be restricted"],
    relationships: ["Projects", "Files", "CRM", "Contracts (contract type on client)"],
    commonQuestions: [
      "How many active clients do we have?",
      "How do I create a client?",
      "Where do I upload a contract?",
    ],
    targets: [
      {
        id: "clients-table",
        label: "Client table",
        kind: "table",
        selector: '[data-ai-target="clients-table"]',
        explanation: "Browse and select clients here. Selecting a client personalises my answers.",
      },
      {
        id: "clients-add",
        label: "Add client",
        kind: "button",
        selector: '[data-ai-target="clients-add"]',
        explanation: "Start the create-client flow. I’ll confirm before any write actions.",
      },
      {
        id: "clients-filters",
        label: "Filters / search",
        kind: "filter",
        selector: '[data-ai-target="clients-filters"]',
        explanation: "Filter by status, region, or search to narrow the directory.",
      },
    ],
  }),
  crm: guide("crm", {
    purpose: "Pipeline and lead tracking from first touch to close.",
    kpis: ["Hot leads", "Open pipeline value", "Leads by status"],
    buttons: ["Add lead", "Update status", "Open connections"],
    actions: ["Qualify lead", "Log next action", "Mark won/lost"],
    tables: ["Leads table"],
    charts: ["Pipeline stages"],
    forms: ["Lead form"],
    workflows: ["Work the pipeline", "Set next actions", "Hand off to clients"],
    permissions: ["Available to most operators"],
    relationships: ["Clients", "Potential clients", "Messaging"],
    commonQuestions: [
      "What is in the hot pipeline?",
      "How do I update a lead?",
      "What does this status mean?",
    ],
    targets: [
      {
        id: "crm-table",
        label: "Leads table",
        kind: "table",
        selector: '[data-ai-target="crm-table"]',
        explanation: "Each row is an opportunity. Status and next action drive follow-up.",
      },
      {
        id: "crm-add",
        label: "Add lead",
        kind: "button",
        selector: '[data-ai-target="crm-add"]',
        explanation: "Capture a new opportunity into the pipeline.",
      },
    ],
  }),
  projects: guide("projects", {
    purpose: "Plan and track live and upcoming client projects.",
    kpis: ["Live projects", "Upcoming projects", "Progress %"],
    buttons: ["Create project", "Open project detail"],
    actions: ["Create project", "Track progress", "Review overdue end dates"],
    tables: ["Projects list"],
    charts: ["Progress indicators"],
    forms: ["Project create form"],
    workflows: ["Select a project", "Review delivery", "Link to client"],
    permissions: ["Available broadly; financial drill-downs may be restricted"],
    relationships: ["Clients", "Files", "Logistics", "Tasks"],
    commonQuestions: [
      "Which projects are overdue?",
      "How do I create a project?",
      "What does progress mean here?",
    ],
    targets: [
      {
        id: "projects-table",
        label: "Projects table",
        kind: "table",
        selector: '[data-ai-target="projects-table"]',
        explanation: "Select a project to focus delivery questions and follow-ups.",
      },
      {
        id: "projects-add",
        label: "Create project",
        kind: "button",
        selector: '[data-ai-target="projects-add"]',
        explanation: "Starts project creation. Writes require your confirmation.",
      },
    ],
  }),
  hr: guide("hr", {
    purpose: "Employee records, roles, and leave balances.",
    kpis: ["Headcount", "Vacation remaining", "Open roles (careers)"],
    buttons: ["Add employee", "Edit employee", "Open documents"],
    actions: ["Create employee", "Update leave balances", "Review compensation (permitted roles)"],
    tables: ["Employee directory"],
    charts: [],
    forms: ["Employee form"],
    workflows: ["Find an employee", "Check leave balance", "Open careers"],
    permissions: ["Hidden for Staff role view"],
    relationships: ["Careers", "Files", "Users"],
    commonQuestions: [
      "Who is on leave?",
      "How do I add an employee?",
      "What does vacation remaining mean?",
    ],
    targets: [
      {
        id: "hr-table",
        label: "Employee table",
        kind: "table",
        selector: '[data-ai-target="hr-table"]',
        explanation: "People records live here. Selecting an employee personalises my answers.",
      },
    ],
  }),
  financials: guide("financials", {
    purpose: "Financial overview across debtors, creditors, and expenses.",
    kpis: ["Cash / outstanding", "Overdue receivables", "Expense totals"],
    buttons: ["Open debtors", "Open creditors", "Open expenses"],
    actions: ["Review overdue invoices", "Approve expenses (where enabled)"],
    tables: ["Ledger / overview tables"],
    charts: ["Aging charts"],
    forms: [],
    workflows: ["Review overview", "Drill into AR/AP", "Ask AI for a finance summary"],
    permissions: ["Hidden for Staff role view"],
    relationships: ["Debtors", "Creditors", "Expenses", "Clients"],
    commonQuestions: [
      "Which invoices are overdue?",
      "What does this KPI mean?",
      "How do I get to expenses?",
    ],
    targets: [
      {
        id: "finance-kpis",
        label: "Finance KPIs",
        kind: "kpi",
        selector: '[data-ai-target="finance-kpis"]',
        explanation: "High-level money signals. Drill into Debtors/Creditors/Expenses for detail.",
      },
    ],
  }),
  "files-internal": guide("files-internal", {
    purpose: "Internal file repository for documents and folders.",
    kpis: [],
    buttons: ["Upload", "New folder", "Download"],
    actions: ["Upload contract", "Organise folders", "Share/download files"],
    tables: ["File browser"],
    charts: [],
    forms: ["Upload form"],
    workflows: ["Find a document", "Upload a contract", "Ask AI to summarise a file"],
    permissions: ["Internal operators"],
    relationships: ["Clients folders", "Unit311 Details", "Projects"],
    commonQuestions: [
      "Where do I upload a contract?",
      "How do I find a document?",
      "Can you summarise this file?",
    ],
    targets: [
      {
        id: "files-browser",
        label: "File browser",
        kind: "table",
        selector: '[data-ai-target="files-browser"]',
        explanation: "Browse folders and files. Select a file so I can explain or summarise it.",
      },
      {
        id: "files-upload",
        label: "Upload",
        kind: "button",
        selector: '[data-ai-target="files-upload"]',
        explanation: "Upload contracts and documents into the current folder.",
      },
    ],
  }),
  "quality-management": guide("quality-management", {
    purpose: "QMS modules for document control, CAPA, audits, and quality workflows.",
    kpis: ["Open CAPAs", "Audit readiness signals"],
    buttons: ["Open QMS module tiles"],
    actions: ["Navigate QMS areas", "Open related training"],
    tables: [],
    charts: [],
    forms: [],
    workflows: ["Open a QMS area", "Ask about ISO / quality docs in Files"],
    permissions: ["Available to operators"],
    relationships: ["QMS Training", "Files", "Unit311 Details"],
    commonQuestions: ["What is QMS here?", "Where are controlled documents?", "How do I find ISO 13485 docs?"],
    targets: [
      {
        id: "qms-modules",
        label: "QMS modules",
        kind: "panel",
        selector: '[data-ai-target="qms-modules"]',
        explanation: "Each tile opens a quality management area. Start here for controlled processes.",
      },
    ],
  }),
  "executive-assistant": guide("executive-assistant", {
    purpose: "Full-page AI Executive Assistant — conversations, tours, and live tools.",
    kpis: [],
    buttons: ["New conversation", "Show Me Around", "Settings"],
    actions: ["Ask business questions", "Start a page tour", "Generate reports"],
    tables: ["Recent conversations"],
    charts: [],
    forms: ["Chat composer"],
    workflows: ["Ask → tool call → answer → follow-up actions"],
    permissions: ["Uses your role permissions for finance/HR tools"],
    relationships: ["Every module via tools and guided learning"],
    commonQuestions: [
      "Show me around this page",
      "How do I create a project?",
      "Summarise CRM",
    ],
    targets: [
      {
        id: "ea-chat",
        label: "Conversation",
        kind: "form",
        selector: '[data-ai-target="ea-chat"]',
        explanation: "Ask anything about the platform. I use live tools — I don’t invent business data.",
      },
      {
        id: "ea-tour",
        label: "Show Me Around",
        kind: "button",
        selector: '[data-ai-target="ea-tour"]',
        explanation: "Starts an interactive walkthrough of the current page’s UI.",
      },
    ],
  }),
};

/** Fallback guide for views without a specialised entry. */
export function getPageGuide(viewId: string | null | undefined): AiPageGuide {
  const id = viewId?.trim() || "home";
  if (PAGE_GUIDES[id]) return PAGE_GUIDES[id];

  const title =
    isInternalView(id) && internalViewTitles[id]
      ? internalViewTitles[id].title
      : id;

  return guide(id, {
    purpose: `${title} workspace in Unit311 Central.`,
    kpis: [],
    buttons: ["Module actions in the main panel"],
    actions: ["Use module controls", "Ask the AI about this page"],
    tables: ["Module tables when present"],
    charts: ["Module charts when present"],
    forms: ["Module forms when present"],
    workflows: ["Work in the main panel", "Ask AI for a guided tour"],
    permissions: ["Subject to your role view"],
    relationships: ["Related modules via sidebar navigation"],
    commonQuestions: [
      "What is this page for?",
      "Show me around",
      "What should I do here?",
    ],
  });
}

export function listRegisteredPageGuides(): AiPageGuide[] {
  return Object.values(PAGE_GUIDES);
}

export function findPageTarget(viewId: string, targetId: string): AiUiTarget | null {
  const guide = getPageGuide(viewId);
  return guide.targets.find((target) => target.id === targetId) ?? null;
}

export function buildTourSteps(viewId: string) {
  const page = getPageGuide(viewId);
  return page.targets.map((target, index) => ({
    index,
    targetId: target.id,
    label: target.label,
    kind: target.kind,
    explanation: target.explanation,
    relatedActions: target.relatedActions ?? [],
  }));
}
