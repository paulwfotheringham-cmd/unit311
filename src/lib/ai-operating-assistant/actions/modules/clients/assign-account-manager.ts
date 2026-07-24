import { updateInternalClient } from "@/lib/internal-clients-service";
import type { AssistantActionDefinition } from "../../types";
import {
  asTrimmedString,
  clientSnapshot,
  readClientMeta,
  requireWorkspaceScope,
  resolveAccountManager,
  resolveClientRef,
  writeClientMeta,
  type ClientAccountManagerMeta,
} from "./helpers";

function applyManager(
  notes: string,
  manager: ClientAccountManagerMeta | null,
): string {
  const meta = readClientMeta(notes);
  meta.accountManager = manager;
  return writeClientMeta(notes, meta);
}

export const assignAccountManagerAction: AssistantActionDefinition = {
  id: "clients.assignAccountManager",
  name: "Assign account manager",
  description:
    "Assign or change the account manager for a client. Use for “Assign Sarah as account manager for Acme Ltd”. Manager is stored on the client record (structured notes meta until a dedicated column exists).",
  module: "clients",
  requiredPermissions: ["authenticated"],
  confirmationRequired: true,
  auditRequired: true,
  undoCapable: true,
  inputSchema: {
    type: "object",
    properties: {
      clientId: { type: "string" },
      clientName: { type: "string" },
      accountManagerName: { type: "string" },
      accountManagerId: { type: "string" },
      managerName: { type: "string" },
      managerId: { type: "string" },
    },
  },
  capability: {
    businessObject: "Client",
    intentExamples: [
      "Assign an account manager",
      "Assign Sarah as account manager for Acme Ltd",
      "Give this client an account owner",
      "Appoint a manager for Orion",
    ],
    semanticAliases: [
      "client",
      "customer",
      "assign",
      "appoint",
      "manager",
      "account manager",
      "owner",
    ],
    entityExtraction: {
      primaryNameFields: ["clientName"],
      fields: [
        { field: "clientName", from: "named_entity" },
        { field: "accountManagerName", from: "person" },
        { field: "managerName", from: "person" },
      ],
    },
    confirmationPolicy: "always",
    successFormatter: {
      template: "Account manager assigned.\n\nClient\n{recordLabel}",
      fields: [{ token: "recordLabel", path: "result.recordLabel" }],
    },
    suggestedFollowUps: [
      { label: "Add contact", actionId: "clients.addClientContact" },
      { label: "Create project", actionId: "projects.createProject" },
    ],
  },
  handler: {
    async validate(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) return ws.validation;
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) return { ok: false, errors: resolved.errors, warnings: [] };
      const manager = await resolveAccountManager(input);
      if (!manager.ok) return { ok: false, errors: manager.errors, warnings: [] };
      const warnings: string[] = [];
      if (manager.manager.id.startsWith("name:")) {
        warnings.push(
          `“${manager.manager.name}” was not found in internal users — storing name-only assignment.`,
        );
      }
      return { ok: true, errors: [], warnings };
    },

    async preview(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return {
          summary: "Assign account manager (blocked)",
          affectedRecords: [],
          warnings: ws.validation.errors,
          reversible: true,
        };
      }
      const resolved = await resolveClientRef(input, ws.scope);
      const manager = await resolveAccountManager(input);
      if (!resolved.ok || !manager.ok) {
        return {
          summary: "Assign account manager",
          affectedRecords: [],
          warnings: [...(resolved.ok ? [] : resolved.errors), ...(manager.ok ? [] : manager.errors)],
          reversible: true,
        };
      }
      const previous = readClientMeta(resolved.client.notes).accountManager ?? null;
      return {
        summary: `Assign ${manager.manager.name} as account manager for “${resolved.client.companyName}”`,
        affectedRecords: [
          {
            type: "client",
            id: resolved.client.id,
            label: resolved.client.companyName,
            change: previous
              ? `accountManager: ${previous.name} → ${manager.manager.name}`
              : `accountManager: (none) → ${manager.manager.name}`,
          },
          {
            type: "user",
            id: manager.manager.id,
            label: manager.manager.name,
            change: "assign",
          },
        ],
        warnings: previous
          ? [`Replaces previous manager ${previous.name}.`]
          : [],
        reversible: true,
      };
    },

    async execute(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return { ok: false, message: ws.validation.errors.join("; "), error: "VALIDATION" };
      }
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) {
        return { ok: false, message: resolved.errors.join("; "), error: "NOT_FOUND" };
      }
      const manager = await resolveAccountManager(input);
      if (!manager.ok) {
        return { ok: false, message: manager.errors.join("; "), error: "VALIDATION" };
      }
      const before = clientSnapshot(resolved.client);
      const previous = readClientMeta(resolved.client.notes).accountManager ?? null;
      const notes = applyManager(resolved.client.notes, manager.manager);
      const updated = await updateInternalClient(resolved.client.id, { notes }, ws.scope);
      const after = clientSnapshot(updated);
      return {
        ok: true,
        message: `Assigned ${manager.manager.name} as account manager for “${updated.companyName}”.`,
        recordId: updated.id,
        recordLabel: updated.companyName,
        beforeState: {
          ...before,
          previousAccountManager: previous,
          correlationId: ctx.planId,
          clientId: updated.id,
        },
        afterState: {
          ...after,
          correlationId: ctx.planId,
          clientId: updated.id,
        },
        output: {
          clientId: updated.id,
          accountManager: manager.manager,
          previousAccountManager: previous,
        },
      };
    },

    async rollback(_input, ctx) {
      const before = ctx.executeResult.beforeState;
      const clientId = asTrimmedString(before?.id) || asTrimmedString(ctx.executeResult.recordId);
      if (!clientId || typeof before?.notes !== "string") {
        return { ok: false, message: "Missing previous notes for rollback.", error: "NO_BEFORE" };
      }
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return { ok: false, message: ws.validation.errors.join("; "), error: "VALIDATION" };
      }
      try {
        await updateInternalClient(clientId, { notes: before.notes }, ws.scope);
        return { ok: true, message: `Restored previous account manager for ${clientId}.` };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "Rollback failed",
          error: "ROLLBACK_FAILED",
        };
      }
    },
  },
};
