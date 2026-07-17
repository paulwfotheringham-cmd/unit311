"use client";

import { startTransition, useEffect, useState } from "react";

import WorkspaceDemoLoopVideo from "@/components/home/WorkspaceDemoLoopVideo";
import { X } from "lucide-react";

const STORAGE_KEY = "unit311-dashboard-welcome-video-dismissed";

export default function DashboardWelcomeVideoModal() {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    startTransition(() => {
      try {
        const dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
        if (!dismissed) setOpen(true);
      } catch {
        setOpen(true);
      }
    });
  }, []);

  function closeModal() {
    if (dontShowAgain) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // ignore
      }
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-welcome-video-title"
        className="relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/15 bg-[#07111F] shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
      >
        <button
          type="button"
          aria-label="Close demo video"
          onClick={closeModal}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/40 p-2 text-white/80 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-white/10 px-5 py-4 pr-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60a5fa]">
            Unit311 Central
          </p>
          <h2 id="dashboard-welcome-video-title" className="mt-1 text-lg font-semibold text-white">
            Workspace demo
          </h2>
        </div>

        <div className="p-4 sm:p-5">
          <WorkspaceDemoLoopVideo className="w-full" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
          <label className="inline-flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              className="rounded border-white/20 bg-transparent"
            />
            Don&apos;t show again
          </label>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0b2d63] hover:bg-white/90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

