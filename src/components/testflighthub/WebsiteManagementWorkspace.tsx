"use client";

import { Globe } from "lucide-react";

export default function WebsiteManagementWorkspace() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Globe className="h-5 w-5 text-sky-300" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Website Management</h1>
          <p className="text-sm text-white/55">Manage public site content, pages, and publishing.</p>
        </div>
      </div>
    </section>
  );
}
