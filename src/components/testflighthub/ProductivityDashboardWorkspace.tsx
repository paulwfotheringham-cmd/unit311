"use client";

import Link from "next/link";
import {
  CalendarDays,
  FolderOpen,
  LifeBuoy,
  Mail,
  MessageSquare,
  Share2,
  Video,
} from "lucide-react";

import { useInternalOperationsBasePath } from "@/components/testflighthub/InternalOperationsBasePathContext";
import { getInternalNavHref } from "@/lib/internal-operations-data";
import { cn } from "@/lib/utils";

const modules = [
  {
    label: "File Explorer",
    description: "Internal, external and client file repositories.",
    hrefView: "files-internal" as const,
    icon: FolderOpen,
  },
  {
    label: "Email",
    description: "Shared inboxes and correspondence.",
    hrefView: "info-email" as const,
    icon: Mail,
  },
  {
    label: "Calendar",
    description: "Meetings, schedules and availability.",
    hrefView: "calendar" as const,
    icon: CalendarDays,
  },
  {
    label: "Voice & Video",
    description: "Calls, meetings and media sessions.",
    hrefView: "media-example" as const,
    icon: Video,
  },
  {
    label: "Messaging",
    description: "Team conversations and channels.",
    hrefView: "messaging" as const,
    icon: MessageSquare,
  },
  {
    label: "Social",
    description: "Social publishing and engagement.",
    hrefView: "social" as const,
    icon: Share2,
  },
  {
    label: "Support Desk",
    description: "Tickets and WhatsApp integration.",
    hrefView: "support" as const,
    icon: LifeBuoy,
  },
] as const;

export default function ProductivityDashboardWorkspace() {
  const basePath = useInternalOperationsBasePath();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-white">Business Productivity</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
          Operating hub for collaboration, communication and document workflows. Open a module
          below — File Explorer stays under its own submenu and is never opened automatically from
          this dashboard.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={getInternalNavHref(item.hrefView, basePath)}
              className={cn(
                "group rounded-[12px] border p-4 transition-colors duration-150",
                "border-[color:var(--platform-card-border,#243347)] bg-[color:var(--platform-card,#121C2D)]",
                "hover:border-[color:var(--platform-accent,#2F80ED)]/45",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10"
                  style={{ background: "color-mix(in srgb, var(--platform-accent, #2F80ED) 16%, transparent)" }}
                >
                  <Icon
                    className="h-4 w-4"
                    style={{ color: "var(--platform-accent, #2F80ED)" }}
                    strokeWidth={1.6}
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-white group-hover:text-white">
                    {item.label}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-white/50">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
