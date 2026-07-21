"use client";

import { useEffect, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import {
  HR_COMPETENCY_CATALOG,
  HR_DEVELOPMENT_KIND_LABELS,
  HR_DEVELOPMENT_KINDS,
  HR_PERFORMANCE_RATING_LABELS,
  HR_PERFORMANCE_RATINGS,
  HR_REVIEW_STATUS_LABELS,
  HR_REVIEW_TYPE_LABELS,
  HR_REVIEW_TYPES,
  blankCompetencyScores,
  downloadPerformanceTextFile,
  employeeInitials,
  reviewStatusClass,
  type HrCareerPotential,
  type HrDevelopmentItem,
  type HrDevelopmentKind,
  type HrPerformanceRating,
  type HrPerformanceReview,
  type HrPromotionReady,
  type HrReviewType,
} from "@/lib/hr-performance-data";
import { savePerformanceReview, setReviewStatus } from "@/lib/hr-mock-store";
import {
  HrFieldLabel,
  hrInputClass,
  hrPrimaryButtonClass,
  hrSecondaryButtonClass,
  HrStatusPill,
} from "./hr-ui";

const DRAWER_SECTIONS = [
  "Objectives",
  "Competencies",
  "Achievements",
  "Challenges",
  "Manager Notes",
  "Employee Self Assessment",
  "Training Required",
  "Promotion Recommendation",
  "Salary Recommendation",
  "Overall Rating",
  "Digital Signoff",
] as const;

type DrawerSection = (typeof DRAWER_SECTIONS)[number];

type Props = {
  review: HrPerformanceReview;
  onClose: () => void;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export default function PerformanceReviewSlideOver({ review, onClose }: Props) {
  const [draft, setDraft] = useState<HrPerformanceReview>(review);
  const [section, setSection] = useState<DrawerSection>("Objectives");

  useEffect(() => {
    setDraft({
      ...review,
      competencies:
        review.competencies.length >= HR_COMPETENCY_CATALOG.length
          ? review.competencies
          : blankCompetencyScores().map((blank) => {
              const existing = review.competencies.find(
                (item) => item.name.toLowerCase() === blank.name.toLowerCase(),
              );
              return existing ?? blank;
            }),
    });
  }, [review]);

  function patch(next: Partial<HrPerformanceReview>) {
    setDraft((prev) => ({ ...prev, ...next, updatedAt: todayIso() }));
  }

  function save() {
    savePerformanceReview(draft);
  }

  function generatePdf() {
    downloadPerformanceTextFile(
      `performance-review-${draft.employeeName.replace(/\s+/g, "-").toLowerCase()}.pdf`,
      [
        "UNIT311 — Performance Review",
        `Employee: ${draft.employeeName}`,
        `Department: ${draft.department}`,
        `Manager: ${draft.managerName}`,
        `Period: ${draft.reviewPeriod}`,
        `Type: ${HR_REVIEW_TYPE_LABELS[draft.reviewType ?? "annual"]}`,
        `Status: ${HR_REVIEW_STATUS_LABELS[draft.status]}`,
        `Overall rating: ${draft.overallRating ?? "—"}`,
        "",
        "Summary",
        draft.summary || "—",
        "",
        "Achievements",
        draft.achievements || "—",
        "",
        "Challenges",
        draft.challenges || "—",
        "",
        "Manager notes",
        draft.strengths || "—",
        draft.areasForImprovement || "—",
        "",
        "Employee self assessment",
        draft.employeeSelfAssessment || "—",
        "",
        "Training",
        draft.trainingRecommendations || "—",
        "",
        `Promotion: ${draft.promotionRecommendation ?? "—"}`,
        `Salary: ${draft.salaryReviewRecommendation ?? "—"}`,
        `Sign-off manager: ${draft.signedOffManager ? "Yes" : "No"}`,
        `Sign-off employee: ${draft.signedOffEmployee ? "Yes" : "No"}`,
      ],
      "application/pdf",
    );
  }

  const radarData = draft.competencies.map((item) => ({
    competency: item.name.replace(" ", "\n"),
    score: item.score,
  }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-sm">
      <button type="button" aria-label="Close panel" className="flex-1 cursor-default" onClick={onClose} />
      <aside className="flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-[#0b1524] shadow-2xl">
        <header className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white">
                {employeeInitials(draft.employeeName)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{draft.employeeName}</h3>
                <p className="mt-0.5 text-sm text-white/50">
                  {draft.role} · {draft.department} · {draft.managerName}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <HrStatusPill className={reviewStatusClass(draft.status)}>
                    {HR_REVIEW_STATUS_LABELS[draft.status]}
                  </HrStatusPill>
                  <HrStatusPill className="border-white/15 bg-white/5 text-white/65">
                    {HR_REVIEW_TYPE_LABELS[draft.reviewType ?? "annual"]}
                  </HrStatusPill>
                  <HrStatusPill className="border-white/15 bg-white/5 text-white/65">
                    Due {draft.dueDate ?? draft.nextReviewDate ?? "—"}
                  </HrStatusPill>
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} className={hrSecondaryButtonClass()}>
              Close
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-1 border-b border-white/10 px-4 py-2">
          {DRAWER_SECTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSection(item)}
              className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                section === item
                  ? "border border-sky-400/40 bg-sky-500/15 text-sky-100"
                  : "border border-transparent text-white/45 hover:bg-white/5 hover:text-white/75"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {section === "Objectives" ? (
            <ObjectivesEditor
              draft={draft}
              onChange={(objectives) => patch({ objectives })}
            />
          ) : null}

          {section === "Competencies" ? (
            <div className="space-y-4">
              <div className="h-56 rounded-xl border border-white/10 bg-[#07101c] p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.12)" />
                    <PolarAngleAxis
                      dataKey="competency"
                      tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 9 }}
                    />
                    <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                    <Radar
                      dataKey="score"
                      stroke="#38bdf8"
                      fill="#38bdf8"
                      fillOpacity={0.35}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {draft.competencies.map((item, index) => (
                  <label
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <span className="text-xs font-medium text-white/80">{item.name}</span>
                    <select
                      className={hrInputClass()}
                      value={item.score}
                      onChange={(event) => {
                        const score = Number(event.target.value) as HrPerformanceRating;
                        const next = draft.competencies.map((comp, i) =>
                          i === index ? { ...comp, score } : comp,
                        );
                        patch({ competencies: next });
                      }}
                    >
                      {HR_PERFORMANCE_RATINGS.map((rating) => (
                        <option key={rating} value={rating}>
                          {rating} — {HR_PERFORMANCE_RATING_LABELS[rating]}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {section === "Achievements" ? (
            <TextBlock
              label="Outstanding achievements"
              value={draft.achievements ?? ""}
              onChange={(achievements) => patch({ achievements })}
            />
          ) : null}

          {section === "Challenges" ? (
            <TextBlock
              label="Challenges this period"
              value={draft.challenges ?? ""}
              onChange={(challenges) => patch({ challenges })}
            />
          ) : null}

          {section === "Manager Notes" ? (
            <div className="space-y-3">
              <TextBlock
                label="Strengths"
                value={draft.strengths}
                onChange={(strengths) => patch({ strengths })}
              />
              <TextBlock
                label="Areas for improvement"
                value={draft.areasForImprovement}
                onChange={(areasForImprovement) => patch({ areasForImprovement })}
              />
              <TextBlock
                label="Summary"
                value={draft.summary}
                onChange={(summary) => patch({ summary })}
              />
            </div>
          ) : null}

          {section === "Employee Self Assessment" ? (
            <TextBlock
              label="Employee self assessment"
              value={draft.employeeSelfAssessment ?? ""}
              onChange={(employeeSelfAssessment) => patch({ employeeSelfAssessment })}
            />
          ) : null}

          {section === "Training Required" ? (
            <div className="space-y-3">
              <TextBlock
                label="Training recommendations"
                value={draft.trainingRecommendations}
                onChange={(trainingRecommendations) => patch({ trainingRecommendations })}
              />
              <DevelopmentEditor
                items={draft.developmentPlan}
                onChange={(developmentPlan) => patch({ developmentPlan })}
              />
            </div>
          ) : null}

          {section === "Promotion Recommendation" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Promotion recommendation"
                value={draft.promotionRecommendation ?? ""}
                onChange={(value) =>
                  patch({
                    promotionRecommendation:
                      value === "" ? null : (value as "yes" | "no" | "later"),
                  })
                }
                options={[
                  { value: "", label: "Not set" },
                  { value: "yes", label: "Yes" },
                  { value: "later", label: "Later" },
                  { value: "no", label: "No" },
                ]}
              />
              <SelectField
                label="Promotion ready"
                value={draft.promotionReady ?? ""}
                onChange={(value) =>
                  patch({
                    promotionReady:
                      value === "" ? null : (value as HrPromotionReady),
                  })
                }
                options={[
                  { value: "", label: "Not set" },
                  { value: "now", label: "Now" },
                  { value: "12_months", label: "12 months" },
                  { value: "24_months", label: "24 months" },
                ]}
              />
              <SelectField
                label="Potential"
                value={draft.careerPotential ?? ""}
                onChange={(value) =>
                  patch({
                    careerPotential:
                      value === "" ? null : (value as HrCareerPotential),
                  })
                }
                options={[
                  { value: "", label: "Not set" },
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
              />
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={Boolean(draft.successionCandidate)}
                  onChange={(event) =>
                    patch({ successionCandidate: event.target.checked })
                  }
                />
                Succession candidate
              </label>
              <div className="sm:col-span-2">
                <TextBlock
                  label="Career aspirations"
                  value={draft.careerAspirations ?? ""}
                  onChange={(careerAspirations) => patch({ careerAspirations })}
                />
              </div>
              <div className="sm:col-span-2">
                <TextBlock
                  label="Manager career comments"
                  value={draft.managerCareerComments ?? ""}
                  onChange={(managerCareerComments) => patch({ managerCareerComments })}
                />
              </div>
            </div>
          ) : null}

          {section === "Salary Recommendation" ? (
            <SelectField
              label="Salary recommendation"
              value={draft.salaryReviewRecommendation ?? ""}
              onChange={(value) =>
                patch({
                  salaryReviewRecommendation:
                    value === ""
                      ? null
                      : (value as "increase" | "hold" | "review_later"),
                })
              }
              options={[
                { value: "", label: "Not set" },
                { value: "increase", label: "Increase" },
                { value: "hold", label: "Hold" },
                { value: "review_later", label: "Review later" },
              ]}
            />
          ) : null}

          {section === "Overall Rating" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Overall rating"
                value={draft.overallRating?.toString() ?? ""}
                onChange={(value) =>
                  patch({
                    overallRating:
                      value === ""
                        ? null
                        : (Number(value) as HrPerformanceRating),
                  })
                }
                options={[
                  { value: "", label: "Not set" },
                  ...HR_PERFORMANCE_RATINGS.map((rating) => ({
                    value: String(rating),
                    label: `${rating} — ${HR_PERFORMANCE_RATING_LABELS[rating]}`,
                  })),
                ]}
              />
              <SelectField
                label="Review type"
                value={draft.reviewType ?? "annual"}
                onChange={(value) => patch({ reviewType: value as HrReviewType })}
                options={HR_REVIEW_TYPES.map((type) => ({
                  value: type,
                  label: HR_REVIEW_TYPE_LABELS[type],
                }))}
              />
              <label className="block sm:col-span-2">
                <HrFieldLabel>Due date</HrFieldLabel>
                <input
                  type="date"
                  className={hrInputClass()}
                  value={draft.dueDate ?? ""}
                  onChange={(event) => patch({ dueDate: event.target.value || null })}
                />
              </label>
            </div>
          ) : null}

          {section === "Digital Signoff" ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={Boolean(draft.signedOffManager)}
                  onChange={(event) =>
                    patch({ signedOffManager: event.target.checked })
                  }
                />
                Manager digital sign-off
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={Boolean(draft.signedOffEmployee)}
                  onChange={(event) =>
                    patch({ signedOffEmployee: event.target.checked })
                  }
                />
                Employee digital sign-off
              </label>
            </div>
          ) : null}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
          <button type="button" className={hrPrimaryButtonClass()} onClick={save}>
            Save review
          </button>
          {draft.status === "draft" ? (
            <button
              type="button"
              className={hrSecondaryButtonClass()}
              onClick={() => {
                savePerformanceReview(draft);
                setReviewStatus(draft.id, "submitted");
              }}
            >
              Submit to manager
            </button>
          ) : null}
          {draft.status === "submitted" ? (
            <button
              type="button"
              className={hrSecondaryButtonClass()}
              onClick={() => {
                savePerformanceReview(draft);
                setReviewStatus(draft.id, "approved");
              }}
            >
              Approve
            </button>
          ) : null}
          {draft.status !== "completed" ? (
            <button
              type="button"
              className={hrSecondaryButtonClass()}
              onClick={() => {
                savePerformanceReview({
                  ...draft,
                  signedOffManager: true,
                  signedOffEmployee: true,
                });
                setReviewStatus(draft.id, "completed");
              }}
            >
              Complete & sign off
            </button>
          ) : null}
          <button type="button" className={hrSecondaryButtonClass()} onClick={generatePdf}>
            Generate PDF
          </button>
        </footer>
      </aside>
    </div>
  );
}

function TextBlock({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <HrFieldLabel>{label}</HrFieldLabel>
      <textarea
        className={`${hrInputClass()} min-h-[110px]`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <HrFieldLabel>{label}</HrFieldLabel>
      <select className={hrInputClass()} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ObjectivesEditor({
  draft,
  onChange,
}: {
  draft: HrPerformanceReview;
  onChange: (objectives: HrPerformanceReview["objectives"]) => void;
}) {
  return (
    <div className="space-y-3">
      {draft.objectives.length === 0 ? (
        <p className="text-sm text-white/45">No objectives on this review yet.</p>
      ) : null}
      {draft.objectives.map((objective, index) => (
        <div key={objective.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <input
            className={hrInputClass()}
            value={objective.title}
            onChange={(event) => {
              const next = draft.objectives.map((item, i) =>
                i === index ? { ...item, title: event.target.value } : item,
              );
              onChange(next);
            }}
          />
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="block">
              <HrFieldLabel>Progress %</HrFieldLabel>
              <input
                type="number"
                min={0}
                max={100}
                className={hrInputClass()}
                value={objective.progressPercent}
                onChange={(event) => {
                  const next = draft.objectives.map((item, i) =>
                    i === index
                      ? { ...item, progressPercent: Number(event.target.value) || 0 }
                      : item,
                  );
                  onChange(next);
                }}
              />
            </label>
            <label className="block">
              <HrFieldLabel>Weight</HrFieldLabel>
              <input
                type="number"
                min={0}
                className={hrInputClass()}
                value={objective.weight ?? 1}
                onChange={(event) => {
                  const next = draft.objectives.map((item, i) =>
                    i === index
                      ? { ...item, weight: Number(event.target.value) || 0 }
                      : item,
                  );
                  onChange(next);
                }}
              />
            </label>
            <label className="block">
              <HrFieldLabel>Status</HrFieldLabel>
              <select
                className={hrInputClass()}
                value={objective.status}
                onChange={(event) => {
                  const next = draft.objectives.map((item, i) =>
                    i === index
                      ? {
                          ...item,
                          status: event.target.value as typeof objective.status,
                        }
                      : item,
                  );
                  onChange(next);
                }}
              >
                <option value="on_track">On Track</option>
                <option value="at_risk">Behind</option>
                <option value="completed">Completed</option>
                <option value="deferred">Deferred</option>
              </select>
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        className={hrSecondaryButtonClass()}
        onClick={() =>
          onChange([
            ...draft.objectives,
            {
              id: uid("obj"),
              title: "New objective",
              description: "",
              progressPercent: 0,
              dueDate: todayIso(),
              status: "on_track",
              weight: 10,
              owner: draft.employeeName,
              scope: "employee",
              employeeId: draft.employeeId,
              employeeName: draft.employeeName,
              department: draft.department,
            },
          ])
        }
      >
        Add objective
      </button>
    </div>
  );
}

function DevelopmentEditor({
  items,
  onChange,
}: {
  items: HrDevelopmentItem[];
  onChange: (items: HrDevelopmentItem[]) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={hrInputClass()}
              value={item.focus}
              placeholder="Focus"
              onChange={(event) => {
                const next = items.map((row, i) =>
                  i === index ? { ...row, focus: event.target.value } : row,
                );
                onChange(next);
              }}
            />
            <select
              className={hrInputClass()}
              value={item.kind ?? "training"}
              onChange={(event) => {
                const next = items.map((row, i) =>
                  i === index
                    ? { ...row, kind: event.target.value as HrDevelopmentKind }
                    : row,
                );
                onChange(next);
              }}
            >
              {HR_DEVELOPMENT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {HR_DEVELOPMENT_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className={`${hrInputClass()} mt-2 min-h-[70px]`}
            value={item.action}
            placeholder="Action"
            onChange={(event) => {
              const next = items.map((row, i) =>
                i === index ? { ...row, action: event.target.value } : row,
              );
              onChange(next);
            }}
          />
        </div>
      ))}
      <button
        type="button"
        className={hrSecondaryButtonClass()}
        onClick={() =>
          onChange([
            ...items,
            {
              id: uid("dev"),
              focus: "New development item",
              action: "",
              owner: "Manager",
              targetDate: todayIso(),
              status: "planned",
              kind: "training",
              budget: "",
              nextReviewDate: todayIso(),
            },
          ])
        }
      >
        Add development item
      </button>
    </div>
  );
}
