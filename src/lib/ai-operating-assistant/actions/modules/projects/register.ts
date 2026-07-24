import { registerAssistantAction, upsertAssistantAction } from "../../registry";
import { createProjectAction } from "./create-project";

const PROJECT_ACTIONS = [createProjectAction] as const;

let registered = false;

/** Idempotent registration for serverless / hot reload. */
export function registerProjectsActions() {
  for (const action of PROJECT_ACTIONS) {
    try {
      if (registered) {
        upsertAssistantAction(action);
      } else {
        registerAssistantAction(action);
      }
    } catch {
      upsertAssistantAction(action);
    }
  }
  registered = true;
  return PROJECT_ACTIONS.length;
}

export function listRegisteredProjectActionIds() {
  return PROJECT_ACTIONS.map((action) => action.id);
}

registerProjectsActions();
