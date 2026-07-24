import { updateInternalClient } from "@/lib/internal-clients-service";
import type { ManagedClient } from "@/lib/client-management-data";
import type { AssistantActionDefinition } from "../../types";
import {
  asTrimmedString,
  clientSnapshot,
  listEffectiveLocations,
  newLocationId,
  readClientMeta,
  requireWorkspaceScope,
  resolveClientRef,
  writeClientMeta,
  type ClientLocationRecord,
} from "./helpers";

export const createClientLocationAction: AssistantActionDefinition = {
  id: "clients.createClientLocation",
  name: "Create client location",
  description:
    "Add a location/address for a client. Sets company address fields when empty (primary); otherwise stores an additional location on the client record.",
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
      label: { type: "string" },
      address: { type: "string" },
      companyAddress: { type: "string" },
      city: { type: "string" },
      companyCity: { type: "string" },
      postcode: { type: "string" },
      companyPostcode: { type: "string" },
      country: { type: "string" },
      companyCountry: { type: "string" },
      region: { type: "string" },
      makePrimary: { type: "boolean" },
    },
  },
  capability: {
    businessObject: "ClientLocation",
    intentExamples: [
      "Add a client location",
      "Create an office address for Acme Ltd",
      "Add a site for this customer",
      "Set the company address",
    ],
    semanticAliases: [
      "client",
      "customer",
      "location",
      "office",
      "address",
      "site",
      "create",
      "add",
    ],
    entityExtraction: {
      primaryNameFields: ["clientName", "label"],
      fields: [
        { field: "clientName", from: "named_entity" },
        { field: "city", from: "location" },
        { field: "companyCity", from: "location" },
        { field: "address", from: "named_entity" },
      ],
    },
    confirmationPolicy: "always",
    successFormatter: {
      template: "Client location created.\n\nLocation\n{recordLabel}",
      fields: [{ token: "recordLabel", path: "result.recordLabel" }],
    },
  },
  handler: {
    async validate(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) return ws.validation;
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) return { ok: false, errors: resolved.errors, warnings: [] };
      const address =
        asTrimmedString(input.address) ||
        asTrimmedString(input.companyAddress) ||
        asTrimmedString(input.city) ||
        asTrimmedString(input.companyCity) ||
        asTrimmedString(input.country) ||
        asTrimmedString(input.companyCountry);
      if (!address) {
        return {
          ok: false,
          errors: ["Provide at least address, city, or country for the location."],
          warnings: [],
        };
      }
      return { ok: true, errors: [], warnings: [] };
    },

    async preview(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return {
          summary: "Create location (blocked)",
          affectedRecords: [],
          warnings: ws.validation.errors,
          reversible: true,
        };
      }
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) {
        return {
          summary: "Create location",
          affectedRecords: [],
          warnings: resolved.errors,
          reversible: true,
        };
      }
      const hasPrimary = listEffectiveLocations(resolved.client).some((l) => l.isPrimary);
      const makePrimary = input.makePrimary === true || !hasPrimary;
      const label = asTrimmedString(input.label) || (makePrimary ? "Primary" : "Additional");
      return {
        summary: `Add location “${label}” on “${resolved.client.companyName}”`,
        affectedRecords: [
          {
            type: "client",
            id: resolved.client.id,
            label: resolved.client.companyName,
            change: makePrimary ? "set primary address" : "add secondary location",
          },
        ],
        warnings: [],
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

      const address =
        asTrimmedString(input.address) || asTrimmedString(input.companyAddress);
      const city = asTrimmedString(input.city) || asTrimmedString(input.companyCity);
      const postcode =
        asTrimmedString(input.postcode) || asTrimmedString(input.companyPostcode);
      const country =
        asTrimmedString(input.country) || asTrimmedString(input.companyCountry);
      const region = asTrimmedString(input.region);
      const hasPrimary = listEffectiveLocations(resolved.client).some((l) => l.isPrimary);
      const makePrimary = input.makePrimary === true || !hasPrimary;
      const label = asTrimmedString(input.label) || (makePrimary ? "Primary" : "Additional");

      const before = clientSnapshot(resolved.client);
      let patch: Partial<ManagedClient>;

      if (makePrimary) {
        const meta = readClientMeta(resolved.client.notes);
        if (hasPrimary && input.makePrimary === true) {
          const old = listEffectiveLocations(resolved.client).find((l) => l.isPrimary);
          if (old) {
            meta.locations = [
              ...(meta.locations ?? []).filter((l) => !l.isPrimary),
              {
                id: newLocationId(),
                label: old.label || "Previous primary",
                address: old.address,
                city: old.city,
                postcode: old.postcode,
                country: old.country,
                region: old.region,
                isPrimary: false,
              },
            ];
          }
        }
        patch = {
          companyAddress: address || resolved.client.companyAddress,
          companyCity: city || resolved.client.companyCity,
          companyPostcode: postcode || resolved.client.companyPostcode,
          companyCountry: country || resolved.client.companyCountry,
          region: (region || resolved.client.region) as ManagedClient["region"],
          notes: writeClientMeta(resolved.client.notes, meta),
        };
      } else {
        const meta = readClientMeta(resolved.client.notes);
        const location: ClientLocationRecord = {
          id: newLocationId(),
          label,
          address: address || undefined,
          city: city || undefined,
          postcode: postcode || undefined,
          country: country || undefined,
          region: region || undefined,
          isPrimary: false,
        };
        meta.locations = [...(meta.locations ?? []), location];
        patch = { notes: writeClientMeta(resolved.client.notes, meta) };
      }

      const updated = await updateInternalClient(resolved.client.id, patch, ws.scope);
      const after = clientSnapshot(updated);
      return {
        ok: true,
        message: `Added location on “${updated.companyName}”.`,
        recordId: updated.id,
        recordLabel: updated.companyName,
        beforeState: { ...before, correlationId: ctx.planId, clientId: updated.id },
        afterState: { ...after, correlationId: ctx.planId, clientId: updated.id },
        output: { clientId: updated.id, label, makePrimary },
      };
    },

    async rollback(_input, ctx) {
      const before = ctx.executeResult.beforeState;
      const clientId = asTrimmedString(before?.id) || asTrimmedString(ctx.executeResult.recordId);
      if (!clientId || !before) {
        return { ok: false, message: "Missing before-state.", error: "NO_BEFORE" };
      }
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return { ok: false, message: ws.validation.errors.join("; "), error: "VALIDATION" };
      }
      try {
        await updateInternalClient(
          clientId,
          {
            companyAddress: asTrimmedString(before.companyAddress),
            companyCity: asTrimmedString(before.companyCity),
            companyPostcode: asTrimmedString(before.companyPostcode),
            companyCountry: asTrimmedString(before.companyCountry),
            region: (before.region as never) ?? undefined,
            notes: typeof before.notes === "string" ? before.notes : undefined,
          },
          ws.scope,
        );
        return { ok: true, message: `Restored location fields for client ${clientId}.` };
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
