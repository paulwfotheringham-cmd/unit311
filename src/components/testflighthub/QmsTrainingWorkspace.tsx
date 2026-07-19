"use client";

import { QMS_TRAINING_COURSES } from "@/lib/qms-modules-data";
import { GraduationCap } from "lucide-react";

export default function QmsTrainingWorkspace() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#0a1422]/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10">
            <GraduationCap className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">QMS Training</h2>
            <p className="text-sm text-white/55">
              Quality management training paths for operators and auditors.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {QMS_TRAINING_COURSES.map((course) => (
          <article
            key={course.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h3 className="text-base font-semibold text-white">{course.title}</h3>
            <p className="mt-2 text-sm text-white/55">{course.duration}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-500"
                style={{ width: `${course.progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/45">{course.progress}% complete</p>
          </article>
        ))}
      </div>
    </div>
  );
}

