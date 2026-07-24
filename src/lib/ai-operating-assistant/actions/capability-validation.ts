/**
 * Startup validation — every registered action must expose complete capability metadata.
 * Adding a new action requires capability on the definition; NL layers need no code changes.
 */

import { eaStop } from "../ea-forensic-trace";
import { listAssistantActions } from "./registry";
import type { AssistantActionDefinition } from "./types";

export type CapabilityValidationIssue = {
  actionId: string;
  problems: string[];
};

export type CapabilityCatalogueSummary = {
  actionCount: number;
  modules: string[];
  businessObjects: string[];
  issues: CapabilityValidationIssue[];
};

function schemaRequired(definition: AssistantActionDefinition): string[] {
  const schema = definition.inputSchema;
  if (!schema || typeof schema !== "object") return [];
  const required = (schema as { required?: unknown }).required;
  return Array.isArray(required)
    ? required.filter((field): field is string => typeof field === "string")
    : [];
}

function schemaPropertyNames(definition: AssistantActionDefinition): string[] {
  const schema = definition.inputSchema;
  if (!schema || typeof schema !== "object") return [];
  const props = (schema as { properties?: Record<string, unknown> }).properties;
  return props && typeof props === "object" ? Object.keys(props) : [];
}

export function validateActionCapability(
  definition: AssistantActionDefinition,
): CapabilityValidationIssue | null {
  const problems: string[] = [];
  const cap = definition.capability;

  if (!cap) {
    problems.push("capability metadata is missing");
    return { actionId: definition.id, problems };
  }
  if (!cap.businessObject?.trim()) problems.push("capability.businessObject is required");
  if (!Array.isArray(cap.intentExamples) || cap.intentExamples.length === 0) {
    problems.push("capability.intentExamples must include at least one example");
  }
  if (!cap.successFormatter?.template?.trim()) {
    problems.push("capability.successFormatter.template is required");
  }
  if (
    cap.confirmationPolicy !== "always" &&
    cap.confirmationPolicy !== "never" &&
    cap.confirmationPolicy !== "if_warnings"
  ) {
    problems.push("capability.confirmationPolicy must be always|never|if_warnings");
  }
  if (!definition.inputSchema || typeof definition.inputSchema !== "object") {
    problems.push("inputSchema is required");
  }

  const required = schemaRequired(definition);
  const props = schemaPropertyNames(definition);
  for (const field of required) {
    if (!props.includes(field)) {
      problems.push(`required field "${field}" is not in inputSchema.properties`);
    }
  }

  if (required.length > 0) {
    const primary = cap.entityExtraction?.primaryNameFields ?? [];
    const extractionFields = new Set([
      ...primary,
      ...(cap.entityExtraction?.fields?.map((f) => f.field) ?? []),
    ]);
    const uncovered = required.filter((field) => !extractionFields.has(field) && !props.includes(field));
    // Required fields must either be in entityExtraction or be extractable as schema props
    // (LLM can fill schema props). Primary name fields should cover at least one required when present.
    if (primary.length === 0 && required.some((f) => /name|title|label/i.test(f))) {
      problems.push(
        "capability.entityExtraction.primaryNameFields required when name-like fields are required",
      );
    }
    void uncovered;
  }

  return problems.length ? { actionId: definition.id, problems } : null;
}

/**
 * Scan the live registry. Throws in development when any action is incomplete.
 * Always logs STOPPED for each failing action so production forensics stay clear.
 */
export function validateRegisteredActionCapabilities(options?: {
  throwOnError?: boolean;
}): CapabilityCatalogueSummary {
  const actions = listAssistantActions();
  const issues: CapabilityValidationIssue[] = [];

  for (const action of actions) {
    const issue = validateActionCapability(action);
    if (issue) issues.push(issue);
  }

  const summary: CapabilityCatalogueSummary = {
    actionCount: actions.length,
    modules: [...new Set(actions.map((a) => a.module))].sort(),
    businessObjects: [
      ...new Set(actions.map((a) => a.capability?.businessObject).filter(Boolean) as string[]),
    ].sort(),
    issues,
  };

  if (issues.length) {
    for (const issue of issues) {
      eaStop("capability validation", issue.problems.join("; "), {
        actionId: issue.actionId,
        problems: issue.problems,
      });
      console.error(
        `[EA] capability validation failed for ${issue.actionId}:`,
        issue.problems.join("; "),
      );
    }
    const shouldThrow =
      options?.throwOnError ?? process.env.NODE_ENV !== "production";
    if (shouldThrow) {
      throw new Error(
        `Action Registry capability validation failed for ${issues.length} action(s): ${issues
          .map((i) => i.actionId)
          .join(", ")}`,
      );
    }
  } else {
    console.info(
      `[EA] Capability catalogue ready: ${summary.actionCount} actions across modules [${summary.modules.join(", ")}]`,
    );
  }

  return summary;
}
