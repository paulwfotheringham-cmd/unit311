/**
 * Clients module — reference Action Framework registration.
 * Import this module once at assistant bootstrap so listBusinessActions discovers handlers.
 */

import { registerAssistantAction, upsertAssistantAction } from "../../registry";
import { archiveClientAction } from "./archive-client";
import { assignAccountManagerAction } from "./assign-account-manager";
import {
  addClientContactAction,
  removeClientContactAction,
  updateClientContactAction,
} from "./contacts";
import { createClientAction } from "./create-client";
import { createClientLocationAction } from "./create-location";
import { mergeDuplicateClientsAction } from "./merge-clients";
import { restoreClientAction } from "./restore-client";
import { updateClientAction } from "./update-client";

const CLIENT_ACTIONS = [
  createClientAction,
  updateClientAction,
  archiveClientAction,
  restoreClientAction,
  assignAccountManagerAction,
  addClientContactAction,
  updateClientContactAction,
  removeClientContactAction,
  createClientLocationAction,
  mergeDuplicateClientsAction,
] as const;

let registered = false;

/** Idempotent registration for serverless / hot reload. */
export function registerClientsActions() {
  for (const action of CLIENT_ACTIONS) {
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
  return CLIENT_ACTIONS.length;
}

export function listRegisteredClientActionIds() {
  return CLIENT_ACTIONS.map((action) => action.id);
}

// Auto-register on import.
registerClientsActions();
