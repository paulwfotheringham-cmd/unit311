import { updateInternalClient } from "@/lib/internal-clients-service";
import type { AssistantActionDefinition } from "../../types";
import {
  asTrimmedString,
  clientSnapshot,
  describeFieldChanges,
  findPotentialDuplicates,
  pickClientPatch,
  requireWorkspaceScope,
  resolveClientRef,
} from "./helpers";

export const updateClientAction: AssistantActionDefinition = {
  id: "clients.updateClient",
  name: "Update client",
  description:
    "Update fields on an existing client (phone, email, name, address, industry, etc.). Use for requests like “Change Acme Ltd’s phone number to …”.",
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
      companyName: { type: "string" },
      phone: { type: "string" },
      email: { type: "string" },
      primaryContact: { type: "string" },
      industry: { type: "string" },
      region: { type: "string" },
      notes: { type: "string" },
    },
  },
  capability: {
    id: "clients.update",
    businessObject: "Client",
    intentExamples: [
      "Update a client",
      "Change Acme Ltd's phone number",
      "Set the email for Orion Holdings",
      "Edit client details",
    ],
    semanticAliases: ["client", "customer", "update", "change", "edit", "amend", "set"],
    entityExtraction: {
      primaryNameFields: ["clientName", "companyName"],
      fields: [
        { field: "clientName", from: "named_entity" },
        { field: "companyName", from: "named_entity" },
        { field: "email", from: "email" },
        { field: "phone", from: "phone" },
        { field: "primaryContact", from: "person" },
      ],
    },
    confirmationPolicy: "always",
    successFormatter: {
      template: "Client updated.\n\nName\n{recordLabel}",
      fields: [{ token: "recordLabel", path: "result.recordLabel" }],
    },
    suggestedFollowUps: [
      { label: "Add contact", actionId: "clients.addClientContact" },
      { label: "Assign account manager", actionId: "clients.assignAccountManager" },
    ],
  },
  handler: {
    async validate(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) return ws.validation;

      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) return { ok: false, errors: resolved.errors, warnings: [] };

      const patch = pickClientPatch(input);
      const keys = Object.keys(patch).filter((k) => k !== "notes" || patch.notes !== undefined);
      // notes alone counts; empty patch fails
      const meaningful = Object.entries(patch).filter(([, v]) => v !== undefined);
      if (!meaningful.length) {
        return {
          ok: false,
          errors: ["Provide at least one field to update (phone, email, companyName, …)."],
          warnings: [],
        };
      }

      const warnings: string[] = [];
      if (patch.companyName) {
        const duplicates = await findPotentialDuplicates(
          patch.companyName,
          ws.scope,
          resolved.client.id,
        );
        if (duplicates.length) {
          warnings.push(
            `Renaming may collide with: ${duplicates
              .slice(0, 3)
              .map((c) => c.companyName)
              .join(", ")}.`,
          );
        }
      }

      // Stash resolved id for execute via mutating a copy — execute re-resolves.
      void keys;
      return { ok: true, errors: [], warnings };
    },

    async preview(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return {
          summary: "Update client (blocked)",
          affectedRecords: [],
          warnings: ws.validation.errors,
          reversible: true,
        };
      }
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) {
        return {
          summary: "Update client (not found)",
          affectedRecords: [],
          warnings: resolved.errors,
          reversible: true,
        };
      }
      const before = clientSnapshot(resolved.client);
      const patch = pickClientPatch(input);
      const projected = { ...before, ...patch };
      const changes = describeFieldChanges(before, projected as Record<string, unknown>);
      return {
        summary: `Update “${resolved.client.companyName}” (${changes.length} field${
          changes.length === 1 ? "" : "s"
        })`,
        affectedRecords: [
          {
            type: "client",
            id: resolved.client.id,
            label: resolved.client.companyName,
            change: changes.map((c) => `${c.field}: ${String(c.from)} → ${String(c.to)}`).join("; "),
          },
        ],
        warnings: [],
        reversible: true,
        estimatedSideEffects: changes.map(
          (c) => `${c.field}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`,
        ),
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
      const patch = pickClientPatch(input);
      const updated = await updateInternalClient(resolved.client.id, patch, ws.scope);
      const after = clientSnapshot(updated);
      return {
        ok: true,
        message: `Updated “${updated.companyName}”.`,
        recordId: updated.id,
        recordLabel: updated.companyName,
        beforeState: { ...before, correlationId: ctx.planId, clientId: updated.id },
        afterState: { ...after, correlationId: ctx.planId, clientId: updated.id },
        output: {
          clientId: updated.id,
          changes: describeFieldChanges(before, after),
        },
      };
    },

    async rollback(_input, ctx) {
      const before = ctx.executeResult.beforeState;
      if (!before || typeof before !== "object") {
        return { ok: false, message: "No previous state to restore.", error: "NO_BEFORE" };
      }
      const clientId = asTrimmedString(before.id) || asTrimmedString(ctx.executeResult.recordId);
      if (!clientId) {
        return { ok: false, message: "Missing client id for rollback.", error: "NO_RECORD" };
      }
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return { ok: false, message: ws.validation.errors.join("; "), error: "VALIDATION" };
      }
      try {
        await updateInternalClient(
          clientId,
          {
            companyName: asTrimmedString(before.companyName) || undefined,
            primaryContact: asTrimmedString(before.primaryContact),
            primaryContactFirstName: asTrimmedString(before.primaryContactFirstName),
            primaryContactSurname: asTrimmedString(before.primaryContactSurname),
            email: asTrimmedString(before.email),
            phone: asTrimmedString(before.phone),
            jobTitle: asTrimmedString(before.jobTitle),
            companyAddress: asTrimmedString(before.companyAddress),
            companyCity: asTrimmedString(before.companyCity),
            companyPostcode: asTrimmedString(before.companyPostcode),
            companyCountry: asTrimmedString(before.companyCountry),
            billingAddress: asTrimmedString(before.billingAddress),
            notes: typeof before.notes === "string" ? before.notes : undefined,
            region: (before.region as never) ?? undefined,
            industry: (before.industry as never) ?? undefined,
          },
          ws.scope,
        );
        return { ok: true, message: `Restored previous values for client ${clientId}.` };
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
