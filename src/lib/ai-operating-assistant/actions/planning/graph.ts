/**
 * Execution graph helpers — waves, edges, parallel groups.
 */

import type {
  PlanningEdge,
  PlanningExecutionGraph,
  PlanningStep,
} from "./types";

export function buildExecutionGraph(steps: PlanningStep[]): PlanningExecutionGraph {
  const nodes = steps.map((step) => step.id);
  const edges: PlanningEdge[] = [];
  const parallelGroups: Record<string, string[]> = {};

  for (const step of steps) {
    for (const dep of step.dependsOnStepIds) {
      edges.push({ fromStepId: dep, toStepId: step.id, kind: "dependency" });
    }
    if (step.condition) {
      const condStep =
        "stepId" in step.condition ? step.condition.stepId : step.dependsOnStepIds[0];
      if (condStep) {
        edges.push({
          fromStepId: condStep,
          toStepId: step.id,
          kind: "conditional",
        });
      }
    }
    if (step.parallelGroupId) {
      parallelGroups[step.parallelGroupId] ??= [];
      parallelGroups[step.parallelGroupId]!.push(step.id);
      const peers = parallelGroups[step.parallelGroupId]!;
      if (peers.length > 1) {
        const prev = peers[peers.length - 2]!;
        edges.push({
          fromStepId: prev,
          toStepId: step.id,
          kind: "parallel",
        });
      }
    }
  }

  const waves = computeWaves(steps);
  return { nodes, edges, waves, parallelGroups };
}

/** Kahn-style layering: each wave contains steps whose deps are in prior waves. */
export function computeWaves(steps: PlanningStep[]): string[][] {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const remaining = new Set(steps.map((step) => step.id));
  const completed = new Set<string>();
  const waves: string[][] = [];
  let guard = 0;

  while (remaining.size > 0 && guard < steps.length + 2) {
    guard += 1;
    const ready: string[] = [];
    for (const id of remaining) {
      const step = byId.get(id)!;
      const depsMet = step.dependsOnStepIds.every((dep) => completed.has(dep));
      if (depsMet) ready.push(id);
    }
    if (!ready.length) {
      // Cycle or missing deps — dump remaining as a final wave to avoid hang.
      waves.push([...remaining]);
      break;
    }
    waves.push(ready);
    for (const id of ready) {
      remaining.delete(id);
      completed.add(id);
    }
  }

  return waves;
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  return rem ? `${minutes}m ${rem}s` : `${minutes}m`;
}

export function estimatePlanDurationMs(steps: PlanningStep[]): number {
  const waves = computeWaves(steps);
  const byId = new Map(steps.map((step) => [step.id, step]));
  let total = 0;
  for (const wave of waves) {
    // Parallel groups within a wave take max duration; others sum.
    const groups = new Map<string | null, number>();
    for (const id of wave) {
      const step = byId.get(id);
      if (!step) continue;
      const key = step.parallelGroupId;
      const prev = groups.get(key) ?? 0;
      if (key) {
        groups.set(key, Math.max(prev, step.estimatedDurationMs));
      } else {
        groups.set(`${id}__solo`, step.estimatedDurationMs);
      }
    }
    for (const value of groups.values()) total += value;
  }
  return total;
}

export function highestRisk(
  levels: Array<PlanningStep["riskLevel"]>,
): PlanningStep["riskLevel"] {
  const order = { low: 0, medium: 1, high: 2, critical: 3 } as const;
  let best: PlanningStep["riskLevel"] = "low";
  for (const level of levels) {
    if (order[level] > order[best]) best = level;
  }
  return best;
}

export function progressPct(steps: PlanningStep[]): number {
  if (!steps.length) return 0;
  const done = steps.filter((step) =>
    ["succeeded", "skipped", "failed", "rolled_back"].includes(step.status),
  ).length;
  return Math.round((done / steps.length) * 100);
}
