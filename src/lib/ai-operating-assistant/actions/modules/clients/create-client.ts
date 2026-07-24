import {
  createInternalClient,
  deleteInternalClient,
} from "@/lib/internal-clients-service";
import type { AssistantActionDefinition } from "../../types";
import {
  asTrimmedString,
  clientSnapshot,
  findPotentialDuplicates,
  pickClientPatch,
  requireWorkspaceScope,
} from "./helpers";

export const createClientAction: AssistantActionDefinition = {
  id: "clients.createClient",
  name: "Create client",
  description:
    "Create a new client directory record. Use when the user asks to add/create a client/company (e.g. “Create a client called ABC Engineering Ltd”).",
  module: "clients",
  requiredPermissions: ["authenticated"],
  confirmationRequired: true,
  auditRequired: true,
  undoCapable: true,
  inputSchema: {
    type: "object",
    properties: {
      companyName: { type: "string" },
      primaryContact: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      industry: { type: "string" },
      region: { type: "string" },
      companyCity: { type: "string" },
      companyCountry: { type: "string" },
      notes: { type: "string" },
    },
    required: ["companyName"],
  },
  handler: {
    async validate(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) return ws.validation;

      const companyName = asTrimmedString(input.companyName) || asTrimmedString(input.name);
      const errors: string[] = [];
      const warnings: string[] = [];
      if (!companyName) errors.push("companyName is required.");

      if (companyName) {
        const duplicates = await findPotentialDuplicates(companyName, ws.scope);
        if (duplicates.length) {
          warnings.push(
            `Potential duplicates: ${duplicates
              .slice(0, 5)
              .map((c) => `${c.companyName} (${c.id}, ${c.accountStatus})`)
              .join("; ")}. Consider mergeDuplicateClients instead of creating another record.`,
          );
        }
      }

      return { ok: errors.length === 0, errors, warnings };
    },

    async preview(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      const companyName = asTrimmedString(input.companyName) || asTrimmedString(input.name);
      const duplicates =
        ws.ok && companyName ? await findPotentialDuplicates(companyName, ws.scope) : [];
      const patch = pickClientPatch({ ...input, companyName });
      return {
        summary: `Create client “${companyName || "(unnamed)"}”`,
        affectedRecords: [
          {
            type: "client",
            label: companyName || "New client",
            change: "create",
          },
          ...duplicates.map((d) => ({
            type: "potential_duplicate",
            id: d.id,
            label: d.companyName,
            change: "review",
          })),
        ],
        warnings: duplicates.length
          ? [
              `${duplicates.length} potential duplicate name${duplicates.length === 1 ? "" : "s"} found.`,
            ]
          : [],
        reversible: true,
        estimatedSideEffects: [
          "Creates internal_clients row in the current workspace",
          "May create a client files root folder",
        ],
      };
    },

    async execute(input, ctx) {
      console.info(
        "[clients.createClient] execute",
        "plan=",
        ctx.planId,
        "companyName=",
        asTrimmedString(input.companyName) || asTrimmedString(input.name),
        "workspace=",
        ctx.business.workspace.id,
      );
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        console.error("[clients.createClient] validation", ws.validation.errors);
        return { ok: false, message: ws.validation.errors.join("; "), error: "VALIDATION" };
      }
      const companyName = asTrimmedString(input.companyName) || asTrimmedString(input.name);
      const patch = pickClientPatch({ ...input, companyName });
      const created = await createInternalClient(
        {
          ...patch,
          companyName,
          workspaceId: ws.scope.workspaceId ?? undefined,
        },
        ws.scope,
      );
      console.info("[clients.createClient] created", created.id, created.companyName);
      const after = clientSnapshot(created);
      return {
        ok: true,
        message: `Created client “${created.companyName}”.`,
        recordId: created.id,
        recordLabel: created.companyName,
        beforeState: null,
        afterState: {
          ...after,
          correlationId: ctx.planId,
          clientId: created.id,
        },
        output: { clientId: created.id, companyName: created.companyName },
      };
    },

    async rollback(_input, ctx) {
      const clientId = asTrimmedString(ctx.executeResult.recordId);
      if (!clientId) {
        return { ok: false, message: "No created client id to roll back.", error: "NO_RECORD" };
      }
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return { ok: false, message: ws.validation.errors.join("; "), error: "VALIDATION" };
      }
      try {
        await deleteInternalClient(clientId, ws.scope);
        return { ok: true, message: `Deleted newly created client ${clientId}.` };
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
