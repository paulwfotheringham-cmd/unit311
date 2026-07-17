"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import {
  buildCrmEmailModuleHref,
  type CrmActivity,
  type CrmContactHistory,
} from "@/lib/crm-contact-data";
import { formatLeadDate } from "@/lib/crm-data";

type CrmLeadTimelinePanelProps = {
  leadId: string;
};

function formatDay(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value.slice(0, 10);
  }
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value.slice(11, 16);
  }
}

export default function CrmLeadTimelinePanel({ leadId }: CrmLeadTimelinePanelProps) {
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [history, setHistory] = useState<CrmContactHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/crm/leads/${leadId}/timeline`, { cache: "no-store" });
      const data = (await response.json()) as {
        activities?: CrmActivity[];
        history?: CrmContactHistory[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Failed to load timeline");
      setActivities(data.activities ?? []);
      setHistory(data.history ?? []);
    } catch (loadError) {
      setActivities([]);
      setHistory([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="sm:col-span-2 space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
            Contact activity
          </p>
          <p className="mt-1 text-sm text-white/55">
            Chronological history from the website contact form and email replies.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] text-white/70"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading timeline…
        </p>
      ) : null}

      {error ? <p className="text-sm text-amber-200/90">{error}</p> : null}

      {!loading && !error && activities.length === 0 ? (
        <p className="text-sm text-white/45">No contact form activity yet.</p>
      ) : null}

      <ul className="space-y-3">
        {activities.map((activity) => {
          const linkedHistory = history.find((row) => row.id === activity.contactHistoryId);
          const emailHref =
            activity.emailMessageId ||
            activity.emailThreadId ||
            linkedHistory?.replyEmailMessageId ||
            linkedHistory?.confirmationEmailMessageId
              ? buildCrmEmailModuleHref({
                  emailMessageId:
                    activity.emailMessageId ??
                    linkedHistory?.replyEmailMessageId ??
                    linkedHistory?.confirmationEmailMessageId ??
                    null,
                  emailThreadId:
                    activity.emailThreadId ??
                    linkedHistory?.replyEmailThreadId ??
                    linkedHistory?.confirmationEmailMessageId ??
                    null,
                })
              : null;
          const emailLinkLabel =
            activity.activityType === "acknowledgement_email_sent"
              ? "Open acknowledgement in Email"
              : "Open in Email module";

          return (
            <li
              key={activity.id}
              className="rounded-lg border border-white/8 bg-[#0b1524]/70 px-3 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-white">{activity.title}</p>
                <p className="text-[11px] tabular-nums text-white/45">
                  {formatDay(activity.occurredAt)} · {formatTime(activity.occurredAt)}
                </p>
              </div>
              {activity.subject ? (
                <p className="mt-1 text-xs text-white/60">Subject: {activity.subject}</p>
              ) : null}
              {activity.message ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-white/75 line-clamp-4">
                  {activity.message}
                </p>
              ) : null}
              {linkedHistory ? (
                <p className="mt-2 text-[11px] text-white/45">
                  Reply status:{" "}
                  {linkedHistory.replyStatus === "replied"
                    ? `Replied${linkedHistory.repliedBy ? ` by ${linkedHistory.repliedBy}` : ""}${
                        linkedHistory.replyAt ? ` · ${formatLeadDate(linkedHistory.replyAt)}` : ""
                      }`
                    : "Awaiting Reply"}
                </p>
              ) : null}
              {emailHref ? (
                <a
                  href={emailHref}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-200"
                >
                  {emailLinkLabel}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
