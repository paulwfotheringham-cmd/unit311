/**
 * Registers every Action Framework domain module.
 * Orchestration must call this — never hardcode domain NL knowledge here.
 */

import { registerClientsActions } from "./modules/clients/register";
import { registerProjectsActions } from "./modules/projects/register";
import { validateRegisteredActionCapabilities } from "./capability-validation";
import { buildCapabilityGraph, invalidateCapabilityGraph } from "./capability-service";

let bootstrapped = false;

export function registerAllActionModules() {
  registerClientsActions();
  registerProjectsActions();

  if (!bootstrapped) {
    validateRegisteredActionCapabilities({
      throwOnError: process.env.NODE_ENV !== "production",
    });
    invalidateCapabilityGraph();
    buildCapabilityGraph({ force: true });
    bootstrapped = true;
  }

  return true;
}
