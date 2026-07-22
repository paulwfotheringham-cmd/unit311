"use client";

import { cn } from "@/lib/utils";

/** Professional chrome skeleton while a workspace chunk or data layer loads. */
export default function WorkspaceLoadingFallback({
  className,
  label = "Loading workspace",
  variant = "workspace",
}: {
  className?: string;
  label?: string;
  variant?: "workspace" | "page" | "list" | "messages";
}) {
  if (variant === "list") {
    return (
      <div
        className={cn("animate-pulse space-y-3 py-2", className)}
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <div className="h-8 w-40 rounded-lg bg-white/[0.08]" />
        <div className="h-10 w-full rounded-xl bg-white/[0.06]" />
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-14 rounded-xl bg-white/[0.05]" />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === "messages") {
    return (
      <div
        className={cn("animate-pulse space-y-3 py-2", className)}
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <div className="ml-auto h-16 w-[70%] rounded-2xl bg-white/[0.06]" />
        <div className="h-16 w-[65%] rounded-2xl bg-white/[0.05]" />
        <div className="ml-auto h-14 w-[55%] rounded-2xl bg-white/[0.06]" />
        <div className="h-20 w-[75%] rounded-2xl bg-white/[0.05]" />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div
        className={cn(
          "flex min-h-[50vh] w-full animate-pulse flex-col gap-4 bg-[#020617] px-4 py-6 sm:px-6",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <div className="flex gap-4">
          <div className="hidden h-[calc(100vh-3rem)] w-56 shrink-0 rounded-2xl bg-white/[0.04] lg:block" />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="h-10 w-56 rounded-lg bg-white/[0.08]" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="h-28 rounded-xl bg-white/[0.06]" />
              <div className="h-28 rounded-xl bg-white/[0.06]" />
              <div className="h-28 rounded-xl bg-white/[0.06] max-lg:hidden" />
            </div>
            <div className="h-72 rounded-xl bg-white/[0.05]" />
          </div>
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn("animate-pulse space-y-4 py-2", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="h-8 w-48 rounded-lg bg-white/[0.08]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 rounded-xl bg-white/[0.06]" />
        <div className="h-28 rounded-xl bg-white/[0.06]" />
        <div className="h-28 rounded-xl bg-white/[0.06] max-lg:hidden" />
      </div>
      <div className="h-64 rounded-xl bg-white/[0.05]" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
