"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import {
  buildDefaultFleetAssignments,
} from "@/lib/survey-operations-mock-data";
import type { Telemetry } from "@/lib/telemetry";
import { createInitialUsers, type ManagedUser } from "@/lib/user-management-data";
import FleetPanel from "./FleetPanel";

const FLEET_ASSIGNMENTS_STORAGE_KEY = "dc-fleet-user-assignments";

type FleetWorkspaceProps = {
  liveTelemetry: Telemetry | null;
  isRunning: boolean;
  onOpenAssets?: () => void;
  users?: ManagedUser[];
};

export default function FleetWorkspace({
  liveTelemetry,
  isRunning,
  onOpenAssets,
  users: usersProp,
}: FleetWorkspaceProps) {
  const users = useMemo(() => usersProp ?? createInitialUsers(), [usersProp]);
  const [assignments, setAssignments] = useState<Record<string, string>>(() =>
    buildDefaultFleetAssignments(),
  );

  useEffect(() => {
    startTransition(() => {
      try {
        const stored = localStorage.getItem(FLEET_ASSIGNMENTS_STORAGE_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored) as Record<string, string>;
        setAssignments((current) => ({ ...current, ...parsed }));
      } catch {
        // ignore invalid storage
      }
    });
  }, []);

  function updateAssignment(droneId: string, userId: string) {
    setAssignments((current) => {
      const next = { ...current, [droneId]: userId };
      try {
        localStorage.setItem(FLEET_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  return (
    <FleetPanel
      liveTelemetry={liveTelemetry}
      isRunning={isRunning}
      onOpenAssets={onOpenAssets}
      showLocationMap
      users={users}
      assignments={assignments}
      onAssignmentChange={updateAssignment}
    />
  );
}
