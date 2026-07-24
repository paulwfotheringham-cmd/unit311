import { updateInternalClient } from "@/lib/internal-clients-service";
import type { ManagedClient } from "@/lib/client-management-data";
import type { AssistantActionDefinition } from "../../types";
import {
  asTrimmedString,
  clientSnapshot,
  listEffectiveContacts,
  newContactId,
  readClientMeta,
  requireWorkspaceScope,
  resolveClientRef,
  writeClientMeta,
  type ClientContactRecord,
} from "./helpers";

function applyContactsToClient(
  client: ManagedClient,
  contacts: ClientContactRecord[],
  primary?: ClientContactRecord | null,
): Partial<ManagedClient> {
  const meta = readClientMeta(client.notes);
  const secondary = contacts.filter((c) => !c.isPrimary && !c.id.startsWith("primary:"));
  meta.contacts = secondary;
  const notes = writeClientMeta(client.notes, meta);
  const patch: Partial<ManagedClient> = { notes };
  if (primary) {
    patch.primaryContact = primary.name;
    patch.email = primary.email ?? client.email;
    patch.phone = primary.phone ?? client.phone;
    patch.jobTitle = primary.role ?? client.jobTitle;
    const parts = primary.name.split(/\s+/);
    if (parts.length >= 2) {
      patch.primaryContactFirstName = parts[0];
      patch.primaryContactSurname = parts.slice(1).join(" ");
    }
  }
  return patch;
}

export const addClientContactAction: AssistantActionDefinition = {
  id: "clients.addClientContact",
  name: "Add client contact",
  description:
    "Add a contact to a client. Sets primary contact fields when empty; otherwise stores an additional contact on the client record.",
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
      contactName: { type: "string" },
      name: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      role: { type: "string" },
      jobTitle: { type: "string" },
      makePrimary: { type: "boolean" },
    },
    required: ["contactName"],
  },
  capability: {
    id: "clients.addContact",
    businessObject: "ClientContact",
    intentExamples: [
      "Add a contact to a client",
      "Add Jane Doe as a contact for Acme Ltd",
      "Create a client contact",
      "Add a stakeholder to this customer",
    ],
    semanticAliases: ["client", "customer", "contact", "person", "stakeholder", "add", "create"],
    entityExtraction: {
      primaryNameFields: ["contactName", "name"],
      fields: [
        { field: "contactName", from: "person" },
        { field: "name", from: "person" },
        { field: "clientName", from: "named_entity" },
        { field: "email", from: "email" },
        { field: "phone", from: "phone" },
      ],
    },
    confirmationPolicy: "always",
    successFormatter: {
      template: "Contact added.\n\nName\n{recordLabel}",
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
      const name = asTrimmedString(input.contactName) || asTrimmedString(input.name);
      if (!name) return { ok: false, errors: ["contactName is required."], warnings: [] };
      return { ok: true, errors: [], warnings: [] };
    },

    async preview(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return {
          summary: "Add contact (blocked)",
          affectedRecords: [],
          warnings: ws.validation.errors,
          reversible: true,
        };
      }
      const resolved = await resolveClientRef(input, ws.scope);
      const name = asTrimmedString(input.contactName) || asTrimmedString(input.name);
      if (!resolved.ok) {
        return {
          summary: "Add contact",
          affectedRecords: [],
          warnings: resolved.errors,
          reversible: true,
        };
      }
      const hasPrimary = Boolean(resolved.client.primaryContact?.trim());
      const makePrimary = input.makePrimary === true || !hasPrimary;
      return {
        summary: `Add contact “${name}” on “${resolved.client.companyName}”${
          makePrimary ? " (as primary)" : ""
        }`,
        affectedRecords: [
          {
            type: "client",
            id: resolved.client.id,
            label: resolved.client.companyName,
            change: makePrimary ? "set primary contact" : "add secondary contact",
          },
          { type: "contact", label: name, change: "create" },
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
      const name = asTrimmedString(input.contactName) || asTrimmedString(input.name);
      const email = asTrimmedString(input.email) || undefined;
      const phone = asTrimmedString(input.phone) || undefined;
      const role =
        asTrimmedString(input.role) || asTrimmedString(input.jobTitle) || undefined;
      const hasPrimary = Boolean(resolved.client.primaryContact?.trim());
      const makePrimary = input.makePrimary === true || !hasPrimary;
      const before = clientSnapshot(resolved.client);
      const contact: ClientContactRecord = {
        id: makePrimary ? `primary:${resolved.client.id}` : newContactId(),
        name,
        email,
        phone,
        role,
        isPrimary: makePrimary,
      };

      let patch: Partial<ManagedClient>;
      if (makePrimary) {
        const existing = listEffectiveContacts(resolved.client).filter((c) => !c.isPrimary);
        // If replacing primary and old primary had data, keep old as secondary.
        if (hasPrimary && input.makePrimary === true) {
          const oldPrimary = listEffectiveContacts(resolved.client).find((c) => c.isPrimary);
          if (oldPrimary && oldPrimary.name) {
            existing.push({
              id: newContactId(),
              name: oldPrimary.name,
              email: oldPrimary.email,
              phone: oldPrimary.phone,
              role: oldPrimary.role,
              isPrimary: false,
            });
          }
        }
        patch = applyContactsToClient(resolved.client, existing, contact);
      } else {
        const existing = listEffectiveContacts(resolved.client).filter((c) => !c.isPrimary);
        existing.push(contact);
        patch = applyContactsToClient(resolved.client, existing, null);
      }

      const updated = await updateInternalClient(resolved.client.id, patch, ws.scope);
      const after = clientSnapshot(updated);
      return {
        ok: true,
        message: `Added contact “${name}” on “${updated.companyName}”.`,
        recordId: updated.id,
        recordLabel: updated.companyName,
        beforeState: { ...before, correlationId: ctx.planId, clientId: updated.id },
        afterState: { ...after, correlationId: ctx.planId, clientId: updated.id },
        output: { clientId: updated.id, contact },
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
            primaryContact: asTrimmedString(before.primaryContact),
            primaryContactFirstName: asTrimmedString(before.primaryContactFirstName),
            primaryContactSurname: asTrimmedString(before.primaryContactSurname),
            email: asTrimmedString(before.email),
            phone: asTrimmedString(before.phone),
            jobTitle: asTrimmedString(before.jobTitle),
            notes: typeof before.notes === "string" ? before.notes : undefined,
          },
          ws.scope,
        );
        return { ok: true, message: `Restored contacts for client ${clientId}.` };
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

export const updateClientContactAction: AssistantActionDefinition = {
  id: "clients.updateClientContact",
  name: "Update client contact",
  description: "Update an existing client contact by contactId or contact name.",
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
      contactId: { type: "string" },
      contactName: { type: "string" },
      name: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      role: { type: "string" },
    },
  },
  capability: {
    id: "clients.updateContact",
    businessObject: "ClientContact",
    intentExamples: [
      "Update a client contact",
      "Change Jane's email on Acme Ltd",
      "Edit a contact phone number",
    ],
    semanticAliases: ["client", "contact", "update", "change", "edit"],
    entityExtraction: {
      primaryNameFields: ["contactName", "name"],
      fields: [
        { field: "contactName", from: "person" },
        { field: "clientName", from: "named_entity" },
        { field: "email", from: "email" },
        { field: "phone", from: "phone" },
      ],
    },
    confirmationPolicy: "always",
    successFormatter: {
      template: "Contact updated.\n\nName\n{recordLabel}",
      fields: [{ token: "recordLabel", path: "result.recordLabel" }],
    },
  },
  handler: {
    async validate(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) return ws.validation;
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) return { ok: false, errors: resolved.errors, warnings: [] };
      const contacts = listEffectiveContacts(resolved.client);
      const contactId = asTrimmedString(input.contactId);
      const contactName = asTrimmedString(input.contactName);
      const match = contacts.find(
        (c) =>
          (contactId && c.id === contactId) ||
          (contactName && c.name.toLowerCase() === contactName.toLowerCase()),
      );
      if (!match) {
        return {
          ok: false,
          errors: [
            `Contact not found on “${resolved.client.companyName}”. Provide contactId or exact contactName.`,
          ],
          warnings: [],
        };
      }
      return { ok: true, errors: [], warnings: [] };
    },

    async preview(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return {
          summary: "Update contact (blocked)",
          affectedRecords: [],
          warnings: ws.validation.errors,
          reversible: true,
        };
      }
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) {
        return {
          summary: "Update contact",
          affectedRecords: [],
          warnings: resolved.errors,
          reversible: true,
        };
      }
      const contactName = asTrimmedString(input.contactName) || asTrimmedString(input.name);
      return {
        summary: `Update contact on “${resolved.client.companyName}”`,
        affectedRecords: [
          {
            type: "client",
            id: resolved.client.id,
            label: resolved.client.companyName,
            change: "update contact",
          },
          { type: "contact", label: contactName || asTrimmedString(input.contactId), change: "update" },
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
      const contacts = listEffectiveContacts(resolved.client);
      const contactId = asTrimmedString(input.contactId);
      const contactName = asTrimmedString(input.contactName);
      const match = contacts.find(
        (c) =>
          (contactId && c.id === contactId) ||
          (contactName && c.name.toLowerCase() === contactName.toLowerCase()),
      );
      if (!match) {
        return { ok: false, message: "Contact not found.", error: "NOT_FOUND" };
      }

      const nextName = asTrimmedString(input.name) || match.name;
      const nextEmail =
        input.email !== undefined ? asTrimmedString(input.email) : match.email;
      const nextPhone =
        input.phone !== undefined ? asTrimmedString(input.phone) : match.phone;
      const nextRole =
        input.role !== undefined
          ? asTrimmedString(input.role)
          : input.jobTitle !== undefined
            ? asTrimmedString(input.jobTitle)
            : match.role;

      const updatedContact: ClientContactRecord = {
        ...match,
        name: nextName,
        email: nextEmail || undefined,
        phone: nextPhone || undefined,
        role: nextRole || undefined,
      };

      const before = clientSnapshot(resolved.client);
      let patch: Partial<ManagedClient>;
      if (match.isPrimary) {
        const secondary = contacts.filter((c) => !c.isPrimary);
        patch = applyContactsToClient(resolved.client, secondary, updatedContact);
      } else {
        const secondary = contacts
          .filter((c) => !c.isPrimary)
          .map((c) => (c.id === match.id ? updatedContact : c));
        patch = applyContactsToClient(resolved.client, secondary, null);
      }

      const updated = await updateInternalClient(resolved.client.id, patch, ws.scope);
      const after = clientSnapshot(updated);
      return {
        ok: true,
        message: `Updated contact “${updatedContact.name}” on “${updated.companyName}”.`,
        recordId: updated.id,
        recordLabel: updated.companyName,
        beforeState: { ...before, correlationId: ctx.planId, clientId: updated.id },
        afterState: { ...after, correlationId: ctx.planId, clientId: updated.id },
        output: { clientId: updated.id, contact: updatedContact },
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
            primaryContact: asTrimmedString(before.primaryContact),
            primaryContactFirstName: asTrimmedString(before.primaryContactFirstName),
            primaryContactSurname: asTrimmedString(before.primaryContactSurname),
            email: asTrimmedString(before.email),
            phone: asTrimmedString(before.phone),
            jobTitle: asTrimmedString(before.jobTitle),
            notes: typeof before.notes === "string" ? before.notes : undefined,
          },
          ws.scope,
        );
        return { ok: true, message: `Restored contacts for client ${clientId}.` };
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

export const removeClientContactAction: AssistantActionDefinition = {
  id: "clients.removeClientContact",
  name: "Remove client contact",
  description: "Remove a secondary client contact, or clear primary contact fields when removing the primary.",
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
      contactId: { type: "string" },
      contactName: { type: "string" },
    },
  },
  capability: {
    id: "clients.removeContact",
    businessObject: "ClientContact",
    intentExamples: [
      "Remove a client contact",
      "Delete Jane from Acme Ltd contacts",
      "Remove this stakeholder",
    ],
    semanticAliases: ["client", "contact", "remove", "delete"],
    entityExtraction: {
      primaryNameFields: ["contactName"],
      fields: [
        { field: "contactName", from: "person" },
        { field: "clientName", from: "named_entity" },
      ],
    },
    confirmationPolicy: "always",
    successFormatter: {
      template: "Contact removed.\n\nName\n{recordLabel}",
      fields: [{ token: "recordLabel", path: "result.recordLabel" }],
    },
  },
  handler: {
    async validate(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) return ws.validation;
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) return { ok: false, errors: resolved.errors, warnings: [] };
      const contacts = listEffectiveContacts(resolved.client);
      const contactId = asTrimmedString(input.contactId);
      const contactName = asTrimmedString(input.contactName);
      const match = contacts.find(
        (c) =>
          (contactId && c.id === contactId) ||
          (contactName && c.name.toLowerCase() === contactName.toLowerCase()),
      );
      if (!match) {
        return { ok: false, errors: ["Contact not found on this client."], warnings: [] };
      }
      return {
        ok: true,
        errors: [],
        warnings: match.isPrimary
          ? ["Removing the primary contact clears name/email/phone on the client record."]
          : [],
      };
    },

    async preview(input, ctx) {
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        return {
          summary: "Remove contact (blocked)",
          affectedRecords: [],
          warnings: ws.validation.errors,
          reversible: true,
        };
      }
      const resolved = await resolveClientRef(input, ws.scope);
      if (!resolved.ok) {
        return {
          summary: "Remove contact",
          affectedRecords: [],
          warnings: resolved.errors,
          reversible: true,
        };
      }
      return {
        summary: `Remove contact from “${resolved.client.companyName}”`,
        affectedRecords: [
          {
            type: "client",
            id: resolved.client.id,
            label: resolved.client.companyName,
            change: "remove contact",
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
      const contacts = listEffectiveContacts(resolved.client);
      const contactId = asTrimmedString(input.contactId);
      const contactName = asTrimmedString(input.contactName);
      const match = contacts.find(
        (c) =>
          (contactId && c.id === contactId) ||
          (contactName && c.name.toLowerCase() === contactName.toLowerCase()),
      );
      if (!match) {
        return { ok: false, message: "Contact not found.", error: "NOT_FOUND" };
      }

      const before = clientSnapshot(resolved.client);
      let patch: Partial<ManagedClient>;
      if (match.isPrimary) {
        const secondary = contacts.filter((c) => !c.isPrimary);
        const nextPrimary = secondary.shift() ?? null;
        patch = applyContactsToClient(
          resolved.client,
          secondary,
          nextPrimary
            ? { ...nextPrimary, id: `primary:${resolved.client.id}`, isPrimary: true }
            : {
                id: `primary:${resolved.client.id}`,
                name: "",
                email: "",
                phone: "",
                role: "",
                isPrimary: true,
              },
        );
        if (!nextPrimary) {
          patch.primaryContact = "";
          patch.primaryContactFirstName = "";
          patch.primaryContactSurname = "";
          patch.email = "";
          patch.phone = "";
          patch.jobTitle = "";
        }
      } else {
        const secondary = contacts.filter((c) => !c.isPrimary && c.id !== match.id);
        patch = applyContactsToClient(resolved.client, secondary, null);
      }

      const updated = await updateInternalClient(resolved.client.id, patch, ws.scope);
      const after = clientSnapshot(updated);
      return {
        ok: true,
        message: `Removed contact “${match.name}” from “${updated.companyName}”.`,
        recordId: updated.id,
        recordLabel: updated.companyName,
        beforeState: { ...before, correlationId: ctx.planId, clientId: updated.id },
        afterState: { ...after, correlationId: ctx.planId, clientId: updated.id },
        output: { clientId: updated.id, removedContactId: match.id },
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
            primaryContact: asTrimmedString(before.primaryContact),
            primaryContactFirstName: asTrimmedString(before.primaryContactFirstName),
            primaryContactSurname: asTrimmedString(before.primaryContactSurname),
            email: asTrimmedString(before.email),
            phone: asTrimmedString(before.phone),
            jobTitle: asTrimmedString(before.jobTitle),
            notes: typeof before.notes === "string" ? before.notes : undefined,
          },
          ws.scope,
        );
        return { ok: true, message: `Restored contacts for client ${clientId}.` };
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
