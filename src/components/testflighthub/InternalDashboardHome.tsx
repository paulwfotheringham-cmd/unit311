"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  BusinessHealthScore,
  DailyExecutiveBrief,
  ExecutiveInsight,
} from "@/lib/ai-operating-assistant/executive-types";
import { formatConfidence } from "@/lib/ai-operating-assistant/explainability";
import {
  handleExecutiveActionHref,
  markDailyBriefSeen,
  startWorkflowGuide,
} from "@/lib/ai-operating-assistant/proactive-client";
import {
  enterpriseButtonClassName,
  enterpriseCardClassName,
  enterpriseTokens,
} from "@/lib/enterprise-ui";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Activity,
  AlertTriangle,
  CircleDollarSign,
  FolderKanban,
  Sparkles,
  Users,
} from "lucide-react";

const ACCENT = enterpriseTokens.accent;
const GAP = enterpriseTokens.space.gap;

type ProactivePayload = {
  brief?: DailyExecutiveBrief | null;
  health?: BusinessHealthScore | null;
  insights?: ExecutiveInsight[];
};

type AttentionItem = {
  id: string;
  title: string;
  summary: string;
  href?: string;
};

type ProjectRiskItem = {
  id: string;
  title: string;
  summary: string;
  href: string;
};

function Panel({
  size,
  className,
  children,
  span,
}: {
  size: "small" | "medium" | "large";
  className?: string;
  children: React.ReactNode;
  span?: string;
}) {
  return (
    <section
      className={cn(
        enterpriseCardClassName({
          size: size === "small" ? "small" : size === "large" ? "large" : "medium",
        }),
        "flex min-h-0 flex-col overflow-hidden",
        size === "small" && "h-[4.75rem] min-h-0 justify-center",
        span,
        className,
      )}
    >
      {children}
    </section>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return <p className={enterpriseTokens.type.metadata}>{children}</p>;
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 className={cn(enterpriseTokens.type.cardHeading, "mt-0.5 tracking-tight")}>{children}</h2>;
}

function Unavailable({ children = "Data unavailable" }: { children?: string }) {
  return <p className="text-sm text-white/45">{children}</p>;
}

/**
 * Executive Command Centre — home dashboard only.
 * Metrics come from `/api/executive-assistant/proactive` (live analysis).
 * Placeholder/demo command-centre snapshots are never shown as live KPIs.
 */
export default function InternalDashboardHome(_props?: { showCustomize?: boolean }) {
  const [brief, setBrief] = useState<DailyExecutiveBrief | null>(null);
  const [health, setHealth] = useState<BusinessHealthScore | null>(null);
  const [insights, setInsights] = useState<ExecutiveInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [proactiveFailed, setProactiveFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setProactiveFailed(false);
    try {
      const response = await fetch("/api/executive-assistant/proactive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeView: "home",
          roleView: null,
          include: "brief,health,insights",
        }),
        cache: "no-store",
      });
      if (!response.ok) {
        setProactiveFailed(true);
        return;
      }
      const data = (await response.json()) as ProactivePayload;
      if (data.brief) {
        setBrief(data.brief);
        markDailyBriefSeen();
      } else {
        setBrief(null);
      }
      setHealth(data.health ?? null);
      setInsights(Array.isArray(data.insights) ? data.insights : []);
    } catch {
      setProactiveFailed(true);
      setBrief(null);
      setHealth(null);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const attention = useMemo<AttentionItem[]>(() => {
    return insights
      .filter((entry) => entry.severity === "critical" || entry.severity === "high")
      .slice(0, 4)
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        summary: entry.summary,
        href:
          entry.explanation?.drillDown?.href ??
          entry.recommendedActions.find((action) => action.href)?.href,
      }));
  }, [insights]);

  const projectRisks = useMemo<ProjectRiskItem[]>(() => {
    return insights
      .filter((entry) => entry.category === "projects")
      .slice(0, 4)
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        summary: entry.summary,
        href:
          entry.explanation?.drillDown?.href ??
          entry.recommendedActions.find((action) => action.href)?.href ??
          "/internaldashboard?view=projects",
      }));
  }, [insights]);

  const financeInsight = useMemo(
    () => insights.find((entry) => entry.category === "finance") ?? null,
    [insights],
  );

  const liveProjectCount = useMemo(() => {
    // Prefer explicit live-project signals from insights; do not invent a count.
    const delivery = insights.filter((entry) => entry.category === "projects");
    if (delivery.length === 0) return null;
    return delivery.length;
  }, [insights]);

  const activeClientInsightCount = useMemo(() => {
    const clients = insights.filter(
      (entry) => entry.category === "clients" || entry.category === "contracts",
    );
    if (clients.length === 0) return null;
    return clients.length;
  }, [insights]);

  const kpis = [
    {
      id: "revenue",
      label: "Revenue (month)",
      value: financeInsight ? financeInsight.title : loading ? "…" : "Data unavailable",
      hint: financeInsight
        ? "From live finance signals"
        : loading
          ? "Loading"
          : "No live finance metric",
      icon: <CircleDollarSign className="h-3.5 w-3.5" />,
      live: Boolean(financeInsight),
    },
    {
      id: "health",
      label: "Business health",
      value: health ? `${health.overall}` : loading ? "…" : "Data unavailable",
      hint: health
        ? `${formatConfidence(health.confidence)} confidence`
        : loading
          ? "Loading"
          : "No live score",
      icon: <Activity className="h-3.5 w-3.5" />,
      live: Boolean(health),
    },
    {
      id: "projects",
      label: "Project risks",
      value:
        liveProjectCount != null
          ? String(liveProjectCount)
          : loading
            ? "…"
            : "Data unavailable",
      hint: liveProjectCount != null ? "Live insight signals" : loading ? "Loading" : "No live count",
      icon: <FolderKanban className="h-3.5 w-3.5" />,
      live: liveProjectCount != null,
    },
    {
      id: "clients",
      label: "Client signals",
      value:
        activeClientInsightCount != null
          ? String(activeClientInsightCount)
          : loading
            ? "…"
            : "Data unavailable",
      hint:
        activeClientInsightCount != null
          ? "Live insight signals"
          : loading
            ? "Loading"
            : "No live count",
      icon: <Users className="h-3.5 w-3.5" />,
      live: activeClientInsightCount != null,
    },
  ];

  const priorities = brief?.priorities?.slice(0, 4) ?? [];
  const healthDimensions = (health?.dimensions ?? [])
    .filter((dimension) => dimension.score > 0)
    .slice(0, 6);

  return (
    <div
      data-ai-target="home-tiles"
      aria-label="Executive command centre"
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden",
        GAP,
        "px-0.5 pb-0.5 pt-0 sm:px-1",
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", ACCENT.text)}>
            Unit311 Central
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-white/70">
            {brief?.headline ??
              (loading
                ? "Preparing today’s operating picture…"
                : proactiveFailed
                  ? "AI services unavailable — live metrics paused"
                  : "How the business is performing")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/internaldashboard?view=executive-assistant"
            className={cn(enterpriseButtonClassName("primary"), "h-9")}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask AI
          </Link>
        </div>
      </header>

      <div className={cn("grid shrink-0 grid-cols-12", GAP)}>
        {kpis.map((kpi) => (
          <Panel key={kpi.id} size="small" span="col-span-6 sm:col-span-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
                  {kpi.label}
                </p>
                <p
                  className={cn(
                    "mt-1 truncate text-xl font-semibold tracking-tight tabular-nums",
                    kpi.live ? "text-white" : "text-white/45",
                  )}
                >
                  {kpi.value}
                  {kpi.id === "health" && health ? (
                    <span className="ml-1 text-sm font-medium text-white/40">/100</span>
                  ) : null}
                </p>
              </div>
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/50">
                {kpi.icon}
              </span>
            </div>
            <p className={cn("mt-0.5 truncate text-[11px]", kpi.live ? ACCENT.text : "text-white/35")}>
              {kpi.hint}
            </p>
          </Panel>
        ))}
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-12",
          GAP,
          "grid-rows-[minmax(0,1.4fr)_minmax(0,1fr)]",
        )}
      >
        <Panel size="large" span="col-span-12 row-start-1 lg:col-span-7" className="relative">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <PanelLabel>AI Executive Brief</PanelLabel>
              <PanelTitle>{brief?.greeting ?? "Today’s briefing"}</PanelTitle>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold",
                brief
                  ? cn(ACCENT.border, ACCENT.bg, ACCENT.textSoft)
                  : "border-white/10 bg-white/[0.03] text-white/45",
              )}
            >
              <Sparkles className="h-3 w-3" />
              {brief ? "Live" : loading ? "Loading" : "Unavailable"}
            </span>
          </div>

          <p className="mt-3 shrink-0 text-sm leading-relaxed text-white/65">
            {brief?.headline ??
              (loading
                ? "Loading live briefing…"
                : "Data unavailable — briefing requires the proactive AI service.")}
          </p>

          <div className="mt-4 min-h-0 flex-1 overflow-hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Needs your attention
            </p>
            {priorities.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {priorities.map((priority) => (
                  <li
                    key={priority}
                    className="flex items-start gap-2 text-sm leading-snug text-white/85"
                  >
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", ACCENT.fill)} />
                    <span className="line-clamp-2">{priority}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2">
                <Unavailable />
              </div>
            )}
          </div>

          <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            {(brief?.recommendedWorkflows ?? []).slice(0, 2).map((workflowId) => (
              <button
                key={workflowId}
                type="button"
                onClick={() => startWorkflowGuide(workflowId, 0)}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
              >
                {workflowId.replace(/_/g, " ")}
              </button>
            ))}
            <Link
              href="/internaldashboard?view=executive-assistant"
              className={cn(
                "ml-auto inline-flex items-center gap-1 text-[11px] font-semibold",
                ACCENT.textSoft,
              )}
            >
              Discuss with AI
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Panel>

        <Panel size="large" span="col-span-12 row-start-1 lg:col-span-5">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <PanelLabel>Business Health</PanelLabel>
              <PanelTitle>Operating score</PanelTitle>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "text-3xl font-semibold tracking-tight tabular-nums",
                  health ? "text-white" : "text-white/45",
                )}
              >
                {health?.overall ?? (loading ? "…" : "Data unavailable")}
              </p>
              <p className="text-[10px] text-white/40">
                {health
                  ? `${formatConfidence(health.confidence)} conf.`
                  : loading
                    ? "Loading"
                    : "No live score"}
              </p>
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-2.5 overflow-hidden">
            {healthDimensions.length > 0 ? (
              healthDimensions.map((dimension) => (
                <div key={dimension.id} className="min-w-0">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-white/60">{dimension.label}</span>
                    <span className="tabular-nums text-white/80">{dimension.score}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn("h-full rounded-full", ACCENT.fill)}
                      style={{ width: `${Math.min(100, Math.max(0, dimension.score))}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <Unavailable>
                {loading ? "Scoring live signals…" : "Data unavailable"}
              </Unavailable>
            )}
          </div>

          {health?.risks?.[0] ? (
            <p className="mt-3 line-clamp-2 shrink-0 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-white/55">
              <span className="font-medium text-white/70">Top risk · </span>
              {health.risks[0]}
            </p>
          ) : null}
        </Panel>

        <Panel size="medium" span="col-span-12 row-start-2 md:col-span-4">
          <div className="flex shrink-0 items-center gap-2">
            <AlertTriangle className={cn("h-3.5 w-3.5", ACCENT.text)} />
            <div>
              <PanelLabel>Priorities</PanelLabel>
              <PanelTitle>Needs attention</PanelTitle>
            </div>
          </div>
          {attention.length > 0 ? (
            <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-hidden">
              {attention.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => item.href && handleExecutiveActionHref(item.href)}
                    className="w-full rounded-lg border border-transparent px-1 py-1 text-left transition-colors hover:border-white/10 hover:bg-white/[0.03]"
                  >
                    <p className="line-clamp-1 text-[13px] font-medium text-white/90">{item.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-white/45">{item.summary}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <Unavailable />
            </div>
          )}
        </Panel>

        <Panel size="medium" span="col-span-12 row-start-2 md:col-span-4">
          <div>
            <PanelLabel>Delivery</PanelLabel>
            <PanelTitle>Projects at risk</PanelTitle>
          </div>
          {projectRisks.length > 0 ? (
            <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-hidden">
              {projectRisks.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleExecutiveActionHref(item.href)}
                    className="w-full rounded-lg px-1 py-1 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <p className="line-clamp-1 text-[13px] font-medium text-white/90">{item.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-white/45">{item.summary}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <Unavailable />
            </div>
          )}
          <Link
            href="/internaldashboard?view=projects"
            className={cn(
              "mt-2 inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold",
              ACCENT.textSoft,
            )}
          >
            Open projects
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Panel>

        <Panel size="medium" span="col-span-12 row-start-2 md:col-span-4">
          <div>
            <PanelLabel>Commercial</PanelLabel>
            <PanelTitle>Financial pulse</PanelTitle>
          </div>
          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-hidden">
            {financeInsight || health?.strengths?.[0] ? (
              <>
                {financeInsight ? (
                  <div>
                    <p className="text-[11px] text-white/45">Live finance signal</p>
                    <p className="mt-0.5 text-sm font-semibold text-white">{financeInsight.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/50">
                      {financeInsight.summary}
                    </p>
                  </div>
                ) : null}
                {health?.strengths?.[0] ? (
                  <div className={cn(financeInsight && "border-t border-white/10 pt-3")}>
                    <p className="text-[11px] text-white/45">Health strength</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-white/70">
                      {health.strengths[0]}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <Unavailable>
                {loading
                  ? "Loading commercial signals…"
                  : "Data unavailable — no live finance metrics connected"}
              </Unavailable>
            )}
          </div>
          <Link
            href="/internaldashboard?view=financials"
            className={cn(
              "mt-2 inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold",
              ACCENT.textSoft,
            )}
          >
            Open finance
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Panel>
      </div>
    </div>
  );
}
