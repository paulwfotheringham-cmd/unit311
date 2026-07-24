import {
  createInternalClient,
  deleteInternalClient,
} from "@/lib/internal-clients-service";
import { eaRethrow, eaStage, eaStop } from "@/lib/ai-operating-assistant/ea-forensic-trace";
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
  capability: {
    id: "clients.create",
    businessObject: "Client",
    intentExamples: [
      "Create a client",
      "Add a customer",
      "Register a client",
      "We've signed a new customer",
      "Create a new client called Acme Engineering Ltd in London",
      "Onboard a new customer named Orion Ltd",
    ],
    semanticAliases: [
      "client",
      "customer",
      "account",
      "company",
      "create",
      "add",
      "register",
      "onboard",
      "signed",
      "sign",
      "new",
    ],
    entityExtraction: {
      primaryNameFields: ["companyName"],
      fields: [
        { field: "companyName", from: "named_entity" },
        { field: "companyCity", from: "location" },
        { field: "email", from: "email" },
        { field: "phone", from: "phone" },
        { field: "primaryContact", from: "person" },
      ],
    },
    confirmationPolicy: "always",
    successFormatter: {
      template:
        "Client created.\n\nName\n{recordLabel}\n\n{locationBlock}Would you like to add a contact, assign an account manager, or create a project?",
      fields: [
        { token: "recordLabel", path: "result.recordLabel" },
        { token: "locationBlock", path: "input.companyCity" },
      ],
    },
    suggestedFollowUps: [
      { label: "Add contact", actionId: "clients.addClientContact" },
      { label: "Assign account manager", actionId: "clients.assignAccountManager" },
      { label: "Create project", actionId: "projects.createProject" },
    ],
    relationships: {
      suggestedNext: [
        { label: "Create Project", actionId: "projects.createProject", reason: "Client Created" },
        { label: "Add Contact", actionId: "clients.addClientContact", reason: "Client Created" },
        {
          label: "Assign Account Manager",
          actionId: "clients.assignAccountManager",
          reason: "Client Created",
        },
      ],
    },
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
      const ws = requireWorkspaceScope(ctx.business);
      if (!ws.ok) {
        eaStop("Database write", ws.validation.errors.join("; "), {
          attempted: false,
          succeeded: false,
          recordId: null,
          planId: ctx.planId,
        });
        return { ok: false, message: ws.validation.errors.join("; "), error: "VALIDATION" };
      }
      const companyName = asTrimmedString(input.companyName) || asTrimmedString(input.name);
      const patch = pickClientPatch({ ...input, companyName });

      eaStage("Database write", {
        attempted: true,
        succeeded: false,
        recordId: null,
        table: "internal_clients",
        companyName,
        workspaceId: ws.scope.workspaceId ?? null,
        planId: ctx.planId,
        input: patch,
      });

      try {
        const created = await createInternalClient(
          {
            ...patch,
            companyName,
            workspaceId: ws.scope.workspaceId ?? undefined,
          },
          ws.scope,
        );

        eaStage("Database write", {
          attempted: true,
          succeeded: true,
          recordId: created.id,
          companyName: created.companyName,
          planId: ctx.planId,
        });

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
      } catch (error) {
        eaStop("Database write", error instanceof Error ? error.message : String(error), {
          attempted: true,
          succeeded: false,
          recordId: null,
          planId: ctx.planId,
          stack: error instanceof Error ? error.stack : undefined,
        });
        eaRethrow("Database write", error, {
          planId: ctx.planId,
          companyName,
          workspaceId: ws.scope.workspaceId ?? null,
        });
      }
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
        eaRethrow("Database write / rollback", error, { clientId });
      }
    },
  },
};
