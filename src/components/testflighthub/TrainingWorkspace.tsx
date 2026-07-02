"use client";

import { useMemo, useState } from "react";
import { ExternalLink, GraduationCap, Plus, Users, X } from "lucide-react";

import {
  BCD_COURSE_TILES,
  BCD_TRAINING_CLIENTS,
  trainingStatusClass,
  type BcdCourseId,
  type BcdCourseTile,
  type BcdTrainingClient,
} from "@/lib/bcd-training-data";
import { createInitialUsers, type ManagedUser } from "@/lib/user-management-data";
import { cn } from "@/lib/utils";

const TRAINING_TYPES: { value: BcdCourseId; label: string }[] = [
  { value: "uas-applications", label: "UAS Applications" },
  { value: "sora-regulatory", label: "Regulatory & SORA" },
  { value: "design-construction", label: "Design & Construction" },
  { value: "integrated-pilot", label: "Integrated Pilot" },
  { value: "operational-authorisation", label: "Operational Authorisation" },
  { value: "radiophonist", label: "Radiophonist" },
  { value: "geo-zones", label: "Geographical Zones" },
  { value: "customized", label: "Customized" },
];

const MOCK_USERS = createInitialUsers();

type TrainingDraft = {
  title: string;
  type: BcdCourseId;
  client: string;
  userIds: string[];
  startDate: string;
  endDate: string;
};

function blankDraft(): TrainingDraft {
  return {
    title: "",
    type: "customized",
    client: "",
    userIds: [],
    startDate: "",
    endDate: "",
  };
}

function formatEditionRange(startDate: string, endDate: string) {
  if (!startDate && !endDate) return "On demand";
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const fmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  }
  if (startDate) {
    const start = new Date(startDate);
    const fmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
    return `From ${fmt.format(start)}`;
  }
  return "On demand";
}

function inputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50 placeholder:text-white/30";
}

function CourseTile({
  title,
  edition,
  description,
  accent,
  enrolled,
  selected,
  onSelect,
}: {
  title: string;
  edition: string;
  description: string;
  accent: string;
  enrolled: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex h-full flex-col rounded-xl border bg-gradient-to-br p-4 text-left transition-all",
        accent,
        selected
          ? "ring-2 ring-sky-400/60 ring-offset-1 ring-offset-[#020617]"
          : "hover:brightness-110",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <GraduationCap className="h-4 w-4 shrink-0 text-white/50" />
        <span className="rounded-full border border-white/15 bg-black/20 px-2 py-0.5 text-[10px] text-white/55">
          {enrolled} enrolled
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold leading-snug text-white">{title}</h3>
      <p className="mt-1 text-[11px] font-medium text-sky-300/90">{edition}</p>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-white/50">{description}</p>
    </button>
  );
}

export default function TrainingWorkspace() {
  const [courses, setCourses] = useState<BcdCourseTile[]>(() => [...BCD_COURSE_TILES]);
  const [clients, setClients] = useState<BcdTrainingClient[]>(() => [...BCD_TRAINING_CLIENTS]);
  const [selectedCourse, setSelectedCourse] = useState<string | "all">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [draft, setDraft] = useState<TrainingDraft>(blankDraft);

  const filteredClients = useMemo(
    () =>
      selectedCourse === "all"
        ? clients
        : clients.filter((client) => client.courseId === selectedCourse),
    [clients, selectedCourse],
  );

  const selectedUsers = MOCK_USERS.filter((user) => draft.userIds.includes(user.id));

  function toggleDraftUser(userId: string) {
    setDraft((current) => ({
      ...current,
      userIds: current.userIds.includes(userId)
        ? current.userIds.filter((id) => id !== userId)
        : [...current.userIds, userId],
    }));
  }

  function handleAddTraining(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.client.trim() || draft.userIds.length === 0) return;

    const courseId = `training-${Date.now()}` as BcdCourseId;
    const edition = formatEditionRange(draft.startDate, draft.endDate);
    const typeLabel = TRAINING_TYPES.find((entry) => entry.value === draft.type)?.label ?? draft.type;

    const newCourse: BcdCourseTile = {
      id: courseId,
      title: draft.title.trim(),
      edition,
      description: `${typeLabel} programme for ${draft.client.trim()}.`,
      accent: "from-violet-500/20 to-purple-600/10 border-violet-400/30",
      enrolled: draft.userIds.length,
    };

    const newClients: BcdTrainingClient[] = draft.userIds.map((userId, index) => {
      const user = MOCK_USERS.find((entry) => entry.id === userId);
      return {
        id: `train-new-${Date.now()}-${index}`,
        name: user?.fullName ?? "Participant",
        organisation: draft.client.trim(),
        country: user?.region ?? "—",
        courseId,
        courseLabel: draft.title.trim(),
        edition,
        status: "Confirmed" as const,
        email: user?.email ?? "",
      };
    });

    setCourses((current) => [...current, newCourse]);
    setClients((current) => [...current, ...newClients]);
    setSelectedCourse(courseId);
    setDraft(blankDraft());
    setShowAddForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:px-5">
        <p className="text-sm text-white/60">
          Training programmes aligned with{" "}
          <a
            href="https://www.unit311.com/drone-courses/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300"
          >
            Unit311 courses
            <ExternalLink className="h-3 w-3" />
          </a>
          . Select a course tile to filter enrolled participants.
        </p>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Course catalogue
          </h2>
          <div className="flex items-center gap-3">
            {selectedCourse !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedCourse("all")}
                className="text-xs text-sky-400 hover:text-sky-300"
              >
                Show all courses
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddForm((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 px-2.5 py-1.5 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25"
            >
              {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showAddForm ? "Cancel" : "Add training"}
            </button>
          </div>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddTraining}
            className="mb-4 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.015] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.22)] sm:p-5"
          >
            <h3 className="text-sm font-semibold text-white">New training programme</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  Title
                </label>
                <input
                  required
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Course title"
                  className={inputClassName()}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  Type
                </label>
                <select
                  value={draft.type}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      type: event.target.value as BcdCourseId,
                    }))
                  }
                  className={inputClassName()}
                >
                  {TRAINING_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  Client
                </label>
                <input
                  required
                  value={draft.client}
                  onChange={(event) => setDraft((current) => ({ ...current, client: event.target.value }))}
                  placeholder="Organisation name"
                  className={inputClassName()}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  Start date
                </label>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, startDate: event.target.value }))
                  }
                  className={inputClassName()}
                />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  End date
                </label>
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, endDate: event.target.value }))
                  }
                  className={inputClassName()}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
                  Users
                </label>
                <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-[#0b1524] p-2">
                  {MOCK_USERS.map((user: ManagedUser) => {
                    const selected = draft.userIds.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleDraftUser(user.id)}
                          className="h-4 w-4 rounded border-white/20 bg-transparent accent-sky-500"
                        />
                        <span className="text-white/85">{user.fullName}</span>
                        <span className="text-xs text-white/40">{user.email}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedUsers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedUsers.map((user) => (
                      <span
                        key={user.id}
                        className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-200"
                      >
                        {user.fullName}
                        <button
                          type="button"
                          onClick={() => toggleDraftUser(user.id)}
                          className="text-sky-300/70 hover:text-white"
                          aria-label={`Remove ${user.fullName}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={!draft.title.trim() || !draft.client.trim() || draft.userIds.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300 transition-colors hover:border-sky-400/60 hover:bg-sky-500/25 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add to catalogue
              </button>
            </div>
          </form>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {courses.map((course) => (
            <CourseTile
              key={course.id}
              title={course.title}
              edition={course.edition}
              description={course.description}
              accent={course.accent}
              enrolled={course.enrolled}
              selected={selectedCourse === course.id}
              onSelect={() =>
                setSelectedCourse((current) => (current === course.id ? "all" : course.id))
              }
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.015] shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-white/40" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Enrolled participants ({filteredClients.length})
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
                <th className="px-4 py-2.5 font-medium">Participant</th>
                <th className="px-4 py-2.5 font-medium">Organisation</th>
                <th className="px-4 py-2.5 font-medium">Country</th>
                <th className="px-4 py-2.5 font-medium">Course</th>
                <th className="px-4 py-2.5 font-medium">Edition</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id} className="border-b border-white/[0.05] last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-white/90">{client.name}</div>
                    <div className="text-xs text-white/40">{client.email}</div>
                  </td>
                  <td className="px-4 py-2.5 text-white/65">{client.organisation}</td>
                  <td className="px-4 py-2.5 text-white/55">{client.country}</td>
                  <td className="px-4 py-2.5 text-white/75">{client.courseLabel}</td>
                  <td className="px-4 py-2.5 text-white/50">{client.edition}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        trainingStatusClass(client.status),
                      )}
                    >
                      {client.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
