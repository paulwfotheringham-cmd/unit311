import { NextRequest, NextResponse } from "next/server";

import {
  buildBusinessHealthScore,
  buildDailyExecutiveBrief,
  buildReleaseIntelligence,
  analysePlatformInsights,
  insightsToNotifications,
  buildBusinessContext,
  type AssistantPageSelection,
} from "@/lib/ai-operating-assistant";
import { getPlatformSession } from "@/lib/platform-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseSelection(raw: unknown): AssistantPageSelection | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;
  return {
    clientId: typeof value.clientId === "string" ? value.clientId : null,
    clientName: typeof value.clientName === "string" ? value.clientName : null,
    projectId: typeof value.projectId === "string" ? value.projectId : null,
    projectName: typeof value.projectName === "string" ? value.projectName : null,
    employeeId: typeof value.employeeId === "string" ? value.employeeId : null,
    employeeName: typeof value.employeeName === "string" ? value.employeeName : null,
  };
}

/**
 * GET/POST /api/executive-assistant/proactive
 * Deterministic proactive bundle. Insights are analysed once and shared.
 */
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  try {
    const session = await getPlatformSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    if (request.method === "POST") {
      body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    }

    const url = new URL(request.url);
    const activeView =
      (typeof body.activeView === "string" ? body.activeView : null) ||
      url.searchParams.get("view") ||
      "home";
    const roleView =
      (typeof body.roleView === "string" ? body.roleView : null) ||
      url.searchParams.get("roleView");
    const lastSeenAt =
      (typeof body.lastSeenAt === "string" ? body.lastSeenAt : null) ||
      url.searchParams.get("lastSeenAt");

    const context = await buildBusinessContext({
      session,
      activeView,
      roleView,
      selection: parseSelection(body.selection),
    });

    const include = String(body.include ?? url.searchParams.get("include") ?? "insights,health,release");

    // Daily Brief and floating notification cards are removed from the product UI.
    // Brief is only built when an authenticated caller explicitly requests include=brief (e.g. assistant tool).
    const wantBrief = include.includes("brief");
    const wantInsights = include === "all" || include.includes("insights");
    const wantHealth = include === "all" || include.includes("health");
    const wantNotifications = include.includes("notifications");
    const wantRelease = include === "all" || include.includes("release");

    const needInsights = wantBrief || wantInsights || wantNotifications || wantHealth;
    const insightPack = needInsights
      ? await analysePlatformInsights(context)
      : { insights: [], dataGaps: [] as string[] };

    const [brief, health] = await Promise.all([
      wantBrief
        ? buildDailyExecutiveBrief(context, insightPack)
        : Promise.resolve(null),
      wantHealth
        ? buildBusinessHealthScore(context, insightPack)
        : Promise.resolve(null),
    ]);

    const notifications = wantNotifications
      ? insightsToNotifications(insightPack.insights, 5)
      : [];

    const release = wantRelease ? buildReleaseIntelligence(lastSeenAt) : null;

    return NextResponse.json({
      brief,
      insights: wantInsights ? insightPack.insights : undefined,
      health,
      notifications,
      release,
      dataGaps: insightPack.dataGaps,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to build proactive bundle",
      },
      { status: 500 },
    );
  }
}
