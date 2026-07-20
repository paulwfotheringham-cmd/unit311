"use client";

import { useMemo, useState } from "react";
import { Ban, CalendarClock, Gift, MoveRight } from "lucide-react";

import {
  HR_PIPELINE_STAGE_LABELS,
  HR_PIPELINE_STAGES,
  interviewTypeLabel,
  offerStatusLabel,
  pipelineStageClass,
  type HrCandidate,
  type HrInterview,
  type HrPipelineStage,
  type HrVacancy,
} from "@/lib/hr-recruitment-data";
import {
  moveCandidateStage,
  offerCandidate,
  rejectCandidate,
} from "@/lib/hr-mock-store";
import { useHrMockStore } from "./useHrMockStore";
import {
  HrFieldLabel,
  HrKpiTile,
  hrPrimaryButtonClass,
  HrSection,
  hrSecondaryButtonClass,
  HrStatusPill,
} from "./hr-ui";

function formatInterviewDateTime(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTimelineDate(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function interviewStatusLabel(status: HrInterview["status"]) {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
  }
}

function recommendationLabel(
  recommendation: HrInterview["recommendation"],
) {
  switch (recommendation) {
    case "strong_yes":
      return "Strong yes";
    case "yes":
      return "Yes";
    case "neutral":
      return "Neutral";
    case "no":
      return "No";
    case "strong_no":
      return "Strong no";
    default:
      return "Pending";
  }
}

function vacancyStatusLabel(status: HrVacancy["status"]) {
  switch (status) {
    case "open":
      return "Open";
    case "on_hold":
      return "On hold";
    case "filled":
      return "Filled";
    case "cancelled":
      return "Cancelled";
  }
}

export default function RecruitmentWorkspace() {
  const store = useHrMockStore();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null);

  const openVacancies = store.vacancies.filter((vacancy) => vacancy.status === "open");
  const activeCandidates = store.candidates.filter((candidate) => !candidate.rejected);
  const interviews = activeCandidates.filter((candidate) => candidate.stage === "interview");
  const offers = activeCandidates.filter((candidate) => candidate.stage === "offer");
  const accepted = activeCandidates.filter(
    (candidate) => candidate.stage === "accepted" || candidate.stage === "onboarding",
  );

  const avgTimeToHire = useMemo(() => {
    const closed = store.candidates.filter(
      (candidate) => candidate.stage === "onboarding" || candidate.stage === "accepted",
    );
    if (!closed.length) return null;
    return Math.round(
      closed.reduce((sum, candidate) => {
        const applied = new Date(candidate.appliedAt).getTime();
        return sum + Math.max(7, Math.round((Date.now() - applied) / (1000 * 60 * 60 * 24)));
      }, 0) / closed.length,
    );
  }, [store.candidates]);

  const byDepartment = useMemo(() => {
    const map = new Map<string, number>();
    for (const candidate of activeCandidates) {
      map.set(candidate.department, (map.get(candidate.department) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [activeCandidates]);

  const upcomingInterviews = useMemo(() => {
    const now = Date.now();
    return activeCandidates
      .flatMap((candidate) =>
        candidate.interviews
          .filter((interview) => interview.status === "scheduled")
          .map((interview) => ({ candidate, interview })),
      )
      .filter(({ interview }) => new Date(interview.scheduledAt).getTime() >= now - 1000 * 60 * 60 * 24)
      .sort(
        (a, b) =>
          new Date(a.interview.scheduledAt).getTime() - new Date(b.interview.scheduledAt).getTime(),
      )
      .slice(0, 6);
  }, [activeCandidates]);

  const selectedCandidate =
    store.candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;

  const selectedVacancy =
    store.vacancies.find((vacancy) => vacancy.id === selectedVacancyId) ??
    openVacancies[0] ??
    store.vacancies[0] ??
    null;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <HrKpiTile label="Open Roles" value={openVacancies.length} />
        <HrKpiTile label="Applicants" value={activeCandidates.length} />
        <HrKpiTile label="Interviews" value={interviews.length} />
        <HrKpiTile label="Offers" value={offers.length} />
        <HrKpiTile
          label="Time to Hire"
          value={avgTimeToHire != null ? `${avgTimeToHire}d` : "—"}
          hint={avgTimeToHire != null ? "Average days" : "No hires completed yet"}
        />
      </section>

      <HrSection title="Hiring Pipeline" subtitle="Move candidates through each stage.">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {HR_PIPELINE_STAGES.map((stage) => {
            const cards = activeCandidates.filter((candidate) => candidate.stage === stage);
            return (
              <div
                key={stage}
                className="min-w-[15rem] max-w-[15rem] shrink-0 rounded-2xl border border-white/10 bg-[#0b1524]/60 p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                    {HR_PIPELINE_STAGE_LABELS[stage]}
                  </p>
                  <span className="rounded-md bg-white/10 px-1.5 text-[11px] tabular-nums text-white/60">
                    {cards.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {cards.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      selected={selectedCandidateId === candidate.id}
                      onOpen={() => setSelectedCandidateId(candidate.id)}
                      onMove={() => moveCandidateStage(candidate.id)}
                      onReject={() => rejectCandidate(candidate.id)}
                      onOffer={() => offerCandidate(candidate.id)}
                    />
                  ))}
                  {cards.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 px-2 py-6 text-center text-xs text-white/35">
                      No candidates
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </HrSection>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <HrSection title="Open Vacancies" subtitle="Select a role to view full details.">
          <ul className="space-y-2">
            {store.vacancies.map((vacancy) => (
              <li key={vacancy.id}>
                <button
                  type="button"
                  onClick={() => setSelectedVacancyId(vacancy.id)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selectedVacancy?.id === vacancy.id
                      ? "border-sky-400/40 bg-sky-500/10"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white">{vacancy.title}</p>
                    <HrStatusPill
                      className={
                        vacancy.status === "open"
                          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                          : "border-white/15 bg-white/5 text-white/55"
                      }
                    >
                      {vacancyStatusLabel(vacancy.status)}
                    </HrStatusPill>
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    {vacancy.department} · {vacancy.location}
                  </p>
                  <p className="mt-1 text-[11px] text-white/40">
                    {activeCandidates.filter((c) => c.vacancyId === vacancy.id).length} active candidates
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </HrSection>

        {selectedVacancy ? (
          <HrSection title="Vacancy Details" subtitle={selectedVacancy.title}>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Hiring Manager" value={selectedVacancy.hiringManager} />
              <DetailField label="Salary Band" value={selectedVacancy.salaryBand} />
              <DetailField label="Employment Type" value={selectedVacancy.employmentType} />
              <DetailField label="Location" value={selectedVacancy.location} />
              <DetailField label="Department" value={selectedVacancy.department} />
              <DetailField label="Target Start" value={formatTimelineDate(selectedVacancy.targetStartDate)} />
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <HrFieldLabel>Description</HrFieldLabel>
                <p className="mt-1.5 text-sm leading-relaxed text-white/75">
                  {selectedVacancy.description}
                </p>
              </div>
              <div>
                <HrFieldLabel>Requirements</HrFieldLabel>
                <p className="mt-1.5 text-sm leading-relaxed text-white/75">
                  {selectedVacancy.requirements}
                </p>
              </div>
            </div>
          </HrSection>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <HrSection title="Hiring Dashboard">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Open positions</p>
              <ul className="mt-2 space-y-1.5 text-sm text-white/75">
                {openVacancies.map((vacancy) => (
                  <li key={vacancy.id}>
                    {vacancy.title}
                    <span className="text-white/40"> · {vacancy.location}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Hiring managers</p>
              <ul className="mt-2 space-y-1.5 text-sm text-white/75">
                {[...new Set(openVacancies.map((vacancy) => vacancy.hiringManager))].map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Offer acceptance</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {offers.length + accepted.length === 0
                  ? "—"
                  : `${Math.round((accepted.length / (offers.length + accepted.length)) * 100)}%`}
              </p>
              <p className="text-xs text-white/45">
                {accepted.length} accepted / {offers.length} open offers
              </p>
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                Candidates by department
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-white/75">
                {byDepartment.map(([dept, count]) => (
                  <li key={dept} className="flex justify-between gap-2">
                    <span>{dept}</span>
                    <span className="tabular-nums text-white/45">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </HrSection>

        <HrSection title="Upcoming Interviews" subtitle="Scheduled sessions across all roles.">
          <ul className="space-y-2">
            {upcomingInterviews.length === 0 ? (
              <li className="text-sm text-white/45">No interviews currently scheduled.</li>
            ) : (
              upcomingInterviews.map(({ candidate, interview }) => (
                <li
                  key={interview.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{candidate.name}</p>
                    <p className="text-xs text-white/45">
                      {interviewTypeLabel(interview.type)} · {interview.interviewer}
                    </p>
                    <p className="text-xs text-white/40">
                      {formatInterviewDateTime(interview.scheduledAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={hrSecondaryButtonClass()}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                  >
                    View
                  </button>
                </li>
              ))
            )}
          </ul>
        </HrSection>
      </div>

      {selectedCandidate ? (
        <HrSection
          title={selectedCandidate.name}
          subtitle={`${selectedCandidate.role} · ${selectedCandidate.email}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={hrSecondaryButtonClass()}
                onClick={() => moveCandidateStage(selectedCandidate.id)}
              >
                <MoveRight className="h-3.5 w-3.5" />
                Move stage
              </button>
              <button
                type="button"
                className={hrSecondaryButtonClass()}
                onClick={() => rejectCandidate(selectedCandidate.id)}
              >
                <Ban className="h-3.5 w-3.5" />
                Reject
              </button>
              <button
                type="button"
                className={hrPrimaryButtonClass()}
                onClick={() => offerCandidate(selectedCandidate.id)}
              >
                <Gift className="h-3.5 w-3.5" />
                Send offer
              </button>
            </div>
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <HrStatusPill className={pipelineStageClass(selectedCandidate.stage)}>
              {HR_PIPELINE_STAGE_LABELS[selectedCandidate.stage]}
            </HrStatusPill>
            <span className="text-xs text-white/45">
              {selectedCandidate.location} · Expected {selectedCandidate.expectedSalary}
            </span>
            {selectedCandidate.rating > 0 ? (
              <span className="text-xs tabular-nums text-amber-200/80">
                Rating {selectedCandidate.rating}/5
              </span>
            ) : null}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white">Interview Schedule</h3>
                {selectedCandidate.interviews.length === 0 ? (
                  <p className="mt-2 text-sm text-white/45">No interviews scheduled yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {selectedCandidate.interviews.map((interview) => (
                      <li
                        key={interview.id}
                        className="rounded-xl border border-white/10 px-3 py-2.5 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-white">
                            {interviewTypeLabel(interview.type)}
                          </p>
                          <HrStatusPill className="border-white/15 bg-white/5 text-white/60">
                            {interviewStatusLabel(interview.status)}
                          </HrStatusPill>
                        </div>
                        <p className="mt-1 text-xs text-white/45">{interview.interviewer}</p>
                        <p className="text-xs tabular-nums text-white/40">
                          {formatInterviewDateTime(interview.scheduledAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white">Interview Feedback</h3>
                {selectedCandidate.interviews.filter((i) => i.status === "completed").length === 0 ? (
                  <p className="mt-2 text-sm text-white/45">No completed interview feedback yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {selectedCandidate.interviews
                      .filter((interview) => interview.status === "completed")
                      .map((interview) => (
                        <li
                          key={interview.id}
                          className="rounded-xl border border-white/10 px-3 py-2.5 text-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-white">
                              {interviewTypeLabel(interview.type)}
                            </p>
                            <span className="text-xs text-white/50">
                              {recommendationLabel(interview.recommendation)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-white/45">{interview.interviewer}</p>
                          <p className="mt-2 text-sm text-white/70">
                            {interview.feedback || "No written feedback recorded."}
                          </p>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white">Offer Details</h3>
                <div className="mt-2 rounded-xl border border-white/10 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white">
                      {offerStatusLabel(selectedCandidate.offer.status)}
                    </p>
                    {selectedCandidate.offer.sentAt ? (
                      <p className="text-xs text-white/40">
                        Sent {formatTimelineDate(selectedCandidate.offer.sentAt)}
                      </p>
                    ) : null}
                  </div>
                  {selectedCandidate.offer.status === "none" ? (
                    <p className="mt-2 text-white/45">No offer prepared for this candidate.</p>
                  ) : (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <DetailField label="Salary" value={selectedCandidate.offer.salary || "—"} compact />
                      <DetailField
                        label="Start Date"
                        value={
                          selectedCandidate.offer.startDate
                            ? formatTimelineDate(selectedCandidate.offer.startDate)
                            : "—"
                        }
                        compact
                      />
                      <DetailField
                        label="Employment Type"
                        value={selectedCandidate.offer.employmentType}
                        compact
                      />
                    </div>
                  )}
                  {selectedCandidate.offer.notes ? (
                    <p className="mt-3 text-xs text-white/55">{selectedCandidate.offer.notes}</p>
                  ) : null}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white">Candidate Timeline</h3>
                {selectedCandidate.timeline.length === 0 ? (
                  <p className="mt-2 text-sm text-white/45">No timeline events recorded.</p>
                ) : (
                  <ol className="relative mt-3 space-y-0 border-l border-white/10 pl-4">
                    {[...selectedCandidate.timeline]
                      .sort((a, b) => b.at.localeCompare(a.at))
                      .map((event) => (
                        <li key={event.id} className="relative pb-4 last:pb-0">
                          <span className="absolute -left-[1.3rem] top-1 h-2 w-2 rounded-full bg-sky-400" />
                          <p className="text-sm font-medium text-white">{event.label}</p>
                          <p className="text-xs tabular-nums text-white/40">
                            {formatTimelineDate(event.at)}
                          </p>
                          {event.detail ? (
                            <p className="mt-0.5 text-xs text-white/55">{event.detail}</p>
                          ) : null}
                        </li>
                      ))}
                  </ol>
                )}
              </div>

              {selectedCandidate.notes ? (
                <div>
                  <h3 className="text-sm font-semibold text-white">Recruiter Notes</h3>
                  <p className="mt-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-white/70">
                    {selectedCandidate.notes}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </HrSection>
      ) : null}
    </div>
  );
}

function DetailField({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "rounded-xl border border-white/10 px-3 py-2.5"}>
      <HrFieldLabel>{label}</HrFieldLabel>
      <p className={`${compact ? "mt-1" : "mt-1.5"} text-sm text-white/80`}>{value}</p>
    </div>
  );
}

function CandidateCard({
  candidate,
  selected,
  onOpen,
  onMove,
  onReject,
  onOffer,
}: {
  candidate: HrCandidate;
  selected: boolean;
  onOpen: () => void;
  onMove: () => void;
  onReject: () => void;
  onOffer: () => void;
}) {
  const nextInterview = candidate.interviews.find((interview) => interview.status === "scheduled");

  return (
    <article
      className={`rounded-xl border p-2.5 ${
        selected
          ? "border-sky-400/40 bg-sky-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <button type="button" onClick={onOpen} className="w-full text-left">
        <p className="text-sm font-medium text-white">{candidate.name}</p>
        <p className="text-[11px] text-white/45">{candidate.role}</p>
        <p className="mt-1 text-[11px] text-white/40">{candidate.location}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <HrStatusPill className={pipelineStageClass(candidate.stage)}>
            {HR_PIPELINE_STAGE_LABELS[candidate.stage as HrPipelineStage]}
          </HrStatusPill>
          <span className="text-[11px] tabular-nums text-amber-200/80">
            {candidate.rating > 0 ? `${candidate.rating}/5` : "—"}
          </span>
        </div>
        {nextInterview ? (
          <p className="mt-1 text-[11px] text-white/40">
            Next: {interviewTypeLabel(nextInterview.type)} ·{" "}
            {formatInterviewDateTime(nextInterview.scheduledAt)}
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-white/40">
            {candidate.interviewer} · {candidate.expectedSalary}
          </p>
        )}
      </button>
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" className={hrSecondaryButtonClass()} onClick={onOpen}>
          Open
        </button>
        <button type="button" className={hrSecondaryButtonClass()} onClick={onMove}>
          <MoveRight className="h-3 w-3" />
          Move
        </button>
        <button type="button" className={hrSecondaryButtonClass()} onClick={onReject}>
          <Ban className="h-3 w-3" />
          Reject
        </button>
        <button type="button" className={hrPrimaryButtonClass()} onClick={onOffer}>
          <Gift className="h-3 w-3" />
          Offer
        </button>
        <button type="button" className={hrSecondaryButtonClass()} onClick={onOpen}>
          <CalendarClock className="h-3 w-3" />
          Interview
        </button>
      </div>
    </article>
  );
}
