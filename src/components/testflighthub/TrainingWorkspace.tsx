"use client";

import { useState } from "react";
import { ExternalLink, GraduationCap, Users } from "lucide-react";

import {
  BCD_COURSE_TILES,
  BCD_TRAINING_CLIENTS,
  trainingStatusClass,
  type BcdCourseId,
} from "@/lib/bcd-training-data";
import { cn } from "@/lib/utils";

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
  const [selectedCourse, setSelectedCourse] = useState<BcdCourseId | "all">("all");

  const filteredClients =
    selectedCourse === "all"
      ? BCD_TRAINING_CLIENTS
      : BCD_TRAINING_CLIENTS.filter((client) => client.courseId === selectedCourse);

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
          {selectedCourse !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedCourse("all")}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              Show all courses
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {BCD_COURSE_TILES.map((course) => (
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
