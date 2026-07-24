import type { AssistantFollowUpAction } from "./tool-result";

/**
 * Legacy safe action catalogue — definitions + confirmation gate.
 *
 * Phase 1 Action Framework (`./actions`) is the path forward for real writes:
 * register handlers with `registerAssistantAction`, propose via
 * `proposeBusinessActionPlan`, confirm in UI, execute via `/api/.../actions/plans/[id]`.
 *
 * These catalogue kinds remain for older follow-up buttons until modules migrate.
 */

export type AssistantPendingActionKind =
  | "create_client"
  | "create_project"
  | "create_employee"
  | "approve_leave"
  | "invite_external_user"
  | "generate_report";

export type AssistantPendingAction = {
  id: string;
  kind: AssistantPendingActionKind;
  label: string;
  description: string;
  requiresConfirmation: true;
  payload: Record<string, unknown>;
  status: "proposed" | "confirmed" | "cancelled" | "executed";
};

export const ASSISTANT_ACTION_DEFINITIONS: Array<{
  kind: AssistantPendingActionKind;
  label: string;
  description: string;
}> = [
  {
    kind: "create_client",
    label: "Create Client",
    description: "Create a new client directory record after explicit confirmation.",
  },
  {
    kind: "create_project",
    label: "Create Project",
    description: "Create a project record after explicit confirmation.",
  },
  {
    kind: "create_employee",
    label: "Create Employee",
    description: "Create an HR employee record after explicit confirmation.",
  },
  {
    kind: "approve_leave",
    label: "Approve Leave",
    description: "Approve an employee leave request after explicit confirmation.",
  },
  {
    kind: "invite_external_user",
    label: "Invite External User",
    description: "Invite an external portal user after explicit confirmation.",
  },
  {
    kind: "generate_report",
    label: "Generate Report",
    description: "Generate a report pack from live tool data after confirmation.",
  },
];

export function proposeAction(
  kind: AssistantPendingActionKind,
  payload: Record<string, unknown> = {},
): AssistantPendingAction {
  const definition = ASSISTANT_ACTION_DEFINITIONS.find((entry) => entry.kind === kind);
  return {
    id: `action_${kind}_${Date.now().toString(36)}`,
    kind,
    label: definition?.label ?? kind,
    description: definition?.description ?? "Requires confirmation before execution.",
    requiresConfirmation: true,
    payload,
    status: "proposed",
  };
}

export function actionFollowUps(
  kinds: AssistantPendingActionKind[],
): AssistantFollowUpAction[] {
  return kinds.map((kind) => {
    const definition = ASSISTANT_ACTION_DEFINITIONS.find((entry) => entry.kind === kind);
    return {
      id: `follow_${kind}`,
      label: definition?.label ?? kind,
      kind: "confirm_action",
      actionId: kind,
      requiresConfirmation: true,
    };
  });
}

/**
 * Legacy catalogue execution remains blocked.
 * Real writes must go through Action Framework plans (`./actions`).
 */
export async function executeConfirmedAction(_action: AssistantPendingAction) {
  try {
    const { recordQualityEvent } = await import("./feedback-service");
    void recordQualityEvent({
      kind: "confirmation_blocked",
      meta: {
        actionKind: _action.kind,
        status: "blocked",
        hint: "Use Action Framework registerAssistantAction + proposeBusinessActionPlan",
      },
    });
  } catch {
    // optional
  }
  return {
    status: "blocked" as const,
    message:
      "This legacy action catalogue entry is not executable. Domain modules must register Action Framework handlers (validate/preview/execute/rollback) and run through the confirmation pipeline.",
  };
}
