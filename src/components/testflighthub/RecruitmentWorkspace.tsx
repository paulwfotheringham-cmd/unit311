"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Star, X } from "lucide-react";

import {
  HR_CANDIDATE_PANEL_TABS,
  HR_CANDIDATE_SOURCES,
  HR_EMPLOYMENT_TYPES,
  HR_PIPELINE_STAGE_LABELS,
  HR_PIPELINE_STAGES,
  HR_VACANCY_STATUS_LABELS,
  HR_VACANCY_STATUSES,
  emptyInterview,
  emptyOfferDetails,
  endOfWeekIso,
  interviewOutcomeLabel,
  interviewTypeLabel,
  isoDateOnly,
  offerStatusLabel,
  pipelineStageClass,
  recommendationLabel,
  startOfWeekIso,
  type HrCandidate,
  type HrCandidatePanelTab,
  type HrInterview,
  type HrOfferDetails,
  type HrPipelineStage,
  type HrVacancy,
  type HrVacancyStatus,
} from "@/lib/hr-recruitment-data";
import {
  addCandidateInterview,
  appendCandidateTimeline,
  archiveVacancy,
  deleteCandidate,
  deleteVacancy,
  duplicateCandidate,
  duplicateVacancy,
  listHrActivity,
  markCandidateHired,
  moveCandidateStage,
  rejectCandidate,
  saveCandidateOffer,
  updateCandidateInterview,
  upsertCandidate,
  upsertVacancy,
} from "@/lib/hr-mock-store";
import { useHrMockStore } from "./useHrMockStore";
import {
  HrFieldLabel,
  hrInputClass,
  HrKpiTile,
  hrPrimaryButtonClass,
  HrSection,
  hrSecondaryButtonClass,
  HrStatusPill,
} from "./hr-ui";

type VacancyFormState = {
  id?: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  hiringManager: string;
  salaryBand: string;
  description: string;
  closingDate: string;
  status: HrVacancyStatus;
};

type CandidateFormState = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  vacancyId: string;
  location: string;
  expectedSalary: string;
  availability: string;
  source: string;
  notes: string;
};

const emptyVacancyForm = (): VacancyFormState => ({
  title: "",
  department: "Technical",
  location: "Barcelona",
  employmentType: "Full time",
  hiringManager: "",
  salaryBand: "",
  description: "",
  closingDate: isoDateOnly(new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)),
  status: "open",
});

const emptyCandidateForm = (vacancyId = ""): CandidateFormState => ({
  name: "",
  email: "",
  phone: "",
  vacancyId,
  location: "",
  expectedSalary: "",
  availability: "2 weeks notice",
  source: "Careers page",
  notes: "",
});

function formatShortDate(dateKey: string) {
  const value = dateKey.includes("T") ? dateKey : `${dateKey}T12:00:00`;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function stars(rating: number) {
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      className={`h-3 w-3 ${
        index < rating ? "fill-amber-300 text-amber-300" : "text-white/20"
      }`}
    />
  ));
}

export default function RecruitmentWorkspace() {
  const store = useHrMockStore();
  const [search, setSearch] = useState("");
  const [vacancyFilter, setVacancyFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState<HrPipelineStage | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "rejected" | "hired">(
    "active",
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<HrCandidatePanelTab>("Overview");

  const [vacancyModal, setVacancyModal] = useState<VacancyFormState | null>(null);
  const [candidateModal, setCandidateModal] = useState<CandidateFormState | null>(null);
  const [vacancyManageId, setVacancyManageId] = useState<string | null>(null);

  const [interviewDraft, setInterviewDraft] = useState<HrInterview | null>(null);
  const [offerDraft, setOfferDraft] = useState<HrOfferDetails | null>(null);

  const vacancies = store.vacancies;
  const activeVacancies = vacancies.filter((v) => v.status === "open" || v.status === "on_hold");

  const filterOptions = useMemo(() => {
    const departments = [...new Set(vacancies.map((v) => v.department))].sort();
    const locations = [
      ...new Set([
        ...vacancies.map((v) => v.location),
        ...store.candidates.map((c) => c.location),
      ]),
    ].sort();
    const managers = [...new Set(vacancies.map((v) => v.hiringManager))].sort();
    return { departments, locations, managers };
  }, [vacancies, store.candidates]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return store.candidates.filter((candidate) => {
      const vacancy = vacancies.find((v) => v.id === candidate.vacancyId);
      if (vacancyFilter !== "all" && candidate.vacancyId !== vacancyFilter) return false;
      if (departmentFilter !== "all" && candidate.department !== departmentFilter) return false;
      if (locationFilter !== "all" && candidate.location !== locationFilter) return false;
      if (managerFilter !== "all" && vacancy?.hiringManager !== managerFilter) return false;
      if (stageFilter !== "all" && candidate.stage !== stageFilter) return false;
      if (statusFilter === "active" && (candidate.rejected || candidate.stage === "onboarding"))
        return false;
      if (statusFilter === "rejected" && !candidate.rejected) return false;
      if (
        statusFilter === "hired" &&
        !(candidate.stage === "onboarding" || candidate.stage === "accepted")
      )
        return false;
      if (
        q &&
        ![candidate.name, candidate.role, candidate.email, candidate.recruiter, candidate.location]
          .join(" ")
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [
    store.candidates,
    vacancies,
    search,
    vacancyFilter,
    departmentFilter,
    locationFilter,
    managerFilter,
    stageFilter,
    statusFilter,
  ]);

  const boardCandidates = useMemo(
    () => filteredCandidates.filter((c) => !c.rejected),
    [filteredCandidates],
  );

  const selected = store.candidates.find((c) => c.id === selectedId) ?? null;
  const selectedVacancy = selected
    ? vacancies.find((v) => v.id === selected.vacancyId) ?? null
    : null;

  const weekStart = startOfWeekIso();
  const weekEnd = endOfWeekIso();
  const weekStartKey = isoDateOnly(weekStart);
  const weekEndKey = isoDateOnly(weekEnd);
  const monthKey = isoDateOnly(new Date()).slice(0, 7);

  const interviewsThisWeek = store.candidates.flatMap((c) =>
    c.interviews.filter((interview) => {
      const day = interview.scheduledAt.slice(0, 10);
      return day >= weekStartKey && day <= weekEndKey && interview.status !== "cancelled";
    }),
  ).length;

  const offersOutstanding = store.candidates.filter(
    (c) => !c.rejected && (c.stage === "offer" || c.offer.status === "sent" || c.offer.status === "draft"),
  ).length;

  const hiresThisMonth = store.candidates.filter(
    (c) =>
      (c.stage === "onboarding" || c.offer.status === "accepted") &&
      c.appliedAt.slice(0, 7) <= monthKey &&
      (c.offer.sentAt?.slice(0, 7) === monthKey ||
        c.timeline.some(
          (event) =>
            event.at.slice(0, 7) === monthKey &&
            /hire|accepted|onboarding/i.test(`${event.label} ${event.detail}`),
        )),
  ).length;

  const avgTimeToHire = useMemo(() => {
    const hired = store.candidates.filter(
      (c) => c.stage === "onboarding" || c.offer.status === "accepted",
    );
    if (!hired.length) return null;
    const days = hired.map((c) => {
      const applied = new Date(c.appliedAt).getTime();
      const hireEvent = c.timeline.find((e) => /hire|accepted|onboarding/i.test(e.label));
      const end = hireEvent ? new Date(hireEvent.at).getTime() : Date.now();
      return Math.max(1, Math.round((end - applied) / (1000 * 60 * 60 * 24)));
    });
    return Math.round(days.reduce((a, b) => a + b, 0) / days.length);
  }, [store.candidates]);

  const upcomingInterviews = useMemo(() => {
    const now = Date.now() - 1000 * 60 * 60 * 12;
    return store.candidates
      .flatMap((candidate) =>
        candidate.interviews
          .filter((interview) => interview.status === "scheduled")
          .map((interview) => ({ candidate, interview })),
      )
      .filter(({ interview }) => new Date(interview.scheduledAt).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.interview.scheduledAt).getTime() - new Date(b.interview.scheduledAt).getTime(),
      )
      .slice(0, 6);
  }, [store.candidates]);

  const recentHires = store.candidates
    .filter((c) => c.stage === "onboarding" || c.offer.status === "accepted")
    .slice(0, 5);

  const activity = listHrActivity()
    .filter((item) =>
      /vacanc|candidat|hire|interview|offer|recruit|reject|stage/i.test(
        `${item.label} ${item.detail}`,
      ),
    )
    .slice(0, 8);

  function clearFilters() {
    setSearch("");
    setVacancyFilter("all");
    setDepartmentFilter("all");
    setLocationFilter("all");
    setManagerFilter("all");
    setStageFilter("all");
    setStatusFilter("active");
  }

  function openCandidate(id: string, tab: HrCandidatePanelTab = "Overview") {
    setSelectedId(id);
    setPanelTab(tab);
    const candidate = store.candidates.find((c) => c.id === id);
    if (candidate) {
      setOfferDraft({ ...candidate.offer });
      setInterviewDraft(null);
    }
  }

  function saveVacancyForm() {
    if (!vacancyModal?.title.trim()) return;
    const saved = upsertVacancy({
      id: vacancyModal.id,
      title: vacancyModal.title.trim(),
      department: vacancyModal.department,
      location: vacancyModal.location,
      employmentType: vacancyModal.employmentType,
      hiringManager: vacancyModal.hiringManager.trim() || "Hiring Manager",
      salaryBand: vacancyModal.salaryBand,
      description: vacancyModal.description,
      closingDate: vacancyModal.closingDate,
      status: vacancyModal.status,
      targetStartDate: vacancyModal.closingDate,
      requirements: "",
    });
    setVacancyModal(null);
    setVacancyManageId(saved.id);
  }

  function saveCandidateForm() {
    if (!candidateModal?.name.trim() || !candidateModal.vacancyId) return;
    const vacancy = vacancies.find((v) => v.id === candidateModal.vacancyId);
    const saved = upsertCandidate({
      id: candidateModal.id,
      name: candidateModal.name.trim(),
      email: candidateModal.email.trim(),
      phone: candidateModal.phone.trim(),
      vacancyId: candidateModal.vacancyId,
      role: vacancy?.title ?? "Open role",
      department: vacancy?.department ?? "",
      location: candidateModal.location || vacancy?.location || "",
      expectedSalary: candidateModal.expectedSalary,
      availability: candidateModal.availability,
      source: candidateModal.source,
      notes: candidateModal.notes,
      recruiter: vacancy?.hiringManager ?? "",
      interviewer: vacancy?.hiringManager ?? "",
      stage: "applications",
      cvLabel: `${candidateModal.name.trim().replace(/\s+/g, "_")}_CV.pdf`,
    });
    setCandidateModal(null);
    openCandidate(saved.id);
  }

  const manageVacancy = vacancies.find((v) => v.id === vacancyManageId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-end gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={hrPrimaryButtonClass()}
            onClick={() => setVacancyModal(emptyVacancyForm())}
          >
            <Plus className="h-3.5 w-3.5" />
            Create Vacancy
          </button>
          <button
            type="button"
            className={hrSecondaryButtonClass()}
            onClick={() =>
              setCandidateModal(
                emptyCandidateForm(activeVacancies[0]?.id ?? vacancies[0]?.id ?? ""),
              )
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add Candidate
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <HrKpiTile label="Open Vacancies" value={activeVacancies.filter((v) => v.status === "open").length} />
        <HrKpiTile label="Total Candidates" value={store.candidates.length} />
        <HrKpiTile label="Interviews This Week" value={interviewsThisWeek} />
        <HrKpiTile label="Offers Outstanding" value={offersOutstanding} />
        <HrKpiTile label="Hires This Month" value={Math.max(hiresThisMonth, recentHires.length)} />
        <HrKpiTile
          label="Average Time to Hire"
          value={avgTimeToHire != null ? `${avgTimeToHire}d` : "—"}
          hint={avgTimeToHire != null ? "From application to hire" : "No hires yet"}
        />
      </section>

      <HrSection title="Filters" subtitle="Narrow the hiring board.">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(6,minmax(0,1fr))_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <input
              className={`${hrInputClass()} !mt-0 pl-9`}
              placeholder="Search candidates…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className={`${hrInputClass()} !mt-0`}
            value={vacancyFilter}
            onChange={(event) => setVacancyFilter(event.target.value)}
          >
            <option value="all">All vacancies</option>
            {vacancies.map((vacancy) => (
              <option key={vacancy.id} value={vacancy.id}>
                {vacancy.title}
              </option>
            ))}
          </select>
          <select
            className={`${hrInputClass()} !mt-0`}
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="all">All departments</option>
            {filterOptions.departments.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className={`${hrInputClass()} !mt-0`}
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
          >
            <option value="all">All locations</option>
            {filterOptions.locations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className={`${hrInputClass()} !mt-0`}
            value={managerFilter}
            onChange={(event) => setManagerFilter(event.target.value)}
          >
            <option value="all">All hiring managers</option>
            {filterOptions.managers.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            className={`${hrInputClass()} !mt-0`}
            value={stageFilter}
            onChange={(event) =>
              setStageFilter(event.target.value as HrPipelineStage | "all")
            }
          >
            <option value="all">All stages</option>
            {HR_PIPELINE_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {HR_PIPELINE_STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
          <select
            className={`${hrInputClass()} !mt-0`}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as typeof statusFilter)
            }
          >
            <option value="active">Active</option>
            <option value="all">All statuses</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
          <button type="button" className={hrSecondaryButtonClass()} onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </HrSection>

      <HrSection
        title="Vacancies"
        subtitle="Edit, duplicate, archive, or delete open roles."
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {vacancies.map((vacancy) => (
            <div
              key={vacancy.id}
              className={`rounded-xl border px-3 py-3 ${
                vacancyManageId === vacancy.id
                  ? "border-sky-400/40 bg-sky-500/10"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setVacancyManageId(vacancy.id)}
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
                    {HR_VACANCY_STATUS_LABELS[vacancy.status]}
                  </HrStatusPill>
                </div>
                <p className="mt-1 text-xs text-white/45">
                  {vacancy.department} · {vacancy.location}
                </p>
                <p className="mt-1 text-[11px] text-white/40">
                  {vacancy.hiringManager} · {vacancy.salaryBand}
                </p>
              </button>
              {vacancyManageId === vacancy.id ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className={actionClass("sky")}
                    onClick={() =>
                      setVacancyModal({
                        id: vacancy.id,
                        title: vacancy.title,
                        department: vacancy.department,
                        location: vacancy.location,
                        employmentType: vacancy.employmentType,
                        hiringManager: vacancy.hiringManager,
                        salaryBand: vacancy.salaryBand,
                        description: vacancy.description,
                        closingDate: vacancy.closingDate,
                        status: vacancy.status,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={actionClass("violet")}
                    onClick={() => duplicateVacancy(vacancy.id)}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className={actionClass("amber")}
                    onClick={() => archiveVacancy(vacancy.id)}
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    className={actionClass("rose")}
                    onClick={() => {
                      deleteVacancy(vacancy.id);
                      setVacancyManageId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {manageVacancy ? (
          <p className="mt-3 text-xs text-white/40">
            Selected: {manageVacancy.title} · closes {formatShortDate(manageVacancy.closingDate)}
          </p>
        ) : null}
      </HrSection>

      <HrSection title="Hiring Board" subtitle="Move candidates through each stage from the details panel.">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {HR_PIPELINE_STAGES.map((stage) => {
            const cards = boardCandidates.filter((candidate) => candidate.stage === stage);
            return (
              <div
                key={stage}
                className="min-w-[15.5rem] max-w-[15.5rem] shrink-0 rounded-2xl border border-white/10 bg-[#0b1524]/60 p-3"
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
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => openCandidate(candidate.id)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        selectedId === candidate.id
                          ? "border-sky-400/45 bg-sky-500/10"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{candidate.name}</p>
                      <p className="mt-0.5 truncate text-xs text-white/50">{candidate.role}</p>
                      <p className="mt-1 text-[11px] text-white/40">{candidate.location}</p>
                      <div className="mt-2 flex items-center gap-1">{stars(candidate.rating)}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <HrStatusPill className={pipelineStageClass(candidate.stage)}>
                          {HR_PIPELINE_STAGE_LABELS[candidate.stage]}
                        </HrStatusPill>
                        <span className="text-[10px] tabular-nums text-white/35">
                          {formatShortDate(candidate.appliedAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-[11px] text-white/40">
                        Recruiter · {candidate.recruiter || "Unassigned"}
                      </p>
                    </button>
                  ))}
                  {cards.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 px-2 py-8 text-center text-xs text-white/35">
                      No candidates
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </HrSection>

      <div className="grid gap-5 xl:grid-cols-3">
        <HrSection title="Upcoming Interviews" subtitle="Scheduled conversations this period.">
          <ul className="space-y-2">
            {upcomingInterviews.length === 0 ? (
              <li className="text-sm text-white/45">No upcoming interviews.</li>
            ) : (
              upcomingInterviews.map(({ candidate, interview }) => (
                <li key={`${candidate.id}-${interview.id}`}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left hover:bg-white/[0.05]"
                    onClick={() => openCandidate(candidate.id, "Interview Notes")}
                  >
                    <p className="text-sm font-medium text-white">{candidate.name}</p>
                    <p className="text-xs text-white/45">
                      {interviewTypeLabel(interview.type)} · {formatDateTime(interview.scheduledAt)}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </HrSection>

        <HrSection title="Recent Recruitment Activity" subtitle="Hiring operations trail.">
          <ul className="space-y-2">
            {activity.length === 0 ? (
              <li className="text-sm text-white/45">No recent recruitment activity.</li>
            ) : (
              activity.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
                >
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-white/45">{item.detail}</p>
                </li>
              ))
            )}
          </ul>
        </HrSection>

        <HrSection title="Recent Hires" subtitle="Accepted offers and onboarding.">
          <ul className="space-y-2">
            {recentHires.length === 0 ? (
              <li className="text-sm text-white/45">No recent hires.</li>
            ) : (
              recentHires.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left hover:bg-white/[0.05]"
                    onClick={() => openCandidate(candidate.id)}
                  >
                    <p className="text-sm font-medium text-white">{candidate.name}</p>
                    <p className="text-xs text-white/45">
                      {candidate.role} · {candidate.location}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </HrSection>
      </div>

      {selected ? (
        <CandidateSlideOver
          candidate={selected}
          vacancy={selectedVacancy}
          tab={panelTab}
          onTab={setPanelTab}
          onClose={() => setSelectedId(null)}
          interviewDraft={interviewDraft}
          setInterviewDraft={setInterviewDraft}
          offerDraft={offerDraft}
          setOfferDraft={setOfferDraft}
          onEdit={() =>
            setCandidateModal({
              id: selected.id,
              name: selected.name,
              email: selected.email,
              phone: selected.phone,
              vacancyId: selected.vacancyId,
              location: selected.location,
              expectedSalary: selected.expectedSalary,
              availability: selected.availability,
              source: selected.source,
              notes: selected.notes,
            })
          }
          onOpenCandidate={openCandidate}
        />
      ) : null}

      {vacancyModal ? (
        <Modal title={vacancyModal.id ? "Edit Vacancy" : "Create Vacancy"} onClose={() => setVacancyModal(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Job Title">
              <input
                className={hrInputClass()}
                value={vacancyModal.title}
                onChange={(e) => setVacancyModal({ ...vacancyModal, title: e.target.value })}
              />
            </Field>
            <Field label="Department">
              <input
                className={hrInputClass()}
                value={vacancyModal.department}
                onChange={(e) => setVacancyModal({ ...vacancyModal, department: e.target.value })}
              />
            </Field>
            <Field label="Location">
              <input
                className={hrInputClass()}
                value={vacancyModal.location}
                onChange={(e) => setVacancyModal({ ...vacancyModal, location: e.target.value })}
              />
            </Field>
            <Field label="Employment Type">
              <select
                className={hrInputClass()}
                value={vacancyModal.employmentType}
                onChange={(e) =>
                  setVacancyModal({ ...vacancyModal, employmentType: e.target.value })
                }
              >
                {HR_EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hiring Manager">
              <input
                className={hrInputClass()}
                value={vacancyModal.hiringManager}
                onChange={(e) =>
                  setVacancyModal({ ...vacancyModal, hiringManager: e.target.value })
                }
              />
            </Field>
            <Field label="Salary Range">
              <input
                className={hrInputClass()}
                value={vacancyModal.salaryBand}
                onChange={(e) => setVacancyModal({ ...vacancyModal, salaryBand: e.target.value })}
              />
            </Field>
            <Field label="Closing Date">
              <input
                type="date"
                className={hrInputClass()}
                value={vacancyModal.closingDate}
                onChange={(e) => setVacancyModal({ ...vacancyModal, closingDate: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <select
                className={hrInputClass()}
                value={vacancyModal.status}
                onChange={(e) =>
                  setVacancyModal({
                    ...vacancyModal,
                    status: e.target.value as HrVacancyStatus,
                  })
                }
              >
                {HR_VACANCY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {HR_VACANCY_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea
                  className={hrInputClass()}
                  rows={4}
                  value={vacancyModal.description}
                  onChange={(e) =>
                    setVacancyModal({ ...vacancyModal, description: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={hrSecondaryButtonClass()} onClick={() => setVacancyModal(null)}>
              Cancel
            </button>
            <button type="button" className={hrPrimaryButtonClass()} onClick={saveVacancyForm}>
              Save
            </button>
          </div>
        </Modal>
      ) : null}

      {candidateModal ? (
        <Modal title={candidateModal.id ? "Edit Candidate" : "Add Candidate"} onClose={() => setCandidateModal(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                className={hrInputClass()}
                value={candidateModal.name}
                onChange={(e) => setCandidateModal({ ...candidateModal, name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className={hrInputClass()}
                value={candidateModal.email}
                onChange={(e) => setCandidateModal({ ...candidateModal, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <input
                className={hrInputClass()}
                value={candidateModal.phone}
                onChange={(e) => setCandidateModal({ ...candidateModal, phone: e.target.value })}
              />
            </Field>
            <Field label="Role Applied For">
              <select
                className={hrInputClass()}
                value={candidateModal.vacancyId}
                onChange={(e) =>
                  setCandidateModal({ ...candidateModal, vacancyId: e.target.value })
                }
              >
                {vacancies.map((vacancy) => (
                  <option key={vacancy.id} value={vacancy.id}>
                    {vacancy.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <input
                className={hrInputClass()}
                value={candidateModal.location}
                onChange={(e) =>
                  setCandidateModal({ ...candidateModal, location: e.target.value })
                }
              />
            </Field>
            <Field label="Salary Expectation">
              <input
                className={hrInputClass()}
                value={candidateModal.expectedSalary}
                onChange={(e) =>
                  setCandidateModal({ ...candidateModal, expectedSalary: e.target.value })
                }
              />
            </Field>
            <Field label="Availability">
              <input
                className={hrInputClass()}
                value={candidateModal.availability}
                onChange={(e) =>
                  setCandidateModal({ ...candidateModal, availability: e.target.value })
                }
              />
            </Field>
            <Field label="Source">
              <select
                className={hrInputClass()}
                value={candidateModal.source}
                onChange={(e) => setCandidateModal({ ...candidateModal, source: e.target.value })}
              >
                {HR_CANDIDATE_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="CV Upload">
                <div className="mt-1.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-4 text-sm text-white/45">
                  Attach a CV to this application. Demo file reference:{" "}
                  <span className="text-white/70">
                    {candidateModal.name
                      ? `${candidateModal.name.replace(/\s+/g, "_")}_CV.pdf`
                      : "Candidate_CV.pdf"}
                  </span>
                </div>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea
                  className={hrInputClass()}
                  rows={3}
                  value={candidateModal.notes}
                  onChange={(e) => setCandidateModal({ ...candidateModal, notes: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={hrSecondaryButtonClass()}
              onClick={() => setCandidateModal(null)}
            >
              Cancel
            </button>
            <button type="button" className={hrPrimaryButtonClass()} onClick={saveCandidateForm}>
              {candidateModal.id ? "Save" : "Create"}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function actionClass(tone: "sky" | "violet" | "amber" | "rose" | "emerald") {
  const map = {
    sky: "border-sky-400/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25",
    violet: "border-violet-400/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
    amber: "border-amber-400/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25",
    rose: "border-rose-400/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
    emerald: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25",
  } as const;
  return `inline-flex h-8 items-center rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${map[tone]}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <HrFieldLabel>{label}</HrFieldLabel>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0b1524] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            type="button"
            className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:bg-white/5 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CandidateSlideOver({
  candidate,
  vacancy,
  tab,
  onTab,
  onClose,
  interviewDraft,
  setInterviewDraft,
  offerDraft,
  setOfferDraft,
  onEdit,
  onOpenCandidate,
}: {
  candidate: HrCandidate;
  vacancy: HrVacancy | null;
  tab: HrCandidatePanelTab;
  onTab: (tab: HrCandidatePanelTab) => void;
  onClose: () => void;
  interviewDraft: HrInterview | null;
  setInterviewDraft: (value: HrInterview | null) => void;
  offerDraft: HrOfferDetails | null;
  setOfferDraft: (value: HrOfferDetails | null) => void;
  onEdit: () => void;
  onOpenCandidate: (id: string, tab?: HrCandidatePanelTab) => void;
}) {
  const offer = offerDraft ?? candidate.offer;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <button type="button" className="flex-1" aria-label="Close panel" onClick={onClose} />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-white/15 bg-[#0b1524] shadow-[-24px_0_64px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">{candidate.name}</h3>
              <p className="mt-1 text-sm text-white/50">
                {candidate.role} · {candidate.location}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <HrStatusPill className={pipelineStageClass(candidate.stage)}>
                  {HR_PIPELINE_STAGE_LABELS[candidate.stage]}
                </HrStatusPill>
                {candidate.rejected ? (
                  <HrStatusPill className="border-rose-400/30 bg-rose-500/15 text-rose-200">
                    Rejected
                  </HrStatusPill>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:bg-white/5"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {HR_CANDIDATE_PANEL_TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onTab(item)}
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
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "Overview" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Email" value={candidate.email} />
              <Info label="Phone" value={candidate.phone || "—"} />
              <Info label="Department" value={candidate.department} />
              <Info label="Hiring manager" value={vacancy?.hiringManager ?? "—"} />
              <Info label="Recruiter" value={candidate.recruiter || "—"} />
              <Info label="Source" value={candidate.source || "—"} />
              <Info label="Salary expectation" value={candidate.expectedSalary || "—"} />
              <Info label="Availability" value={candidate.availability || "—"} />
              <Info label="Applied" value={formatShortDate(candidate.appliedAt)} />
              <Info label="Rating" value={<span className="inline-flex gap-0.5">{stars(candidate.rating)}</span>} />
              <div className="sm:col-span-2">
                <Info label="Notes" value={candidate.notes || "No notes yet."} />
              </div>
              {vacancy ? (
                <div className="sm:col-span-2 rounded-xl border border-white/10 p-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Vacancy</p>
                  <p className="mt-1 text-sm font-medium text-white">{vacancy.title}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {vacancy.salaryBand} · {vacancy.employmentType} · closes{" "}
                    {formatShortDate(vacancy.closingDate)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "CV" ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center">
              <p className="text-sm font-medium text-white">{candidate.cvLabel || "CV.pdf"}</p>
              <p className="mt-2 text-sm text-white/45">
                CV on file for this candidate. Open or replace the document from Actions when file
                storage is linked to this record.
              </p>
            </div>
          ) : null}

          {tab === "Interview Notes" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={hrPrimaryButtonClass()}
                  onClick={() =>
                    setInterviewDraft(
                      emptyInterview({
                        interviewer: candidate.recruiter || candidate.interviewer,
                        interviewers: candidate.recruiter || candidate.interviewer,
                        scheduledAt: new Date().toISOString().slice(0, 16),
                      }),
                    )
                  }
                >
                  Schedule / Record Interview
                </button>
              </div>
              {interviewDraft ? (
                <InterviewForm
                  interview={interviewDraft}
                  onChange={setInterviewDraft}
                  onCancel={() => setInterviewDraft(null)}
                  onSave={() => {
                    const existing = candidate.interviews.some((i) => i.id === interviewDraft.id);
                    if (existing) updateCandidateInterview(candidate.id, interviewDraft);
                    else addCandidateInterview(candidate.id, interviewDraft);
                    appendCandidateTimeline(
                      candidate.id,
                      interviewDraft.status === "completed"
                        ? "Interview recorded"
                        : "Interview scheduled",
                      `${interviewTypeLabel(interviewDraft.type)} · ${interviewDraft.interviewers || interviewDraft.interviewer}`,
                    );
                    if (interviewDraft.status === "scheduled" && candidate.stage !== "interview") {
                      moveCandidateStage(candidate.id, "interview");
                    }
                    setInterviewDraft(null);
                  }}
                />
              ) : null}
              <div className="space-y-2">
                {candidate.interviews.length === 0 ? (
                  <p className="text-sm text-white/45">No interviews recorded yet.</p>
                ) : (
                  candidate.interviews.map((interview) => (
                    <button
                      key={interview.id}
                      type="button"
                      className="w-full rounded-xl border border-white/10 px-3 py-3 text-left hover:bg-white/[0.04]"
                      onClick={() => setInterviewDraft({ ...interview })}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {interviewTypeLabel(interview.type)}
                          </p>
                          <p className="text-xs text-white/45">
                            {formatDateTime(interview.scheduledAt)} ·{" "}
                            {interview.interviewers || interview.interviewer}
                          </p>
                        </div>
                        <HrStatusPill className="border-white/15 bg-white/5 text-white/60">
                          {interview.status}
                        </HrStatusPill>
                      </div>
                      <p className="mt-2 text-xs text-white/45">
                        Outcome: {interviewOutcomeLabel(interview.outcome)} · Recommendation:{" "}
                        {recommendationLabel(interview.recommendation)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {tab === "Feedback" ? (
            <div className="space-y-3">
              {candidate.interviews.filter((i) => i.status === "completed").length === 0 ? (
                <p className="text-sm text-white/45">No interview feedback yet.</p>
              ) : (
                candidate.interviews
                  .filter((i) => i.status === "completed")
                  .map((interview) => (
                    <div key={interview.id} className="rounded-xl border border-white/10 p-3">
                      <p className="text-sm font-medium text-white">
                        {interview.interviewers || interview.interviewer}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        Rating {interview.rating ?? "—"}/5 · {recommendationLabel(interview.recommendation)}
                      </p>
                      <p className="mt-2 text-sm text-white/70">
                        <span className="text-white/40">Strengths: </span>
                        {interview.strengths || "—"}
                      </p>
                      <p className="mt-1 text-sm text-white/70">
                        <span className="text-white/40">Weaknesses: </span>
                        {interview.weaknesses || "—"}
                      </p>
                      <p className="mt-1 text-sm text-white/70">{interview.feedback || interview.notes}</p>
                    </div>
                  ))
              )}
            </div>
          ) : null}

          {tab === "Offer" ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Salary">
                  <input
                    className={hrInputClass()}
                    value={offer.salary}
                    onChange={(e) => setOfferDraft({ ...offer, salary: e.target.value })}
                  />
                </Field>
                <Field label="Start Date">
                  <input
                    type="date"
                    className={hrInputClass()}
                    value={offer.startDate}
                    onChange={(e) => setOfferDraft({ ...offer, startDate: e.target.value })}
                  />
                </Field>
                <Field label="Employment Type">
                  <select
                    className={hrInputClass()}
                    value={offer.employmentType}
                    onChange={(e) =>
                      setOfferDraft({ ...offer, employmentType: e.target.value })
                    }
                  >
                    {HR_EMPLOYMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    className={hrInputClass()}
                    value={offer.status}
                    onChange={(e) =>
                      setOfferDraft({
                        ...offer,
                        status: e.target.value as HrOfferDetails["status"],
                      })
                    }
                  >
                    {(["none", "draft", "sent", "accepted", "declined", "withdrawn"] as const).map(
                      (status) => (
                        <option key={status} value={status}>
                          {offerStatusLabel(status)}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Notes">
                    <textarea
                      className={hrInputClass()}
                      rows={3}
                      value={offer.notes}
                      onChange={(e) => setOfferDraft({ ...offer, notes: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={hrPrimaryButtonClass()}
                  onClick={() => {
                    const next = {
                      ...offer,
                      sentAt:
                        offer.status === "sent" || offer.status === "accepted"
                          ? offer.sentAt ?? isoDateOnly(new Date())
                          : offer.sentAt,
                    };
                    saveCandidateOffer(candidate.id, next);
                    if (next.status === "sent" || next.status === "draft") {
                      moveCandidateStage(candidate.id, "offer");
                    }
                    if (next.status === "accepted") {
                      moveCandidateStage(candidate.id, "accepted");
                    }
                    appendCandidateTimeline(
                      candidate.id,
                      `Offer ${offerStatusLabel(next.status).toLowerCase()}`,
                      next.salary || "Offer updated",
                    );
                    setOfferDraft(next);
                  }}
                >
                  Save Offer
                </button>
              </div>
            </div>
          ) : null}

          {tab === "Timeline" ? (
            <ul className="space-y-2">
              {[...candidate.timeline]
                .sort((a, b) => b.at.localeCompare(a.at))
                .map((event) => (
                  <li key={event.id} className="rounded-xl border border-white/10 px-3 py-2.5">
                    <p className="text-sm font-medium text-white">{event.label}</p>
                    <p className="text-xs text-white/45">
                      {formatShortDate(event.at)}
                      {event.detail ? ` · ${event.detail}` : ""}
                    </p>
                  </li>
                ))}
            </ul>
          ) : null}

          {tab === "Actions" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" className={hrSecondaryButtonClass()} onClick={onEdit}>
                Edit
              </button>
              <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/75">
                Move Stage
                <select
                  className="bg-transparent text-white outline-none"
                  value={candidate.stage}
                  onChange={(e) =>
                    moveCandidateStage(candidate.id, e.target.value as HrPipelineStage)
                  }
                >
                  {HR_PIPELINE_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {HR_PIPELINE_STAGE_LABELS[stage]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={hrPrimaryButtonClass()}
                onClick={() => {
                  onTab("Interview Notes");
                  setInterviewDraft(
                    emptyInterview({
                      interviewer: candidate.recruiter || candidate.interviewer,
                      interviewers: candidate.recruiter || candidate.interviewer,
                    }),
                  );
                }}
              >
                Schedule Interview
              </button>
              <button
                type="button"
                className={hrSecondaryButtonClass()}
                onClick={() => {
                  onTab("Interview Notes");
                  setInterviewDraft(
                    emptyInterview({
                      status: "completed",
                      outcome: "pass",
                      interviewer: candidate.recruiter || candidate.interviewer,
                      interviewers: candidate.recruiter || candidate.interviewer,
                    }),
                  );
                }}
              >
                Record Interview
              </button>
              <button
                type="button"
                className={hrSecondaryButtonClass()}
                onClick={() => {
                  onTab("Offer");
                  setOfferDraft({
                    ...emptyOfferDetails(),
                    ...candidate.offer,
                    status: candidate.offer.status === "none" ? "draft" : candidate.offer.status,
                    employmentType: vacancy?.employmentType ?? "Full time",
                  });
                }}
              >
                Create Offer
              </button>
              <button
                type="button"
                className={actionClass("emerald")}
                onClick={() => markCandidateHired(candidate.id)}
              >
                Mark Hired
              </button>
              <button
                type="button"
                className={actionClass("rose")}
                onClick={() => rejectCandidate(candidate.id)}
              >
                Reject
              </button>
              <button
                type="button"
                className={actionClass("violet")}
                onClick={() => {
                  const copy = duplicateCandidate(candidate.id);
                  if (copy) onOpenCandidate(copy.id);
                }}
              >
                Duplicate
              </button>
              <button
                type="button"
                className={actionClass("rose")}
                onClick={() => {
                  deleteCandidate(candidate.id);
                  onClose();
                }}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function InterviewForm({
  interview,
  onChange,
  onSave,
  onCancel,
}: {
  interview: HrInterview;
  onChange: (value: HrInterview) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Interview Date">
          <input
            type="datetime-local"
            className={hrInputClass()}
            value={interview.scheduledAt.slice(0, 16)}
            onChange={(e) => onChange({ ...interview, scheduledAt: e.target.value })}
          />
        </Field>
        <Field label="Interviewers">
          <input
            className={hrInputClass()}
            value={interview.interviewers || interview.interviewer}
            onChange={(e) =>
              onChange({
                ...interview,
                interviewers: e.target.value,
                interviewer: e.target.value,
              })
            }
          />
        </Field>
        <Field label="Type">
          <select
            className={hrInputClass()}
            value={interview.type}
            onChange={(e) =>
              onChange({
                ...interview,
                type: e.target.value as HrInterview["type"],
              })
            }
          >
            <option value="phone">Phone</option>
            <option value="video">Video</option>
            <option value="onsite">On-site</option>
            <option value="panel">Panel</option>
          </select>
        </Field>
        <Field label="Outcome">
          <select
            className={hrInputClass()}
            value={interview.outcome}
            onChange={(e) =>
              onChange({
                ...interview,
                outcome: e.target.value as HrInterview["outcome"],
                status:
                  e.target.value === "pending" ? interview.status : "completed",
              })
            }
          >
            <option value="pending">Pending</option>
            <option value="pass">Pass</option>
            <option value="hold">Hold</option>
            <option value="fail">Fail</option>
          </select>
        </Field>
        <Field label="Rating (1–5)">
          <select
            className={hrInputClass()}
            value={interview.rating ?? ""}
            onChange={(e) =>
              onChange({
                ...interview,
                rating: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Not rated</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Recommendation">
          <select
            className={hrInputClass()}
            value={interview.recommendation ?? ""}
            onChange={(e) =>
              onChange({
                ...interview,
                recommendation: (e.target.value || null) as HrInterview["recommendation"],
              })
            }
          >
            <option value="">Not set</option>
            <option value="strong_yes">Strong yes</option>
            <option value="yes">Yes</option>
            <option value="neutral">Neutral</option>
            <option value="no">No</option>
            <option value="strong_no">Strong no</option>
          </select>
        </Field>
        <Field label="Strengths">
          <textarea
            className={hrInputClass()}
            rows={2}
            value={interview.strengths}
            onChange={(e) => onChange({ ...interview, strengths: e.target.value })}
          />
        </Field>
        <Field label="Weaknesses">
          <textarea
            className={hrInputClass()}
            rows={2}
            value={interview.weaknesses}
            onChange={(e) => onChange({ ...interview, weaknesses: e.target.value })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <textarea
              className={hrInputClass()}
              rows={3}
              value={interview.notes || interview.feedback}
              onChange={(e) =>
                onChange({ ...interview, notes: e.target.value, feedback: e.target.value })
              }
            />
          </Field>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className={hrSecondaryButtonClass()} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={hrPrimaryButtonClass()} onClick={onSave}>
          Save Interview
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">{label}</p>
      <div className="mt-1 text-sm text-white/80">{value}</div>
    </div>
  );
}
