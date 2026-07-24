import {
  archiveInternalClient,
  restoreInternalClient,
} from "@/lib/internal-clients-service";
import { normalizeClientAccountStatus } from "@/lib/client-management-data";
import type { AssistantActionDefinition } from "../../types";
import {
  asTrimmedString,
  clientSnapshot,
  requireWorkspaceScope,
  resolveClientRef,
} from "./helpers";

export const restoreClientAction: AssistantActionDefinition = {
  id: "clients.restoreClient",
  name: "Restore client",
  description:
    "Restore an archived client to Dormant for review. Use for “Restore ABC Ltd”.",
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
    id: "clients.restore",
    businessObject: "Client",
    intentExamples: [
      "Restore a client",
      "Restore ABC Ltd",
      "Reactivate an archived customer",
      "Unarchive this client",
    ],
    semanticAliases: ["client", "customer", "restore", "reactivate", "unarchive", "reopen"],
    entityExtraction: {
      primaryNameFields: ["clientName"],
      fields: [{ field: "clientName", from: "named_entity" }],
    },
    confirmationPolicy: "always",
    successFormatter: {
      template: "Client restored.\n\nName\n{recordLabel}",
      fields: [{ token: "recordLabel", path: "result.recordLabel" }],
    },
    suggestedFollowUps: [
      { label: "Assign account manager", actionId: "clients.assignAccountManager" },
    ],
  },
  handler: {
    async validate(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) return ws.validation;
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) return { ok: false, errors: resolved.errors, warnings: [] };
      if (normalizeClientAccountStatus(resolved.client.accountStatus) !== "Archived") {
        return {
          ok: false,
          errors: [
            `“${resolved.client.companyName}” is ${resolved.client.accountStatus}, not Archived. Only archived clients can be restored.`,
          ],
          warnings: [],
        };
      }
      return {
        ok: true,
        errors: [],
        warnings: ["Restored clients return to Dormant — re-activate separately if needed."],
      };
    },

    async preview(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return {
          summary: "Restore client (blocked)",
          affectedRecords: [],
          warnings: ws.validation.errors,
          reversible: true,
        };
      }
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) {
        return {
          summary: "Restore client (not found)",
          affectedRecords: [],
          warnings: resolved.errors,
          reversible: true,
        };
      }
      return {
        summary: `Restore “${resolved.client.companyName}” (Archived → Dormant)`,
        affectedRecords: [
          {
            type: "client",
            id: resolved.client.id,
            label: resolved.client.companyName,
            change: "Archived → Dormant",
          },
        ],
        warnings: ["Client will be Dormant after restore, not Active."],
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
      const before = clientSnapshot(resolved.client);
      const restored = await restoreInternalClient(resolved.client.id, ws.scope);
      const after = clientSnapshot(restored);
      return {
        ok: true,
        message: `Restored “${restored.companyName}” to Dormant.`,
        recordId: restored.id,
        recordLabel: restored.companyName,
        beforeState: { ...before, correlationId: ctx.planId, clientId: restored.id },
        afterState: { ...after, correlationId: ctx.planId, clientId: restored.id },
        output: { clientId: restored.id, accountStatus: restored.accountStatus },
      };
    },

    async rollback(_input, ctx) {
      const clientId = asTrimmedString(ctx.executeResult.recordId);
      if (!clientId) {
        return { ok: false, message: "Missing client id.", error: "NO_RECORD" };
      }
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return { ok: false, message: ws.validation.errors.join("; "), error: "VALIDATION" };
      }
      try {
        await archiveInternalClient(clientId, ws.scope);
        return { ok: true, message: `Re-archived client ${clientId}.` };
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
