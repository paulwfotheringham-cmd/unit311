"use client";

import type { InternalOperationsView } from "@/lib/internal-operations-data";
import { cn } from "@/lib/utils";

/**
 * Keeps recently visited workspaces mounted (hidden) so revisit feels instant.
 * Inactive panes use `hidden` so they do not receive clicks.
 */
export default function WorkspacePane({
  view,
  activeView,
  keepMounted,
  className,
  children,
}: {
  view: InternalOperationsView;
  activeView: InternalOperationsView;
  keepMounted: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const isActive = activeView === view;
  if (!isActive && !keepMounted) return null;

  return (
    <div
      hidden={!isActive}
      className={cn(isActive ? "min-w-0" : "hidden", className)}
      data-workspace-pane={view}
      data-workspace-active={isActive ? "true" : "false"}
      aria-hidden={!isActive}
    >
      {children}
    </div>
  );
}
