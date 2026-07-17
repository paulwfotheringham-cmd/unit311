"use client";

import { Wrench } from "lucide-react";

export default function EngineeringWorkspace() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Wrench className="h-5 w-5 text-sky-300" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Engineering</h1>
          <p className="text-sm text-white/55">Technical delivery, systems, and implementation workspace.</p>
        </div>
      </div>
    </section>
  );
}
