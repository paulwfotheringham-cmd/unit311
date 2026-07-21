"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import {
  HR_DEVELOPMENT_KIND_LABELS,
  HR_GOAL_SCOPE_LABELS,
  HR_GOAL_SCOPES,
  HR_PERFORMANCE_HUB_TABS,
  HR_REVIEW_STATUS_LABELS,
  HR_REVIEW_TYPE_LABELS,
  collectGoalsFromReviews,
  computePerformanceHubKpis,
  downloadPerformanceTextFile,
  employeeInitials,
  goalStatusClass,
  goalStatusLabel,
  reviewStatusClass,
  type HrGoalScope,
  type HrPerformanceHubTab,
  type HrPerformanceObjective,
  type HrPerformanceReview,
} from "@/lib/hr-performance-data";
import {
  archivePerformanceGoal,
  markPerformanceGoalComplete,
  savePerformanceGoal,
} from "@/lib/hr-mock-store";
import { getInternalNavHref } from "@/lib/internal-operations-data";
import { useInternalOperationsBasePath } from "./InternalOperationsBasePathContext";
import PerformanceReviewSlideOver from "./PerformanceReviewSlideOver";
import { useHrMockStore } from "./useHrMockStore";
import {
  HrFieldLabel,
  HrKpiTile,
  hrInputClass,
  hrPrimaryButtonClass,
  hrSecondaryButtonClass,
  HrSection,
  HrStatusPill,
} from "./hr-ui";

function priorityRank(priority: HrPerformanceReview["priority"]) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function PerformanceHubWorkspace() {
  const basePath = useInternalOperationsBasePath();
  const store = useHrMockStore();
  const [tab, setTab] = useState<HrPerformanceHubTab>("Overview");
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [goalDraftOpen, setGoalDraftOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: "",
    description: "",
    scope: "employee" as HrGoalScope,
    department: "Operations",
    owner: "",
    weight: 10,
    dueDate: todayIso(),
    progressPercent: 0,
  });

  const standaloneGoals = store.goals ?? [];
  const kpis = useMemo(
    () => computePerformanceHubKpis(store.reviews, standaloneGoals),
    [store.reviews, standaloneGoals],
  );

  const allGoals = useMemo(() => {
    const fromReviews = collectGoalsFromReviews(store.reviews);
    return [...standaloneGoals, ...fromReviews].filter((goal) => !goal.archived);
  }, [standaloneGoals, store.reviews]);

  const queue = useMemo(
    () =>
      [...store.reviews]
        .filter((review) => review.status !== "completed")
        .sort((a, b) => {
          const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
          if (byPriority !== 0) return byPriority;
          return (a.dueDate ?? a.nextReviewDate ?? "").localeCompare(
            b.dueDate ?? b.nextReviewDate ?? "",
          );
        }),
    [store.reviews],
  );

  const activeReview =
    store.reviews.find((review) => review.id === activeReviewId) ?? null;

  const insights = useMemo(() => {
    const highest = store.reviews
      .filter((review) => (review.overallRating ?? 0) >= 4)
      .sort((a, b) => (b.overallRating ?? 0) - (a.overallRating ?? 0))
      .slice(0, 4);
    const coaching = store.reviews.filter(
      (review) =>
        review.managerRecommendation === "develop" ||
        review.managerRecommendation === "performance_plan" ||
        review.objectives.some((objective) => objective.status === "at_risk"),
    );
    const completed = store.reviews
      .filter((review) => review.status === "completed")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 4);
    const promotion = store.reviews.filter(
      (review) =>
        review.promotionRecommendation === "yes" || review.promotionReady === "now",
    );
    const succession = store.reviews.filter((review) => review.successionCandidate);
    const achievements = store.reviews
      .filter((review) => (review.achievements ?? "").trim().length > 0)
      .slice(0, 4);
    const training = store.reviews.filter(
      (review) => review.trainingRecommendations.trim().length > 0,
    );
    return {
      highest,
      coaching,
      completed,
      promotion,
      succession,
      achievements,
      training,
    };
  }, [store.reviews]);

  const developmentItems = useMemo(
    () =>
      store.reviews.flatMap((review) =>
        review.developmentPlan.map((item) => ({
          ...item,
          employeeName: review.employeeName,
          department: review.department,
          reviewId: review.id,
        })),
      ),
    [store.reviews],
  );

  const competencyAverage = useMemo(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    for (const review of store.reviews) {
      for (const competency of review.competencies) {
        const current = totals.get(competency.name) ?? { sum: 0, count: 0 };
        current.sum += competency.score;
        current.count += 1;
        totals.set(competency.name, current);
      }
    }
    return [...totals.entries()].map(([name, value]) => ({
      competency: name,
      score: Math.round((value.sum / value.count) * 10) / 10,
    }));
  }, [store.reviews]);

  function openReview(reviewId: string) {
    setActiveReviewId(reviewId);
  }

  function startReviewFromQueue(review: HrPerformanceReview) {
    openReview(review.id);
  }

  function exportReport(
    kind:
      | "annual"
      | "promotion"
      | "calibration"
      | "training"
      | "distribution"
      | "department",
    format: "pdf" | "excel",
  ) {
    const lines =
      kind === "distribution"
        ? [
            "Performance Distribution",
            "",
            "Rating,Count",
            ...[1, 2, 3, 4, 5].map((rating) => {
              const count = store.reviews.filter(
                (review) => review.overallRating === rating,
              ).length;
              return `${rating},${count}`;
            }),
          ]
        : kind === "promotion"
          ? [
              "Promotion Report",
              "",
              "Employee,Department,Manager,Ready,Potential,Succession",
              ...insights.promotion.map(
                (review) =>
                  `${review.employeeName},${review.department},${review.managerName},${review.promotionReady ?? "—"},${review.careerPotential ?? "—"},${review.successionCandidate ? "Yes" : "No"}`,
              ),
            ]
          : kind === "training"
            ? [
                "Training Needs",
                "",
                "Employee,Department,Recommendation",
                ...insights.training.map(
                  (review) =>
                    `${review.employeeName},${review.department},"${review.trainingRecommendations.replace(/"/g, "'")}"`,
                ),
              ]
            : kind === "calibration"
              ? [
                  "Calibration Report",
                  "",
                  "Employee,Department,Rating,Manager recommendation",
                  ...store.reviews.map(
                    (review) =>
                      `${review.employeeName},${review.department},${review.overallRating ?? "—"},${review.managerRecommendation ?? "—"}`,
                  ),
                ]
              : kind === "department"
                ? [
                    "Department Performance",
                    "",
                    "Department,Reviews,Avg rating,Behind goals",
                    ...[...new Set(store.reviews.map((review) => review.department))].map(
                      (department) => {
                        const rows = store.reviews.filter(
                          (review) => review.department === department,
                        );
                        const rated = rows.filter((review) => review.overallRating != null);
                        const avg =
                          rated.length === 0
                            ? "—"
                            : (
                                rated.reduce(
                                  (sum, review) => sum + (review.overallRating ?? 0),
                                  0,
                                ) / rated.length
                              ).toFixed(1);
                        const behind = allGoals.filter(
                          (goal) =>
                            goal.department === department && goal.status === "at_risk",
                        ).length;
                        return `${department},${rows.length},${avg},${behind}`;
                      },
                    ),
                  ]
                : [
                    "Annual Review Pack",
                    "",
                    "Employee,Period,Status,Rating,Manager",
                    ...store.reviews.map(
                      (review) =>
                        `${review.employeeName},${review.reviewPeriod},${HR_REVIEW_STATUS_LABELS[review.status]},${review.overallRating ?? "—"},${review.managerName}`,
                    ),
                  ];

    downloadPerformanceTextFile(
      `performance-${kind}.${format === "pdf" ? "pdf" : "csv"}`,
      lines,
      format === "pdf" ? "application/pdf" : "text/csv",
    );
  }

  function saveNewGoal() {
    if (!goalForm.title.trim()) return;
    const goal: HrPerformanceObjective = {
      id: uid("goal"),
      title: goalForm.title.trim(),
      description: goalForm.description.trim(),
      progressPercent: goalForm.progressPercent,
      dueDate: goalForm.dueDate,
      status: goalForm.progressPercent >= 100 ? "completed" : "on_track",
      weight: goalForm.weight,
      owner: goalForm.owner.trim() || "Manager",
      scope: goalForm.scope,
      department: goalForm.department,
      employeeId: goalForm.scope === "employee" ? null : null,
      employeeName: goalForm.scope === "employee" ? goalForm.owner.trim() || undefined : undefined,
    };
    savePerformanceGoal(goal);
    setGoalDraftOpen(false);
    setGoalForm({
      title: "",
      description: "",
      scope: "employee",
      department: "Operations",
      owner: "",
      weight: 10,
      dueDate: todayIso(),
      progressPercent: 0,
    });
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <HrKpiTile label="Reviews Due" value={kpis.due} />
        <HrKpiTile label="Completed This Quarter" value={kpis.completedThisQuarter} />
        <HrKpiTile label="Goals On Track" value={kpis.onTrack} />
        <HrKpiTile label="Goals Behind" value={kpis.behind} />
        <HrKpiTile label="Requiring Attention" value={kpis.requiringAttention} />
        <HrKpiTile label="Avg Rating" value={kpis.average ?? "—"} />
        <HrKpiTile label="Promotion Recs" value={kpis.promotionRecommendations} />
        <HrKpiTile label="Training Recs" value={kpis.trainingRecommendations} />
      </section>

      <div className="flex flex-wrap gap-1.5">
        {HR_PERFORMANCE_HUB_TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              tab === item
                ? "border border-sky-400/40 bg-sky-500/15 text-sky-100"
                : "border border-transparent text-white/50 hover:bg-white/5 hover:text-white/80"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-3 xl:grid-cols-12">
          <HrSection
            className="xl:col-span-4"
            title="Review Queue"
            subtitle="Employees needing action"
            actions={
              <button
                type="button"
                className={hrSecondaryButtonClass()}
                onClick={() => setTab("Review Queue")}
              >
                View all
              </button>
            }
          >
            {queue.length === 0 ? (
              <p className="text-sm text-white/45">No open reviews requiring action.</p>
            ) : (
              <ul className="space-y-2">
                {queue.slice(0, 6).map((review) => (
                  <li
                    key={review.id}
                    className="rounded-xl border border-white/10 bg-[#0b1524]/70 p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar name={review.employeeName} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-white">
                            {review.employeeName}
                          </p>
                          <HrStatusPill className={reviewStatusClass(review.status)}>
                            {HR_REVIEW_STATUS_LABELS[review.status]}
                          </HrStatusPill>
                        </div>
                        <p className="mt-0.5 text-[11px] text-white/45">
                          Due {review.dueDate ?? review.nextReviewDate ?? "—"} ·{" "}
                          {review.managerName} ·{" "}
                          {(review.priority ?? "medium").toUpperCase()}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            className={hrPrimaryButtonClass()}
                            onClick={() => startReviewFromQueue(review)}
                          >
                            {review.status === "draft" ? "Start Review" : "Continue"}
                          </button>
                          <Link
                            href={getInternalNavHref("hr", basePath, {
                              employeeId: review.employeeId,
                              tab: "Performance",
                            })}
                            className={hrSecondaryButtonClass()}
                          >
                            View Employee
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </HrSection>

          <HrSection
            className="xl:col-span-4"
            title="Goals & Objectives"
            subtitle="Organisation · Department · Employee"
            actions={
              <button
                type="button"
                className={hrSecondaryButtonClass()}
                onClick={() => setTab("Goals")}
              >
                Goal Management
              </button>
            }
          >
            {allGoals.length === 0 ? (
              <p className="text-sm text-white/45">No goals tracked yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {allGoals.slice(0, 8).map((goal) => (
                  <li key={goal.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-white/10 bg-[#0b1524]/70 p-3 text-left transition-colors hover:border-sky-400/30"
                      onClick={() => setTab("Goals")}
                    >
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{goal.title}</p>
                          <p className="text-[11px] text-white/40">
                            {HR_GOAL_SCOPE_LABELS[goal.scope ?? "employee"]} ·{" "}
                            {goal.owner ?? "—"} · Target {goal.dueDate}
                          </p>
                        </div>
                        <HrStatusPill className={goalStatusClass(goal.status)}>
                          {goalStatusLabel(goal.status)}
                        </HrStatusPill>
                      </div>
                      <ProgressBar value={goal.progressPercent} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </HrSection>

          <HrSection
            className="xl:col-span-4"
            title="Insights"
            subtitle="Signals for managers"
          >
            <div className="space-y-3 text-sm">
              <InsightBlock title="Highest performers" empty="No rated high performers yet.">
                {insights.highest.map((review) => (
                  <InsightRow
                    key={review.id}
                    primary={review.employeeName}
                    secondary={`${review.overallRating}/5 · ${review.department}`}
                  />
                ))}
              </InsightBlock>
              <InsightBlock title="Needing coaching" empty="No coaching signals.">
                {insights.coaching.slice(0, 3).map((review) => (
                  <InsightRow
                    key={review.id}
                    primary={review.employeeName}
                    secondary={review.managerRecommendation ?? "Develop"}
                  />
                ))}
              </InsightBlock>
              <InsightBlock title="Recently completed" empty="No completed reviews.">
                {insights.completed.map((review) => (
                  <InsightRow
                    key={review.id}
                    primary={review.employeeName}
                    secondary={review.completedAt ?? review.updatedAt}
                  />
                ))}
              </InsightBlock>
              <InsightBlock title="Promotion candidates" empty="No promotion candidates.">
                {insights.promotion.map((review) => (
                  <InsightRow
                    key={review.id}
                    primary={review.employeeName}
                    secondary={review.promotionReady ?? "yes"}
                  />
                ))}
              </InsightBlock>
              <InsightBlock title="Succession candidates" empty="No succession candidates.">
                {insights.succession.map((review) => (
                  <InsightRow
                    key={review.id}
                    primary={review.employeeName}
                    secondary={review.careerPotential ?? "high"}
                  />
                ))}
              </InsightBlock>
              <InsightBlock title="Outstanding achievements" empty="No achievements logged.">
                {insights.achievements.map((review) => (
                  <InsightRow
                    key={review.id}
                    primary={review.employeeName}
                    secondary={review.achievements ?? ""}
                  />
                ))}
              </InsightBlock>
              <InsightBlock title="Training required" empty="No training recommendations.">
                {insights.training.slice(0, 3).map((review) => (
                  <InsightRow
                    key={review.id}
                    primary={review.employeeName}
                    secondary={review.trainingRecommendations}
                  />
                ))}
              </InsightBlock>
            </div>
          </HrSection>
        </div>
      ) : null}

      {tab === "Review Queue" ? (
        <HrSection
          title="Review Queue"
          subtitle="Card-based queue with type, progress, and quick actions"
        >
          {store.reviews.length === 0 ? (
            <p className="text-sm text-white/45">
              No performance reviews yet. Start a cycle from an employee record or create a draft
              below.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {store.reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-xl border border-white/10 bg-[#0b1524]/80 p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={review.employeeName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {review.employeeName}
                      </p>
                      <p className="text-[11px] text-white/45">
                        {review.department} · Manager {review.managerName}
                      </p>
                    </div>
                    <HrStatusPill className={reviewStatusClass(review.status)}>
                      {HR_REVIEW_STATUS_LABELS[review.status]}
                    </HrStatusPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                    <HrStatusPill className="border-white/15 bg-white/5 text-white/65">
                      {HR_REVIEW_TYPE_LABELS[review.reviewType ?? "annual"]}
                    </HrStatusPill>
                    <HrStatusPill className="border-white/15 bg-white/5 text-white/65">
                      Due {review.dueDate ?? review.nextReviewDate ?? "—"}
                    </HrStatusPill>
                    <HrStatusPill className="border-white/15 bg-white/5 text-white/65">
                      {(review.priority ?? "medium").toUpperCase()}
                    </HrStatusPill>
                  </div>
                  <div className="mt-3">
                    <ProgressBar
                      value={
                        review.status === "completed"
                          ? 100
                          : review.status === "approved"
                            ? 75
                            : review.status === "submitted"
                              ? 50
                              : 20
                      }
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className={hrPrimaryButtonClass()}
                      onClick={() => openReview(review.id)}
                    >
                      Continue Review
                    </button>
                    <Link
                      href={getInternalNavHref("hr", basePath, {
                        employeeId: review.employeeId,
                        tab: "Performance",
                      })}
                      className={hrSecondaryButtonClass()}
                    >
                      View Employee
                    </Link>
                    <button
                      type="button"
                      className={hrSecondaryButtonClass()}
                      onClick={() =>
                        downloadPerformanceTextFile(
                          `review-${review.employeeName.replace(/\s+/g, "-").toLowerCase()}.pdf`,
                          [
                            `Performance Review — ${review.employeeName}`,
                            `Period: ${review.reviewPeriod}`,
                            `Status: ${HR_REVIEW_STATUS_LABELS[review.status]}`,
                            `Rating: ${review.overallRating ?? "—"}`,
                            "",
                            review.summary || "No summary yet.",
                          ],
                          "application/pdf",
                        )
                      }
                    >
                      Generate PDF
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </HrSection>
      ) : null}

      {tab === "Goals" ? (
        <HrSection
          title="Goal Management"
          subtitle="Weight, target dates, progress, and ownership"
          actions={
            <button
              type="button"
              className={hrPrimaryButtonClass()}
              onClick={() => setGoalDraftOpen((open) => !open)}
            >
              Add Goal
            </button>
          }
        >
          {goalDraftOpen ? (
            <div className="mb-4 grid gap-3 rounded-xl border border-white/10 bg-[#07101c] p-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block sm:col-span-2 lg:col-span-3">
                <HrFieldLabel>Goal</HrFieldLabel>
                <input
                  className={hrInputClass()}
                  value={goalForm.title}
                  onChange={(event) =>
                    setGoalForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>
              <label className="block sm:col-span-2 lg:col-span-3">
                <HrFieldLabel>Description</HrFieldLabel>
                <textarea
                  className={`${hrInputClass()} min-h-[70px]`}
                  value={goalForm.description}
                  onChange={(event) =>
                    setGoalForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </label>
              <label className="block">
                <HrFieldLabel>Scope</HrFieldLabel>
                <select
                  className={hrInputClass()}
                  value={goalForm.scope}
                  onChange={(event) =>
                    setGoalForm((prev) => ({
                      ...prev,
                      scope: event.target.value as HrGoalScope,
                    }))
                  }
                >
                  {HR_GOAL_SCOPES.map((scope) => (
                    <option key={scope} value={scope}>
                      {HR_GOAL_SCOPE_LABELS[scope]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <HrFieldLabel>Department</HrFieldLabel>
                <input
                  className={hrInputClass()}
                  value={goalForm.department}
                  onChange={(event) =>
                    setGoalForm((prev) => ({ ...prev, department: event.target.value }))
                  }
                />
              </label>
              <label className="block">
                <HrFieldLabel>Owner</HrFieldLabel>
                <input
                  className={hrInputClass()}
                  value={goalForm.owner}
                  onChange={(event) =>
                    setGoalForm((prev) => ({ ...prev, owner: event.target.value }))
                  }
                />
              </label>
              <label className="block">
                <HrFieldLabel>Weight</HrFieldLabel>
                <input
                  type="number"
                  className={hrInputClass()}
                  value={goalForm.weight}
                  onChange={(event) =>
                    setGoalForm((prev) => ({
                      ...prev,
                      weight: Number(event.target.value) || 0,
                    }))
                  }
                />
              </label>
              <label className="block">
                <HrFieldLabel>Target date</HrFieldLabel>
                <input
                  type="date"
                  className={hrInputClass()}
                  value={goalForm.dueDate}
                  onChange={(event) =>
                    setGoalForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                />
              </label>
              <label className="block">
                <HrFieldLabel>Progress %</HrFieldLabel>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={hrInputClass()}
                  value={goalForm.progressPercent}
                  onChange={(event) =>
                    setGoalForm((prev) => ({
                      ...prev,
                      progressPercent: Number(event.target.value) || 0,
                    }))
                  }
                />
              </label>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
                <button type="button" className={hrPrimaryButtonClass()} onClick={saveNewGoal}>
                  Save goal
                </button>
                <button
                  type="button"
                  className={hrSecondaryButtonClass()}
                  onClick={() => setGoalDraftOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {allGoals.length === 0 ? (
            <p className="text-sm text-white/45">No goals yet. Add an organisation or employee goal.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                  <tr>
                    <th className="px-2 py-2">Goal</th>
                    <th className="px-2 py-2">Scope</th>
                    <th className="px-2 py-2">Weight</th>
                    <th className="px-2 py-2">Target</th>
                    <th className="px-2 py-2">Progress</th>
                    <th className="px-2 py-2">Owner</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {allGoals.map((goal) => (
                    <tr key={goal.id} className="border-t border-white/10 align-top">
                      <td className="px-2 py-2.5">
                        <p className="font-medium text-white">{goal.title}</p>
                        <p className="text-[11px] text-white/40">{goal.department}</p>
                      </td>
                      <td className="px-2 py-2.5 text-white/60">
                        {HR_GOAL_SCOPE_LABELS[goal.scope ?? "employee"]}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-white/60">
                        {goal.weight ?? 1}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-white/60">{goal.dueDate}</td>
                      <td className="px-2 py-2.5 min-w-[120px]">
                        <ProgressBar value={goal.progressPercent} />
                      </td>
                      <td className="px-2 py-2.5 text-white/60">{goal.owner ?? "—"}</td>
                      <td className="px-2 py-2.5">
                        <HrStatusPill className={goalStatusClass(goal.status)}>
                          {goalStatusLabel(goal.status)}
                        </HrStatusPill>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className={hrSecondaryButtonClass()}
                            onClick={() => markPerformanceGoalComplete(goal.id)}
                          >
                            Mark Complete
                          </button>
                          <button
                            type="button"
                            className={hrSecondaryButtonClass()}
                            onClick={() => archivePerformanceGoal(goal.id)}
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </HrSection>
      ) : null}

      {tab === "Development Plans" ? (
        <HrSection
          title="Development Plans"
          subtitle="Training, certifications, mentoring, coaching, stretch assignments"
        >
          {developmentItems.length === 0 ? (
            <p className="text-sm text-white/45">
              No development plan items yet. Add them inside a review slide-over.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {developmentItems.map((item) => (
                <article
                  key={`${item.reviewId}-${item.id}`}
                  className="rounded-xl border border-white/10 bg-[#0b1524]/80 p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.focus}</p>
                      <p className="text-[11px] text-white/45">
                        {item.employeeName} · {item.department}
                      </p>
                    </div>
                    <HrStatusPill className="border-sky-400/30 bg-sky-500/15 text-sky-100">
                      {HR_DEVELOPMENT_KIND_LABELS[item.kind ?? "other"]}
                    </HrStatusPill>
                  </div>
                  <p className="mt-2 text-sm text-white/70">{item.action}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/45">
                    <div>
                      <dt>Owner</dt>
                      <dd className="text-white/75">{item.owner}</dd>
                    </div>
                    <div>
                      <dt>Target</dt>
                      <dd className="text-white/75">{item.targetDate}</dd>
                    </div>
                    <div>
                      <dt>Budget</dt>
                      <dd className="text-white/75">{item.budget || "—"}</dd>
                    </div>
                    <div>
                      <dt>Next review</dt>
                      <dd className="text-white/75">{item.nextReviewDate || "—"}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className={`${hrSecondaryButtonClass()} mt-3`}
                    onClick={() => openReview(item.reviewId)}
                  >
                    Open review
                  </button>
                </article>
              ))}
            </div>
          )}
        </HrSection>
      ) : null}

      {tab === "Career Progression" ? (
        <HrSection
          title="Career Progression"
          subtitle="Potential, promotion readiness, succession, aspirations"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.12em] text-white/40">
                <tr>
                  <th className="px-2 py-2">Employee</th>
                  <th className="px-2 py-2">Potential</th>
                  <th className="px-2 py-2">Promotion ready</th>
                  <th className="px-2 py-2">Succession</th>
                  <th className="px-2 py-2">Aspirations</th>
                  <th className="px-2 py-2">Manager comments</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {store.reviews.map((review) => (
                  <tr key={review.id} className="border-t border-white/10 align-top">
                    <td className="px-2 py-2.5">
                      <p className="font-medium text-white">{review.employeeName}</p>
                      <p className="text-[11px] text-white/40">{review.role}</p>
                    </td>
                    <td className="px-2 py-2.5 capitalize text-white/70">
                      {review.careerPotential ?? "—"}
                    </td>
                    <td className="px-2 py-2.5 text-white/70">
                      {review.promotionReady === "now"
                        ? "Now"
                        : review.promotionReady === "12_months"
                          ? "12 months"
                          : review.promotionReady === "24_months"
                            ? "24 months"
                            : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-white/70">
                      {review.successionCandidate ? "Yes" : "No"}
                    </td>
                    <td className="max-w-[220px] px-2 py-2.5 text-white/60">
                      {review.careerAspirations || "—"}
                    </td>
                    <td className="max-w-[220px] px-2 py-2.5 text-white/60">
                      {review.managerCareerComments || "—"}
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        type="button"
                        className={hrSecondaryButtonClass()}
                        onClick={() => openReview(review.id)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HrSection>
      ) : null}

      {tab === "Competencies" ? (
        <div className="grid gap-3 xl:grid-cols-2">
          <HrSection title="Organisation competency radar" subtitle="Average scores 1–5">
            {competencyAverage.length === 0 ? (
              <p className="text-sm text-white/45">No competency ratings yet.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={competencyAverage}>
                    <PolarGrid stroke="rgba(255,255,255,0.12)" />
                    <PolarAngleAxis
                      dataKey="competency"
                      tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                    />
                    <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                    <Radar
                      dataKey="score"
                      stroke="#38bdf8"
                      fill="#38bdf8"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </HrSection>
          <HrSection title="Employee competency snapshots" subtitle="Open a review to rate">
            <ul className="space-y-2">
              {store.reviews.map((review) => (
                <li
                  key={review.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1524]/70 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{review.employeeName}</p>
                    <p className="text-[11px] text-white/45">
                      {review.competencies.length
                        ? `${review.competencies.length} competencies rated`
                        : "Not rated yet"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={hrSecondaryButtonClass()}
                    onClick={() => openReview(review.id)}
                  >
                    Rate
                  </button>
                </li>
              ))}
            </ul>
          </HrSection>
        </div>
      ) : null}

      {tab === "Reports" ? (
        <HrSection
          title="Performance Reports"
          subtitle="Generate PDF or Excel exports from current review data"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["annual", "Annual Review"],
                ["promotion", "Promotion Report"],
                ["calibration", "Calibration Report"],
                ["training", "Training Needs"],
                ["distribution", "Performance Distribution"],
                ["department", "Department Summary"],
              ] as const
            ).map(([kind, label]) => (
              <div
                key={kind}
                className="rounded-xl border border-white/10 bg-[#0b1524]/80 p-3.5"
              >
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="mt-1 text-[11px] text-white/45">
                  Uses live demo review and goal data in this workspace.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className={hrPrimaryButtonClass()}
                    onClick={() => exportReport(kind, "pdf")}
                  >
                    Export PDF
                  </button>
                  <button
                    type="button"
                    className={hrSecondaryButtonClass()}
                    onClick={() => exportReport(kind, "excel")}
                  >
                    Export Excel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </HrSection>
      ) : null}

      {activeReview ? (
        <PerformanceReviewSlideOver
          review={activeReview}
          onClose={() => setActiveReviewId(null)}
        />
      ) : null}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] font-semibold text-white">
      {employeeInitials(name)}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] text-white/45">
        <span>Progress</span>
        <span className="tabular-nums">{clamped}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-sky-400/80"
          style={{ width: `${Math.max(clamped, 3)}%` }}
        />
      </div>
    </div>
  );
}

function InsightBlock({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
        {title}
      </p>
      {items.length > 0 ? (
        <ul className="space-y-1">{items}</ul>
      ) : (
        <p className="text-xs text-white/40">{empty}</p>
      )}
    </div>
  );
}

function InsightRow({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <li className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
      <p className="truncate text-xs font-medium text-white/85">{primary}</p>
      <p className="truncate text-[11px] text-white/40">{secondary}</p>
    </li>
  );
}
