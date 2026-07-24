import { asNumber, asString, toolError, toolOk } from "./tool-result";
import type { AssistantToolExecutionContext } from "./tool-result";
import { buildDailyExecutiveBrief } from "./daily-brief-service";
import { analysePlatformInsights, insightsToNotifications } from "./insight-service";
import { buildBusinessHealthScore } from "./business-health-service";
import {
  buildBusinessSnapshot,
  type BusinessSnapshotDomain,
} from "./business-snapshot-service";
import {
  allWorkflowSummaries,
  buildWorkflowGuideSession,
  listIntentExamples,
  matchWorkflowIntent,
  searchWorkflows,
} from "./intent-service";
import { getWorkflow } from "./workflow-registry";
import {
  buildReleaseIntelligence,
  listReleaseFeatures,
} from "./release-intelligence";
import {
  getRoleFocusProfile,
  resolveExecutivePersona,
} from "./role-awareness";
import { buildHighlightAction, buildStartTourAction } from "./guided-learning";

/**
 * Proactive Executive tools — registered alongside existing search/guide tools.
 */

function resolveSnapshotDomain(raw: string | null): BusinessSnapshotDomain {
  const value = (raw || "all").toLowerCase();
  if (
    value === "overview" ||
    value === "clients" ||
    value === "projects" ||
    value === "finance" ||
    value === "hr" ||
    value === "crm" ||
    value === "assets" ||
    value === "all"
  ) {
    return value;
  }
  // Physical Assets / fleet / inventory BEFORE finance “balance” / generic matches.
  if (
    /\b(assets?\s+section|physical\s+assets?|asset\s+register|fleet|drones?|equipment\s+register|look\s+in\s+(the\s+)?assets?)\b/.test(
      value,
    ) ||
    (/\bassets?\b/.test(value) &&
      !/\b(cash|bank|wise|financial|finance|balance sheet)\b/.test(value))
  ) {
    return "assets";
  }
  if (
    /finance|financial|cash|bank|wise|treasury|balance|revenue|invoice|expense|p\s*&?\s*l|profit|burn|debtor|creditor/.test(
      value,
    )
  ) {
    return "finance";
  }
  if (/client|customer/.test(value)) return "clients";
  if (/project|delivery|portfolio/.test(value)) return "projects";
  if (/hr|employee|staff|people|leave/.test(value)) return "hr";
  if (/crm|lead|pipeline|sales/.test(value)) return "crm";
  if (/inventory|logistics|shipment/.test(value)) return "assets";
  if (/health|brief|overview|business|company|status/.test(value)) return "overview";
  return "all";
}

/**
 * Open-ended business Q&A — load live platform data for any executive question.
 */
export async function queryBusinessTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  try {
    const question = asString(args.question) || "";
    const domainArg = asString(args.domain);
    const topic = asString(args.topic);
    const fromQuestion = resolveSnapshotDomain(question);
    const fromArgs = resolveSnapshotDomain(domainArg || topic || null);
    // Prefer a specific domain inferred from the user question over a generic all/overview arg.
    const domain =
      fromQuestion !== "all" && fromQuestion !== "overview"
        ? fromQuestion
        : fromArgs;

    const snapshot = await buildBusinessSnapshot(ctx.business, domain);
    return toolOk("queryBusiness", [snapshot], {
      source: ["live-platform", "assistant:business-snapshot"],
      page: 1,
      pageSize: 1,
      summary: {
        domain,
        question: question || null,
        activeClients: snapshot.overview.activeClients ?? null,
        liveProjects: snapshot.overview.liveProjects ?? null,
        headcount: snapshot.overview.headcount ?? null,
        cashPosition: snapshot.overview.cashPosition ?? null,
        reportingCurrency: snapshot.overview.reportingCurrency ?? null,
        wiseBalances: snapshot.overview.wiseBalances ?? null,
        physicalAssetCount:
          snapshot.overview.physicalAssetCount ??
          snapshot.assets?.total ??
          null,
        message: question
          ? `Live snapshot for: ${question}`
          : "Live business snapshot ready.",
      },
      dataGaps: snapshot.dataGaps,
      followUpActions: [
        {
          id: "fu_daily_brief",
          label: "What requires my attention today?",
          kind: "generate",
        },
        {
          id: "fu_cash",
          label: "How much cash do we have?",
          kind: "generate",
        },
        {
          id: "fu_risks",
          label: "What are the biggest risks?",
          kind: "generate",
        },
      ],
      appliedContext: { activeView: ctx.business.page.activeView },
    });
  } catch (error) {
    return toolError(
      "queryBusiness",
      error instanceof Error ? error.message : "Failed to load business snapshot",
      ["live-platform"],
    );
  }
}

export async function getDailyBriefTool(
  _args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const brief = await buildDailyExecutiveBrief(ctx.business);
  return toolOk("getDailyBrief", [brief], {
    source: ["ai:daily-brief", "live-platform"],
    page: 1,
    pageSize: 1,
    summary: {
      headline: brief.headline,
      priorityCount: brief.priorities.length,
      insightCount: brief.insights.length,
    },
    dataGaps: brief.dataGaps,
    followUpActions: brief.followUpActions,
    explanation: brief.insights[0]?.explanation,
    appliedContext: { activeView: ctx.business.page.activeView },
  });
}

export async function getSmartInsightsTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const { insights, dataGaps } = await analysePlatformInsights(ctx.business);
  const limit = asNumber(args.limit, 12);
  const category = asString(args.category);
  const filtered = category
    ? insights.filter((entry) => entry.category === category)
    : insights;

  const insightFollowUps = filtered
    .slice(0, 3)
    .flatMap((entry) => entry.recommendedActions.slice(0, 1));
  return toolOk("getSmartInsights", filtered.slice(0, limit), {
    source: ["ai:smart-insights", "live-platform"],
    page: 1,
    pageSize: limit,
    summary: {
      total: filtered.length,
      critical: filtered.filter((entry) => entry.severity === "critical").length,
      high: filtered.filter((entry) => entry.severity === "high").length,
      message:
        filtered.length === 0
          ? "No elevated risks in the current analysis pass."
          : `Found ${filtered.length} operating insight${filtered.length === 1 ? "" : "s"}.`,
    },
    dataGaps,
    followUpActions:
      insightFollowUps.length > 0
        ? insightFollowUps
        : [
            {
              id: "fu_attention",
              label: "What requires my attention today?",
              kind: "generate",
            },
            {
              id: "fu_delegate",
              label: "What should I delegate?",
              kind: "generate",
            },
          ],
    explanation: filtered[0]?.explanation,
    appliedContext: { activeView: ctx.business.page.activeView },
  });
}

export async function getBusinessHealthTool(
  _args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const health = await buildBusinessHealthScore(ctx.business);
  return toolOk("getBusinessHealth", [health], {
    source: ["ai:business-health", "live-platform"],
    page: 1,
    pageSize: 1,
    summary: {
      overall: health.overall,
      confidence: health.confidence,
      riskCount: health.risks.length,
    },
    dataGaps: health.dataGaps,
    followUpActions: health.recommendedActions,
    explanation: health.explanation,
    appliedContext: { activeView: ctx.business.page.activeView },
  });
}

export async function getProactiveNotificationsTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const { insights } = await analysePlatformInsights(ctx.business);
  const notifications = insightsToNotifications(insights, asNumber(args.limit, 5));
  return toolOk("getProactiveNotifications", notifications, {
    source: ["ai:proactive-notifications"],
    page: 1,
    pageSize: notifications.length || 5,
    summary: { count: notifications.length },
    followUpActions: notifications
      .filter((entry) => entry.href)
      .slice(0, 3)
      .map((entry) => ({
        id: entry.id,
        label: entry.title,
        kind: "navigate" as const,
        href: entry.href,
      })),
    appliedContext: { activeView: ctx.business.page.activeView },
  });
}

export async function listWorkflowsTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const query = asString(args.query) ?? "";
  const workflows = query
    ? searchWorkflows(query, ctx.business)
    : searchWorkflows("", ctx.business);

  return toolOk(
    "listWorkflows",
    workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      purpose: workflow.purpose,
      businessOutcome: workflow.businessOutcome,
      estimatedDurationMinutes: workflow.estimatedDurationMinutes,
      relatedModules: workflow.relatedModules,
      steps: workflow.steps.map((step) => step.title),
    })),
    {
      source: ["ai:workflow-registry"],
      page: 1,
      pageSize: workflows.length || 10,
      summary: {
        count: workflows.length,
        intentExamples: listIntentExamples(ctx.business),
        catalogue: allWorkflowSummaries().length,
      },
      followUpActions: workflows.slice(0, 3).map((workflow) => ({
        id: `start_${workflow.id}`,
        label: `Start · ${workflow.name}`,
        kind: "navigate" as const,
        href: `workflow://start?id=${encodeURIComponent(workflow.id)}`,
      })),
      appliedContext: { activeView: ctx.business.page.activeView },
    },
  );
}

export async function detectWorkflowIntentTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const message =
    asString(args.message) || asString(args.query) || asString(args.intent) || "";
  if (!message) {
    return toolError("detectWorkflowIntent", "message is required");
  }

  const matched = matchWorkflowIntent(message, ctx.business);
  if (!matched) {
    return toolOk("detectWorkflowIntent", [], {
      source: ["ai:intent-detection"],
      page: 1,
      pageSize: 0,
      summary: {
        matched: false,
        hint: "No workflow matched. Suggest listWorkflows or ask clarifying outcome.",
        examples: listIntentExamples(ctx.business),
      },
    });
  }

  const session = buildWorkflowGuideSession(matched.id, 0);
  return toolOk("detectWorkflowIntent", [{ workflow: matched, session }], {
    source: ["ai:intent-detection", "ai:workflow-registry"],
    page: 1,
    pageSize: 1,
    summary: {
      matched: true,
      workflowId: matched.id,
      workflowName: matched.name,
      clientAction: session?.clientAction,
      instruction:
        "Guide the user step-by-step. Dispatch clientAction (navigate/highlight) — do not only answer with text.",
    },
    followUpActions: [
      {
        id: "start_workflow",
        label: `Guide me · ${matched.name}`,
        kind: "navigate",
        href: `workflow://start?id=${encodeURIComponent(matched.id)}`,
      },
      {
        id: "next_step",
        label: "Next step",
        kind: "navigate",
        href: `workflow://next?id=${encodeURIComponent(matched.id)}&step=1`,
      },
    ],
    appliedContext: { activeView: matched.steps[0]?.viewId ?? ctx.business.page.activeView },
  });
}

export async function guideWorkflowTool(
  args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const workflowId = asString(args.workflowId) || asString(args.id);
  if (!workflowId) {
    return toolError("guideWorkflow", "workflowId is required");
  }

  const workflow = getWorkflow(workflowId);
  if (!workflow) {
    return toolError("guideWorkflow", `Unknown workflow “${workflowId}”`);
  }

  const stepIndex = asNumber(args.stepIndex, 0);
  const session = buildWorkflowGuideSession(workflowId, stepIndex);
  if (!session) {
    return toolError("guideWorkflow", "Could not build workflow session");
  }

  const step = session.steps[session.stepIndex];
  let guidedClientAction = null as ReturnType<typeof buildHighlightAction> | ReturnType<typeof buildStartTourAction> | null;

  if (step?.targetId && step.viewId) {
    guidedClientAction = buildHighlightAction(step.viewId, step.targetId);
    if (guidedClientAction && step.instruction) {
      guidedClientAction.explanation = step.instruction;
    }
  } else if (step?.viewId) {
    guidedClientAction = buildStartTourAction(step.viewId);
  }

  return toolOk("guideWorkflow", [session], {
    source: ["ai:workflow-registry", "ai:guided-learning"],
    page: 1,
    pageSize: 1,
    summary: {
      workflowId: workflow.id,
      name: workflow.name,
      stepIndex: session.stepIndex,
      stepTitle: step?.title,
      instruction: step?.instruction,
      clientAction: session.clientAction,
      guidedClientAction,
      navigateHref: step?.href ?? (step?.viewId ? `/internaldashboard?view=${step.viewId}` : null),
    },
    followUpActions: [
      ...(session.stepIndex < session.steps.length - 1
        ? [
            {
              id: "next_step",
              label: "Next workflow step",
              kind: "navigate" as const,
              href: `workflow://next?id=${encodeURIComponent(workflow.id)}&step=${session.stepIndex + 1}`,
            },
          ]
        : [
            {
              id: "done",
              label: "Workflow complete",
              kind: "generate" as const,
            },
          ]),
      {
        id: "restart",
        label: "Restart workflow",
        kind: "navigate",
        href: `workflow://start?id=${encodeURIComponent(workflow.id)}`,
      },
    ],
    appliedContext: {
      activeView: step?.viewId ?? ctx.business.page.activeView,
    },
  });
}

export async function getReleaseIntelligenceTool(
  args: Record<string, unknown>,
  _ctx: AssistantToolExecutionContext,
) {
  const lastSeen = asString(args.lastSeenAt) ?? null;
  const intel = buildReleaseIntelligence(lastSeen);
  return toolOk("getReleaseIntelligence", [intel], {
    source: ["ai:release-intelligence"],
    page: 1,
    pageSize: 1,
    summary: {
      unseenCount: intel.unseenFeatures.length,
      offerTour: intel.offerTour,
      message: intel.message,
      clientAction: intel.offerTour
        ? buildStartTourAction(intel.tourViewId ?? "home")
        : null,
    },
    followUpActions: intel.offerTour
      ? [
          {
            id: "release_tour",
            label: "Start 90-second tour",
            kind: "navigate",
            href: `guided://start_tour?view=${encodeURIComponent(intel.tourViewId ?? "home")}`,
          },
        ]
      : [],
  });
}

export async function getRoleFocusTool(
  _args: Record<string, unknown>,
  ctx: AssistantToolExecutionContext,
) {
  const persona = resolveExecutivePersona(
    ctx.business.permissions.roleView,
    ctx.business.user.displayName,
  );
  const profile = getRoleFocusProfile(persona);
  return toolOk("getRoleFocus", [profile], {
    source: ["ai:role-awareness"],
    page: 1,
    pageSize: 1,
    summary: profile,
  });
}

export async function listReleaseFeaturesTool(
  _args: Record<string, unknown>,
  _ctx: AssistantToolExecutionContext,
) {
  const features = listReleaseFeatures();
  return toolOk("listReleaseFeatures", features, {
    source: ["ai:release-intelligence"],
    page: 1,
    pageSize: features.length,
    summary: { count: features.length },
  });
}
