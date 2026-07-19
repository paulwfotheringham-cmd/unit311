"use client";

import { cn } from "@/lib/utils";

export async function readTreasuryApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error(`Request failed (${response.status})`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(response.ok ? "Invalid server response." : text.slice(0, 180));
  }
}

export function treasuryPanelClassName() {
  return "rounded-2xl border border-white/10 bg-[#0a1422]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-5";
}

export function treasuryInputClassName() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-sky-400/50";
}

export function TreasuryFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">
      {children}
    </label>
  );
}

export function TreasurySkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-white/10 bg-white/[0.04]",
        className,
      )}
    />
  );
}

export function TreasuryDirectionBadge({
  direction,
}: {
  direction: "incoming" | "outgoing";
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
        direction === "incoming"
          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
          : "border-rose-400/30 bg-rose-500/10 text-rose-200",
      )}
    >
      {direction === "incoming" ? "Incoming" : "Outgoing"}
    </span>
  );
}

export function TreasuryStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized.includes("fail") || normalized.includes("cancel")
      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
      : normalized.includes("complete") || normalized.includes("sent")
        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
        : "border-amber-400/30 bg-amber-500/10 text-amber-200";

  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]",
        tone,
      )}
    >
      {status}
    </span>
  );
}

export function formatTreasuryMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatTreasuryDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
