export * from "./types";
export * from "./permissions";
export * from "./registry";
export * from "./audit-service";
export * from "./plan-store";
export * from "./execution-pipeline";
export * from "./discovery-tools";

// Domain modules — side-effect registration for Action Framework discovery.
import "./modules/clients/register";
export * from "./modules/clients";

// Planning Engine (additive orchestration layer).
export * from "./planning";
