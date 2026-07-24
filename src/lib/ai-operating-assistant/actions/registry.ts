/**
 * Action Registry — discoverable catalogue of business operations.
 * Domain modules call registerAssistantAction(); the EA discovers via listDescriptors().
 */

import type { AssistantBusinessContext } from "../types";
import type {
  AssistantActionDefinition,
  AssistantActionDescriptor,
  AssistantActionModule,
} from "./types";
import { userHasActionPermissions } from "./permissions";

const registry = new Map<string, AssistantActionDefinition>();

export function registerAssistantAction(definition: AssistantActionDefinition) {
  if (!definition.id?.trim()) {
    throw new Error("Assistant action id is required");
  }
  if (registry.has(definition.id)) {
    throw new Error(`Assistant action already registered: ${definition.id}`);
  }
  registry.set(definition.id, definition);
  return definition;
}

/** Test / hot-reload helper — replace an existing action id. */
export function upsertAssistantAction(definition: AssistantActionDefinition) {
  registry.set(definition.id, definition);
  return definition;
}

export function unregisterAssistantAction(actionId: string) {
  return registry.delete(actionId);
}

export function getAssistantAction(actionId: string): AssistantActionDefinition | null {
  return registry.get(actionId) ?? null;
}

export function listAssistantActions(filter?: {
  module?: AssistantActionModule;
  business?: AssistantBusinessContext;
}): AssistantActionDefinition[] {
  let actions = [...registry.values()];
  if (filter?.module) {
    actions = actions.filter((action) => action.module === filter.module);
  }
  if (filter?.business) {
    actions = actions.filter((action) =>
      userHasActionPermissions(filter.business!, action.requiredPermissions),
    );
  }
  return actions.sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name));
}

export function toActionDescriptor(definition: AssistantActionDefinition): AssistantActionDescriptor {
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    module: definition.module,
    requiredPermissions: definition.requiredPermissions,
    confirmationRequired: definition.confirmationRequired,
    auditRequired: definition.auditRequired,
    undoCapable: definition.undoCapable,
    inputSchema: definition.inputSchema,
  };
}

export function listAssistantActionDescriptors(filter?: {
  module?: AssistantActionModule;
  business?: AssistantBusinessContext;
}): AssistantActionDescriptor[] {
  return listAssistantActions(filter).map(toActionDescriptor);
}

export function clearAssistantActionRegistry() {
  registry.clear();
}

export function assistantActionRegistrySize() {
  return registry.size;
}
