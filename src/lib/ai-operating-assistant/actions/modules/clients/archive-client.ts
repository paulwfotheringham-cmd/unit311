import {
  archiveInternalClient,
  updateInternalClient,
} from "@/lib/internal-clients-service";
import { normalizeClientAccountStatus } from "@/lib/client-management-data";
import type { AssistantActionDefinition } from "../../types";
import {
  asTrimmedString,
  clientSnapshot,
  requireWorkspaceScope,
  resolveClientRef,
} from "./helpers";

export const archiveClientAction: AssistantActionDefinition = {
  id: "clients.archiveClient",
  name: "Archive client",
  description:
    "Soft-archive a client (accountStatus → Archived). Use for “Archive XYZ Holdings”. Prefer archive over delete when invoices may exist.",
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
    },
  },
  capability: {
    businessObject: "Client",
    intentExamples: [
      "Archive a client",
      "Archive XYZ Holdings",
      "Deactivate this customer",
      "Close the Acme account",
    ],
    semanticAliases: ["client", "customer", "archive", "deactivate", "retire", "close"],
    entityExtraction: {
      primaryNameFields: ["clientName"],
      fields: [{ field: "clientName", from: "named_entity" }],
    },
    confirmationPolicy: "always",
    successFormatter: {
      template: "Client archived.\n\nName\n{recordLabel}",
      fields: [{ token: "recordLabel", path: "result.recordLabel" }],
    },
    suggestedFollowUps: [{ label: "Restore client", actionId: "clients.restoreClient" }],
  },
  handler: {
    async validate(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) return ws.validation;
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) return { ok: false, errors: resolved.errors, warnings: [] };
      const status = normalizeClientAccountStatus(resolved.client.accountStatus);
      if (status === "Archived") {
        return {
          ok: false,
          errors: [`“${resolved.client.companyName}” is already archived.`],
          warnings: [],
        };
      }
      const warnings: string[] = [];
      if (resolved.client.activeProjects > 0) {
        warnings.push(
          `Client still has ${resolved.client.activeProjects} active project(s).`,
        );
      }
      return { ok: true, errors: [], warnings };
    },

    async preview(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return {
          summary: "Archive client (blocked)",
          affectedRecords: [],
          warnings: ws.validation.errors,
          reversible: true,
        };
      }
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) {
        return {
          summary: "Archive client (not found)",
          affectedRecords: [],
          warnings: resolved.errors,
          reversible: true,
        };
      }
      return {
        summary: `Archive “${resolved.client.companyName}” (${resolved.client.accountStatus} → Archived)`,
        affectedRecords: [
          {
            type: "client",
            id: resolved.client.id,
            label: resolved.client.companyName,
            change: `${resolved.client.accountStatus} → Archived`,
          },
        ],
        warnings:
          resolved.client.activeProjects > 0
            ? [`${resolved.client.activeProjects} active project(s) remain linked.`]
            : [],
        reversible: true,
        estimatedSideEffects: ["Client remains in directory but marked Archived"],
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
      const before = clientSnapshot(resolved.client);
      const archived = await archiveInternalClient(resolved.client.id, ws.scope);
      const after = clientSnapshot(archived);
      return {
        ok: true,
        message: `Archived “${archived.companyName}”.`,
        recordId: archived.id,
        recordLabel: archived.companyName,
        beforeState: { ...before, correlationId: ctx.planId, clientId: archived.id },
        afterState: { ...after, correlationId: ctx.planId, clientId: archived.id },
        output: { clientId: archived.id, previousStatus: before.accountStatus },
      };
    },

    async rollback(_input, ctx) {
      const before = ctx.executeResult.beforeState;
      const clientId = asTrimmedString(before?.id) || asTrimmedString(ctx.executeResult.recordId);
      const previousStatus = asTrimmedString(before?.accountStatus);
      if (!clientId || !previousStatus) {
        return {
          ok: false,
          message: "Cannot restore previous status — missing before-state.",
          error: "NO_BEFORE",
        };
      }
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return { ok: false, message: ws.validation.errors.join("; "), error: "VALIDATION" };
      }
      try {
        // Archive → Dormant first (allowed), then to previous if needed.
        await updateInternalClient(clientId, { accountStatus: "Dormant" }, ws.scope);
        if (previousStatus !== "Dormant" && previousStatus !== "Archived") {
          await updateInternalClient(
            clientId,
            { accountStatus: previousStatus as never },
            ws.scope,
          );
        }
        return {
          ok: true,
          message: `Restored client ${clientId} toward previous status (${previousStatus}).`,
        };
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
