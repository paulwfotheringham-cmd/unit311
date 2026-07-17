"use client";

import {
  formatTreasuryDateTime,
  formatTreasuryMoney,
  treasuryPanelClassName,
} from "@/components/treasury/treasury-ui";
import type { TreasuryActivityItem } from "@/lib/treasury/treasury-types";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  XCircle,
} from "lucide-react";

type TreasuryActivityFeedProps = {
  items: TreasuryActivityItem[];
  limit?: number;
  compact?: boolean;
  loading?: boolean;
  className?: string;
};

function activityIcon(type: TreasuryActivityItem["type"]) {
  switch (type) {
    case "money_received":
      return ArrowDownLeft;
    case "money_sent":
      return ArrowUpRight;
    case "currency_conversion":
      return RefreshCw;
    case "transfer_failed":
      return XCircle;
    default:
      return ArrowLeftRight;
  }
}

function activityTone(type: TreasuryActivityItem["type"]) {
  switch (type) {
    case "money_received":
    case "transfer_completed":
      return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
    case "transfer_failed":
      return "border-rose-400/25 bg-rose-500/10 text-rose-300";
    case "currency_conversion":
      return "border-sky-400/25 bg-sky-500/10 text-sky-300";
    default:
      return "border-white/15 bg-white/[0.04] text-white/70";
  }
}

export default function TreasuryActivityFeed({
  items,
  limit,
  compact = false,
  loading = false,
  className,
}: TreasuryActivityFeedProps) {
  const visible = limit ? items.slice(0, limit) : items;

  return (
    <section className={cn(treasuryPanelClassName(), className)}>
      <h3 className="text-base font-semibold text-white">Recent activity</h3>

      {loading ? (
        <p className="mt-4 text-sm text-white/55">Loading activity…</p>
      ) : visible.length === 0 ? (
        <p className="mt-4 text-sm text-white/55">No recent treasury activity.</p>
      ) : (
        <ul className={cn("mt-4 space-y-2", compact && "mt-3 space-y-1.5")}>
          {visible.map((item) => {
            const Icon = activityIcon(item.type);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5",
                  compact && "py-2",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                    activityTone(item.type),
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    {item.amount !== null && item.currency ? (
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-white/90">
                        {formatTreasuryMoney(item.amount, item.currency)}
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-white/45">{item.subtitle}</p>
                  <p className="mt-1 text-[10px] text-white/35">
                    {formatTreasuryDateTime(item.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
