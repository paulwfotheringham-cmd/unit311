"use client";

import { useMemo, useState } from "react";

import type { HrEmployee } from "@/lib/hr-data";
import {
  HR_PERFORMANCE_PANEL_TABS,
  HR_PERFORMANCE_QUESTIONS,
  HR_PERFORMANCE_RATING_LABELS,
  HR_PERFORMANCE_RATINGS,
  HR_PERFORMANCE_SECTIONS,
  HR_REVIEW_STATUS_LABELS,
  averageRating,
  reviewStatusClass,
  type HrPerformancePanelTab,
  type HrPerformanceRating,
  type HrPerformanceReview,
  type HrReviewStatus,
} from "@/lib/hr-performance-data";
import {
  createDraftReviewForEmployee,
  getReviewsForEmployee,
  savePerformanceReview,
  setReviewStatus,
} from "@/lib/hr-mock-store";
import { useHrMockStore } from "./useHrMockStore";
import {
  HrFieldLabel,
  hrInputClass,
  hrPrimaryButtonClass,
  hrSecondaryButtonClass,
  HrStatusPill,
} from "./hr-ui";

type EmployeePerformancePanelProps = {
  employee: HrEmployee;
};

export default function EmployeePerformancePanel({ employee }: EmployeePerformancePanelProps) {
  useHrMockStore();
  const reviews = getReviewsForEmployee(employee.id);
  const [tab, setTab] = useState<HrPerformancePanelTab>("Overview");
  const [activeId, setActiveId] = useState<string | null>(reviews[0]?.id ?? null);

  const active = useMemo(() => {
    const list = getReviewsForEmployee(employee.id);
    return list.find((review) => review.id === activeId) ?? list[0] ?? null;
  }, [employee.id, activeId, reviews]);

  function ensureDraft() {
    if (active) return active;
    return createDraftReviewForEmployee({
      employeeId: employee.id,
      employeeName: employee.fullName || employee.preferredName,
      department: employee.department,
      role: employee.role,
      managerName: employee.manager || "Manager",
    });
  }

  function patchActive(patch: Partial<HrPerformanceReview>) {
    const base = ensureDraft();
    const next = {
      ...base,
      ...patch,
      employeeId: employee.id,
      employeeName: employee.fullName || employee.preferredName,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    savePerformanceReview(next);
    setActiveId(next.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {HR_PERFORMANCE_PANEL_TABS.map((item) => (
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

      {!active ? (
        <div className="rounded-xl border border-white/10 p-4">
          <p className="text-sm text-white/60">No review cycle yet for this employee.</p>
          <button
            type="button"
            className={`${hrPrimaryButtonClass()} mt-3`}
            onClick={() => {
              const created = createDraftReviewForEmployee({
                employeeId: employee.id,
                employeeName: employee.fullName || employee.preferredName,
                department: employee.department,
                role: employee.role,
                managerName: employee.manager || "Manager",
              });
              setActiveId(created.id);
              setTab("Manager Review");
            }}
          >
            Start performance review
          </button>
        </div>
      ) : null}

      {active && tab === "Overview" ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard label="Review period" value={active.reviewPeriod} />
            <InfoCard
              label="Status"
              value={
                <HrStatusPill className={reviewStatusClass(active.status)}>
                  {HR_REVIEW_STATUS_LABELS[active.status]}
                </HrStatusPill>
              }
            />
            <InfoCard label="Overall rating" value={active.overallRating ?? "—"} />
            <InfoCard label="Next review" value={active.nextReviewDate ?? "—"} />
            <div className="sm:col-span-2 rounded-xl border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Summary</p>
              <p className="mt-1 text-sm text-white/75">{active.summary || "No summary yet."}</p>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Strengths</p>
              <p className="mt-1 text-sm text-white/75">{active.strengths || "—"}</p>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                Areas for improvement
              </p>
              <p className="mt-1 text-sm text-white/75">{active.areasForImprovement || "—"}</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
              Recommendations and goals
            </p>
            <ReviewRecommendationFields review={active} onChange={patchActive} />
          </div>
        </div>
      ) : null}

      {active && tab === "Objectives" ? (
        <div className="space-y-2">
          {active.objectives.length === 0 ? (
            <p className="text-sm text-white/50">No objectives recorded for this cycle.</p>
          ) : (
            active.objectives.map((objective) => (
              <div key={objective.id} className="rounded-xl border border-white/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{objective.title}</p>
                    <p className="text-xs text-white/50">{objective.description}</p>
                  </div>
                  <span className="text-xs tabular-nums text-sky-200">{objective.progressPercent}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-sky-400/80"
                    style={{ width: `${objective.progressPercent}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {active && tab === "Competencies" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {active.competencies.length === 0 ? (
            <p className="text-sm text-white/50">Competency scores appear after ratings are saved.</p>
          ) : (
            active.competencies.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 p-3">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="text-xs text-amber-200/80">
                  {item.score} — {HR_PERFORMANCE_RATING_LABELS[item.score]}
                </p>
                {item.notes ? <p className="mt-1 text-xs text-white/45">{item.notes}</p> : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {active && (tab === "Manager Review" || tab === "Employee Self Review") ? (
        <ReviewForm
          review={active}
          mode={tab === "Manager Review" ? "manager" : "employee"}
          onChange={patchActive}
          onStatus={(status) => setReviewStatus(active.id, status)}
        />
      ) : null}

      {active && tab === "Development Plan" ? (
        <div className="space-y-3">
          {active.developmentPlan.length === 0 ? (
            <p className="text-sm text-white/50">No development actions yet.</p>
          ) : (
            active.developmentPlan.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 p-3 text-sm">
                <p className="font-medium text-white">{item.focus}</p>
                <p className="text-white/60">{item.action}</p>
                <p className="mt-1 text-xs text-white/40">
                  {item.owner} · due {item.targetDate} · {item.status.replace("_", " ")}
                </p>
              </div>
            ))
          )}
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
              Recommendations and goals
            </p>
            <ReviewRecommendationFields review={active} onChange={patchActive} />
          </div>
        </div>
      ) : null}

      {tab === "History" ? (
        <div className="space-y-2">
          {reviews.length === 0 ? (
            <p className="text-sm text-white/50">No review history for this employee yet.</p>
          ) : (
            reviews.map((review) => (
              <button
                key={review.id}
                type="button"
                onClick={() => {
                  setActiveId(review.id);
                  setTab("Overview");
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-left hover:bg-white/[0.04]"
              >
                <div>
                  <p className="text-sm font-medium text-white">{review.reviewPeriod}</p>
                  <p className="text-xs text-white/45">{review.managerName}</p>
                </div>
                <HrStatusPill className={reviewStatusClass(review.status)}>
                  {HR_REVIEW_STATUS_LABELS[review.status]}
                </HrStatusPill>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">{label}</p>
      <div className="mt-1 text-sm text-white">{value}</div>
    </div>
  );
}

function ReviewRecommendationFields({
  review,
  onChange,
}: {
  review: HrPerformanceReview;
  onChange: (patch: Partial<HrPerformanceReview>) => void;
}) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div>
        <HrFieldLabel>Manager recommendation</HrFieldLabel>
        <select
          className={hrInputClass()}
          value={review.managerRecommendation ?? ""}
          onChange={(event) =>
            onChange({
              managerRecommendation: (event.target.value || null) as
                | "retain"
                | "develop"
                | "performance_plan"
                | "exit_risk"
                | null,
            })
          }
        >
          <option value="">Not set</option>
          <option value="retain">Retain in current role</option>
          <option value="develop">Develop for progression</option>
          <option value="performance_plan">Performance improvement plan</option>
          <option value="exit_risk">Exit or role change risk</option>
        </select>
      </div>
      <div>
        <HrFieldLabel>Promotion recommendation</HrFieldLabel>
        <select
          className={hrInputClass()}
          value={review.promotionRecommendation ?? ""}
          onChange={(event) =>
            onChange({
              promotionRecommendation: (event.target.value || null) as "yes" | "no" | "later" | null,
            })
          }
        >
          <option value="">Not set</option>
          <option value="yes">Recommend promotion</option>
          <option value="later">Consider later</option>
          <option value="no">Not recommended</option>
        </select>
      </div>
      <div>
        <HrFieldLabel>Salary review recommendation</HrFieldLabel>
        <select
          className={hrInputClass()}
          value={review.salaryReviewRecommendation ?? ""}
          onChange={(event) =>
            onChange({
              salaryReviewRecommendation: (event.target.value || null) as
                | "increase"
                | "hold"
                | "review_later"
                | null,
            })
          }
        >
          <option value="">Not set</option>
          <option value="increase">Recommend increase</option>
          <option value="hold">Hold current level</option>
          <option value="review_later">Review at next cycle</option>
        </select>
      </div>
      <div>
        <HrFieldLabel>Next review date</HrFieldLabel>
        <input
          type="date"
          className={hrInputClass()}
          value={review.nextReviewDate ?? ""}
          onChange={(event) => onChange({ nextReviewDate: event.target.value || null })}
        />
      </div>
      <div className="sm:col-span-2">
        <HrFieldLabel>Training recommendations</HrFieldLabel>
        <textarea
          className={hrInputClass()}
          rows={3}
          value={review.trainingRecommendations}
          onChange={(event) => onChange({ trainingRecommendations: event.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <HrFieldLabel>Employee goals</HrFieldLabel>
        <textarea
          className={hrInputClass()}
          rows={3}
          value={review.employeeGoals}
          onChange={(event) => onChange({ employeeGoals: event.target.value })}
          placeholder="Goals for the next review period"
        />
      </div>
    </div>
  );
}

function ReviewForm({
  review,
  mode,
  onChange,
  onStatus,
}: {
  review: HrPerformanceReview;
  mode: "manager" | "employee";
  onChange: (patch: Partial<HrPerformanceReview>) => void;
  onStatus: (status: HrReviewStatus) => void;
}) {
  const avg = averageRating(review.responses);

  function responseIndex(questionId: (typeof HR_PERFORMANCE_QUESTIONS)[number]["id"]) {
    return HR_PERFORMANCE_QUESTIONS.findIndex((question) => question.id === questionId);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={hrSecondaryButtonClass()} onClick={() => onStatus("draft")}>
          Save draft
        </button>
        <button
          type="button"
          className={hrPrimaryButtonClass()}
          onClick={() => onStatus("submitted")}
        >
          Submit
        </button>
        <button
          type="button"
          className={hrSecondaryButtonClass()}
          onClick={() => onStatus("approved")}
        >
          Approve
        </button>
        <button
          type="button"
          className={hrSecondaryButtonClass()}
          onClick={() => onStatus("completed")}
        >
          Complete
        </button>
      </div>

      <div className="space-y-5">
        {HR_PERFORMANCE_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">{section.title}</p>
            {section.questions.map((question) => {
              const index = responseIndex(question.id);
              const response = review.responses[index]!;
              return (
                <div key={question.id} className="rounded-xl border border-white/10 p-3">
                  <p className="text-sm font-medium text-white">{question.label}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <div>
                      <HrFieldLabel>Rating</HrFieldLabel>
                      <select
                        className={hrInputClass()}
                        value={response.rating ?? ""}
                        onChange={(event) => {
                          const rating = event.target.value
                            ? (Number(event.target.value) as HrPerformanceRating)
                            : null;
                          const responses = review.responses.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, rating } : item,
                          );
                          onChange({
                            responses,
                            overallRating:
                              (Math.round(averageRating(responses) ?? 0) as HrPerformanceRating) ||
                              null,
                          });
                        }}
                      >
                        <option value="">Select</option>
                        {HR_PERFORMANCE_RATINGS.map((rating) => (
                          <option key={rating} value={rating}>
                            {rating} — {HR_PERFORMANCE_RATING_LABELS[rating]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <HrFieldLabel>Manager comments</HrFieldLabel>
                      <input
                        className={hrInputClass()}
                        disabled={mode === "employee"}
                        value={response.managerComments}
                        onChange={(event) => {
                          const responses = review.responses.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, managerComments: event.target.value }
                              : item,
                          );
                          onChange({ responses });
                        }}
                      />
                    </div>
                    <div>
                      <HrFieldLabel>Employee comments</HrFieldLabel>
                      <input
                        className={hrInputClass()}
                        disabled={mode === "manager"}
                        value={response.employeeComments}
                        onChange={(event) => {
                          const responses = review.responses.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, employeeComments: event.target.value }
                              : item,
                          );
                          onChange({ responses });
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <HrFieldLabel>Overall summary</HrFieldLabel>
          <textarea
            className={hrInputClass()}
            rows={3}
            value={review.summary}
            onChange={(event) => onChange({ summary: event.target.value })}
          />
        </div>
        <div>
          <HrFieldLabel>Overall rating {avg != null ? `(avg ${avg})` : ""}</HrFieldLabel>
          <select
            className={hrInputClass()}
            value={review.overallRating ?? ""}
            onChange={(event) =>
              onChange({
                overallRating: event.target.value
                  ? (Number(event.target.value) as HrPerformanceRating)
                  : null,
              })
            }
          >
            <option value="">Select</option>
            {HR_PERFORMANCE_RATINGS.map((rating) => (
              <option key={rating} value={rating}>
                {rating} — {HR_PERFORMANCE_RATING_LABELS[rating]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <HrFieldLabel>Strengths</HrFieldLabel>
          <textarea
            className={hrInputClass()}
            rows={3}
            value={review.strengths}
            onChange={(event) => onChange({ strengths: event.target.value })}
          />
        </div>
        <div>
          <HrFieldLabel>Areas for improvement</HrFieldLabel>
          <textarea
            className={hrInputClass()}
            rows={3}
            value={review.areasForImprovement}
            onChange={(event) => onChange({ areasForImprovement: event.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
            Recommendations and goals
          </p>
          <ReviewRecommendationFields review={review} onChange={onChange} />
        </div>
        <div className="sm:col-span-2">
          <HrFieldLabel>Review status</HrFieldLabel>
          <p className="mt-1.5">
            <HrStatusPill className={reviewStatusClass(review.status)}>
              {HR_REVIEW_STATUS_LABELS[review.status]}
            </HrStatusPill>
          </p>
        </div>
      </div>
    </div>
  );
}
