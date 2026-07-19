"use client";

import { UserCircle2 } from "lucide-react";

export default function ProfileWorkspace() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#0a1422]/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/10">
            <UserCircle2 className="h-5 w-5 text-sky-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Profile</h2>
            <p className="text-sm text-white/55">Your Unit311 Central operator profile and preferences.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Name</p>
          <p className="mt-2 text-white">Operator</p>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Email</p>
          <p className="mt-2 text-white">info@unit311central.com</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Role</p>
          <p className="mt-2 text-white">Internal operator</p>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Workspace</p>
          <p className="mt-2 text-white">Unit311 Central dashboard</p>
        </div>
      </section>
    </div>
  );
}

