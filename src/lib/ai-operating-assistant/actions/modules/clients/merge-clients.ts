import {
  archiveInternalClient,
  restoreInternalClient,
  updateInternalClient,
} from "@/lib/internal-clients-service";
import type { ManagedClient } from "@/lib/client-management-data";
import type { AssistantActionDefinition } from "../../types";
import {
  asTrimmedString,
  clientSnapshot,
  readClientMeta,
  requireWorkspaceScope,
  resolveClientRef,
  writeClientMeta,
} from "./helpers";

function mergeField<T>(survivor: T, donor: T): T {
  if (survivor === null || survivor === undefined) return donor;
  if (typeof survivor === "string" && !survivor.trim()) return donor;
  return survivor;
}

function buildMergedPatch(survivor: ManagedClient, donor: ManagedClient): Partial<ManagedClient> {
  const survivorMeta = readClientMeta(survivor.notes);
  const donorMeta = readClientMeta(donor.notes);

  const contacts = [
    ...(survivorMeta.contacts ?? []),
    ...(donorMeta.contacts ?? []),
  ];
  const locations = [
    ...(survivorMeta.locations ?? []),
    ...(donorMeta.locations ?? []),
  ];

  if (donor.primaryContact?.trim() && survivor.primaryContact?.trim()) {
    contacts.push({
      id: `merged_${donor.id}`,
      name: donor.primaryContact,
      email: donor.email || undefined,
      phone: donor.phone || undefined,
      role: donor.jobTitle || undefined,
      isPrimary: false,
    });
  }

  const meta = {
    accountManager: survivorMeta.accountManager ?? donorMeta.accountManager ?? null,
    contacts,
    locations,
  };

  const notesBase = [survivor.notes, donor.notes]
    .map((n) => n?.replace(/<!--UNIT311_CLIENT_META[\s\S]*?UNIT311_CLIENT_META-->/g, "").trim())
    .filter(Boolean)
    .join("\n\n");

  return {
    companyName: survivor.companyName,
    industry: mergeField(survivor.industry, donor.industry),
    primaryContact: mergeField(survivor.primaryContact, donor.primaryContact),
    primaryContactFirstName: mergeField(
      survivor.primaryContactFirstName ?? "",
      donor.primaryContactFirstName ?? "",
    ),
    primaryContactSurname: mergeField(
      survivor.primaryContactSurname ?? "",
      donor.primaryContactSurname ?? "",
    ),
    email: mergeField(survivor.email, donor.email),
    phone: mergeField(survivor.phone, donor.phone),
    jobTitle: mergeField(survivor.jobTitle ?? "", donor.jobTitle ?? ""),
    region: mergeField(survivor.region, donor.region),
    companyAddress: mergeField(survivor.companyAddress ?? "", donor.companyAddress ?? ""),
    companyCity: mergeField(survivor.companyCity ?? "", donor.companyCity ?? ""),
    companyPostcode: mergeField(survivor.companyPostcode ?? "", donor.companyPostcode ?? ""),
    companyCountry: mergeField(survivor.companyCountry ?? "", donor.companyCountry ?? ""),
    billingAddress: mergeField(survivor.billingAddress, donor.billingAddress),
    taxId: mergeField(survivor.taxId, donor.taxId),
    contractType: mergeField(survivor.contractType, donor.contractType),
    notes: writeClientMeta(
      `${notesBase}\n\nMerged from ${donor.companyName} (${donor.id}) on ${new Date().toISOString().slice(0, 10)}.`.trim(),
      meta,
    ),
  };
}

export const mergeDuplicateClientsAction: AssistantActionDefinition = {
  id: "clients.mergeDuplicateClients",
  name: "Merge duplicate clients",
  description:
    "Merge a duplicate client into a surviving client (copy missing fields, archive the duplicate). Use for “Merge ABC Limited into ABC Ltd”. Input: source (duplicate to archive) and target (survivor).",
  module: "clients",
  requiredPermissions: ["authenticated"],
  confirmationRequired: true,
  auditRequired: true,
  undoCapable: true,
  inputSchema: {
    type: "object",
    properties: {
      sourceClientId: { type: "string", description: "Duplicate client to archive" },
      sourceClientName: { type: "string" },
      targetClientId: { type: "string", description: "Surviving client" },
      targetClientName: { type: "string" },
      fromClientId: { type: "string" },
      fromClientName: { type: "string" },
      intoClientId: { type: "string" },
      intoClientName: { type: "string" },
    },
  },
  capability: {
    id: "clients.merge",
    businessObject: "Client",
    intentExamples: [
      "Merge duplicate clients",
      "Merge ABC Limited into ABC Ltd",
      "Combine these two customer records",
      "Dedupe these clients",
    ],
    semanticAliases: [
      "client",
      "customer",
      "merge",
      "combine",
      "dedupe",
      "duplicate",
    ],
    entityExtraction: {
      primaryNameFields: ["sourceClientName", "targetClientName"],
      fields: [
        { field: "sourceClientName", from: "named_entity" },
        { field: "targetClientName", from: "named_entity" },
        { field: "fromClientName", from: "named_entity" },
        { field: "intoClientName", from: "named_entity" },
      ],
    },
    confirmationPolicy: "always",
    successFormatter: {
      template: "Clients merged.\n\nSurvivor\n{recordLabel}",
      fields: [{ token: "recordLabel", path: "result.recordLabel" }],
    },
  },
  handler: {
    async validate(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) return ws.validation;

      const source = await resolveClientRef(
        {
          clientId:
            asTrimmedString(input.sourceClientId) || asTrimmedString(input.fromClientId),
          clientName:
            asTrimmedString(input.sourceClientName) || asTrimmedString(input.fromClientName),
        },
        ws.scope,
      );
      const target = await resolveClientRef(
        {
          clientId:
            asTrimmedString(input.targetClientId) || asTrimmedString(input.intoClientId),
          clientName:
            asTrimmedString(input.targetClientName) || asTrimmedString(input.intoClientName),
        },
        ws.scope,
      );

      const errors: string[] = [];
      if (!source.ok) errors.push(...source.errors.map((e) => `Source: ${e}`));
      if (!target.ok) errors.push(...target.errors.map((e) => `Target: ${e}`));
      if (source.ok && target.ok && source.client.id === target.client.id) {
        errors.push("Source and target must be different clients.");
      }
      if (errors.length) return { ok: false, errors, warnings: [] };

      return {
        ok: true,
        errors: [],
        warnings: [
          `“${(source as { client: ManagedClient }).client.companyName}” will be archived after merge into “${(target as { client: ManagedClient }).client.companyName}”.`,
          "Linked projects/invoices are not re-parented automatically — review related records after merge.",
        ],
      };
    },

    async preview(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return {
          summary: "Merge clients (blocked)",
          affectedRecords: [],
          warnings: ws.validation.errors,
          reversible: true,
        };
      }
      const source = await resolveClientRef(
        {
          clientId:
            asTrimmedString(input.sourceClientId) || asTrimmedString(input.fromClientId),
          clientName:
            asTrimmedString(input.sourceClientName) || asTrimmedString(input.fromClientName),
        },
        ws.scope,
      );
      const target = await resolveClientRef(
        {
          clientId:
            asTrimmedString(input.targetClientId) || asTrimmedString(input.intoClientId),
          clientName:
            asTrimmedString(input.targetClientName) || asTrimmedString(input.intoClientName),
        },
        ws.scope,
      );
      if (!source.ok || !target.ok) {
        return {
          summary: "Merge clients",
          affectedRecords: [],
          warnings: [
            ...(source.ok ? [] : source.errors),
            ...(target.ok ? [] : target.errors),
          ],
          reversible: true,
        };
      }
      return {
        summary: `Merge “${source.client.companyName}” into “${target.client.companyName}”`,
        affectedRecords: [
          {
            type: "client",
            id: target.client.id,
            label: target.client.companyName,
            change: "survivor — receive merged fields",
          },
          {
            type: "client",
            id: source.client.id,
            label: source.client.companyName,
            change: "duplicate — archive after merge",
          },
        ],
        warnings: [
          "Projects and invoices stay on their original client ids unless re-linked manually.",
        ],
        reversible: true,
        estimatedSideEffects: [
          "Fill empty fields on survivor from duplicate",
          "Archive duplicate client",
        ],
      };
    },

    async execute(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return { ok: false, message: ws.validation.errors.join("; "), error: "VALIDATION" };
      }
      const source = await resolveClientRef(
        {
          clientId:
            asTrimmedString(input.sourceClientId) || asTrimmedString(input.fromClientId),
          clientName:
            asTrimmedString(input.sourceClientName) || asTrimmedString(input.fromClientName),
        },
        ws.scope,
      );
      const target = await resolveClientRef(
        {
          clientId:
            asTrimmedString(input.targetClientId) || asTrimmedString(input.intoClientId),
          clientName:
            asTrimmedString(input.targetClientName) || asTrimmedString(input.intoClientName),
        },
        ws.scope,
      );
      if (!source.ok || !target.ok) {
        return {
          ok: false,
          message: [
            ...(source.ok ? [] : source.errors),
            ...(target.ok ? [] : target.errors),
          ].join("; "),
          error: "NOT_FOUND",
        };
      }
      if (source.client.id === target.client.id) {
        return {
          ok: false,
          message: "Source and target must be different clients.",
          error: "VALIDATION",
        };
      }

      const beforeSurvivor = clientSnapshot(target.client);
      const beforeDuplicate = clientSnapshot(source.client);
      const patch = buildMergedPatch(target.client, source.client);
      const survivor = await updateInternalClient(target.client.id, patch, ws.scope);
      const archived =
        source.client.accountStatus === "Archived"
          ? source.client
          : await archiveInternalClient(source.client.id, ws.scope);

      return {
        ok: true,
        message: `Merged “${source.client.companyName}” into “${survivor.companyName}” and archived the duplicate.`,
        recordId: survivor.id,
        recordLabel: survivor.companyName,
        beforeState: {
          survivor: beforeSurvivor,
          duplicate: beforeDuplicate,
          correlationId: ctx.planId,
          clientId: survivor.id,
        },
        afterState: {
          survivor: clientSnapshot(survivor),
          duplicate: clientSnapshot(archived),
          correlationId: ctx.planId,
          clientId: survivor.id,
        },
        output: {
          survivorClientId: survivor.id,
          archivedClientId: archived.id,
        },
      };
    },

    async rollback(_input, ctx) {
      const before = ctx.executeResult.beforeState;
      if (!before || typeof before !== "object") {
        return { ok: false, message: "Missing before-state.", error: "NO_BEFORE" };
      }
      const survivor = before.survivor as Record<string, unknown> | undefined;
      const duplicate = before.duplicate as Record<string, unknown> | undefined;
      if (!survivor?.id || !duplicate?.id || typeof survivor.notes !== "string") {
        return { ok: false, message: "Incomplete merge before-state.", error: "NO_BEFORE" };
      }
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return { ok: false, message: ws.validation.errors.join("; "), error: "VALIDATION" };
      }
      try {
        await updateInternalClient(
          String(survivor.id),
          {
            companyName: asTrimmedString(survivor.companyName) || undefined,
            primaryContact: asTrimmedString(survivor.primaryContact),
            primaryContactFirstName: asTrimmedString(survivor.primaryContactFirstName),
            primaryContactSurname: asTrimmedString(survivor.primaryContactSurname),
            email: asTrimmedString(survivor.email),
            phone: asTrimmedString(survivor.phone),
            jobTitle: asTrimmedString(survivor.jobTitle),
            companyAddress: asTrimmedString(survivor.companyAddress),
            companyCity: asTrimmedString(survivor.companyCity),
            companyPostcode: asTrimmedString(survivor.companyPostcode),
            companyCountry: asTrimmedString(survivor.companyCountry),
            billingAddress: asTrimmedString(survivor.billingAddress),
            taxId: asTrimmedString(survivor.taxId),
            notes: survivor.notes,
            region: (survivor.region as never) ?? undefined,
            industry: (survivor.industry as never) ?? undefined,
            contractType: (survivor.contractType as never) ?? undefined,
          },
          ws.scope,
        );
        const dupStatus = asTrimmedString(duplicate.accountStatus);
        if (dupStatus && dupStatus !== "Archived") {
          await restoreInternalClient(String(duplicate.id), ws.scope);
          if (dupStatus !== "Dormant") {
            await updateInternalClient(
              String(duplicate.id),
              { accountStatus: dupStatus as never },
              ws.scope,
            );
          }
        }
        return {
          ok: true,
          message: `Rolled back merge: restored survivor and un-archived duplicate where possible.`,
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
