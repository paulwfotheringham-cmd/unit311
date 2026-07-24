import { createProject } from "@/lib/internal-projects-service";
import type { AssistantActionDefinition } from "../../types";

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Proof action: registered only via capability metadata.
 * NL layers must discover this without module-specific prompts or router edits.
 */
export const createProjectAction: AssistantActionDefinition = {
  id: "projects.createProject",
  name: "Create project",
  description:
    "Create a new project record. Use when the user asks to set up, start, or create a project.",
  module: "projects",
  requiredPermissions: ["authenticated"],
  confirmationRequired: true,
  auditRequired: true,
  undoCapable: false,
  inputSchema: {
    type: "object",
    properties: {
      projectName: { type: "string" },
      name: { type: "string" },
      clientName: { type: "string" },
      clientId: { type: "string" },
      site: { type: "string" },
      region: { type: "string" },
      notes: { type: "string" },
    },
    required: ["projectName"],
  },
  capability: {
    id: "projects.create",
    businessObject: "Project",
    intentExamples: [
      "Create a project",
      "Set up a project called Orion",
      "Start a new project",
      "Add a project for Acme Ltd",
      "Launch project Helios",
    ],
    semanticAliases: [
      "project",
      "create",
      "add",
      "setup",
      "set up",
      "start",
      "launch",
      "new",
    ],
    entityExtraction: {
      primaryNameFields: ["projectName", "name"],
      fields: [
        { field: "projectName", from: "named_entity" },
        { field: "name", from: "named_entity" },
        { field: "clientName", from: "named_entity" },
        { field: "site", from: "location" },
        { field: "region", from: "location" },
      ],
    },
    confirmationPolicy: "always",
    successFormatter: {
      template: "Project created.\n\nName\n{recordLabel}",
      fields: [{ token: "recordLabel", path: "result.recordLabel" }],
    },
    suggestedFollowUps: [],
    relationships: {
      suggestedNext: [
        // Wire Assign Manager / Create Task / Generate Quote / Schedule Kickoff when those actions register.
      ],
    },
  },
  handler: {
    async validate(input) {
      const projectName =
        asTrimmedString(input.projectName) || asTrimmedString(input.name);
      const errors: string[] = [];
      if (!projectName) errors.push("projectName is required.");
      return { ok: errors.length === 0, errors, warnings: [] };
    },

    async preview(input) {
      const projectName =
        asTrimmedString(input.projectName) || asTrimmedString(input.name);
      const clientName = asTrimmedString(input.clientName) || "Unassigned";
      return {
        summary: `Create project “${projectName || "(unnamed)"}” for ${clientName}`,
        affectedRecords: [
          {
            type: "project",
            label: projectName || "New project",
            change: "create",
          },
        ],
        warnings: clientName === "Unassigned" ? ["No client assigned yet."] : [],
        reversible: false,
        estimatedSideEffects: ["Creates internal_projects row in the current workspace"],
      };
    },

    async execute(input, ctx) {
      const projectName =
        asTrimmedString(input.projectName) || asTrimmedString(input.name);
      const clientName = asTrimmedString(input.clientName) || "Unassigned";
      if (!projectName) {
        return { ok: false, message: "projectName is required.", error: "VALIDATION" };
      }

      const created = await createProject(
        {
          name: projectName,
          clientName,
          clientId: asTrimmedString(input.clientId) || undefined,
          site: asTrimmedString(input.site) || undefined,
          region: asTrimmedString(input.region) || undefined,
          notes: asTrimmedString(input.notes) || undefined,
          workspaceId: ctx.business.workspace.id || undefined,
        },
        { workspaceId: ctx.business.workspace.id || undefined },
      );

      return {
        ok: true,
        message: `Created project “${created.name}”.`,
        recordId: created.id,
        recordLabel: created.name,
        beforeState: null,
        afterState: {
          id: created.id,
          name: created.name,
          clientName: created.clientName,
        },
        output: { projectId: created.id, projectName: created.name },
      };
    },
  },
};
