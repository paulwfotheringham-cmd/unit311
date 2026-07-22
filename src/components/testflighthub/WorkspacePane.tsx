"use client";

import type { InternalOperationsView } from "@/lib/internal-operations-data";

/**
 * Keeps recently visited workspaces mounted (hidden) so revisit feels instant.
 * Inactive panes use `hidden` so they do not receive clicks.
 */
export default function WorkspacePane({
  view,
  activeView,
  keepMounted,
  children,
}: {
  view: InternalOperationsView;
  activeView: InternalOperationsView;
  keepMounted: boolean;
  children: React.ReactNode;
}) {
  const isActive = activeView === view;
  if (!isActive && !keepMounted) return null;

  return (
    <div
      hidden={!isActive}
      className={isActive ? "min-w-0" : "hidden"}
      data-workspace-pane={view}
      data-workspace-active={isActive ? "true" : "false"}
      aria-hidden={!isActive}
    >
      {children}
    </div>
  );
}
