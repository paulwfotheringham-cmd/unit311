/**
 * Shared helpers for Clients Action Framework handlers.
 * Reuses internal-clients-service — no duplicated CRUD.
 */

import type { ManagedClient } from "@/lib/client-management-data";
import {
  getInternalClient,
  listInternalClients,
  type ClientsWorkspaceScope,
} from "@/lib/internal-clients-service";
import { listInternalOperators } from "@/lib/internal-operators-service";
import type { AssistantBusinessContext } from "../../../types";
import type { AssistantActionValidationResult } from "../../types";

const META_START = "<!--UNIT311_CLIENT_META";
const META_END = "UNIT311_CLIENT_META-->";

export type ClientContactRecord = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary?: boolean;
};

export type ClientAccountManagerMeta = {
  id: string;
  name: string;
  email?: string | null;
};

export type ClientLocationRecord = {
  id: string;
  label: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  region?: string;
  isPrimary?: boolean;
};

export type ClientMetaBlock = {
  accountManager?: ClientAccountManagerMeta | null;
  contacts?: ClientContactRecord[];
  locations?: ClientLocationRecord[];
};

export function clientsScopeFromBusiness(
  business: AssistantBusinessContext,
): ClientsWorkspaceScope {
  const workspaceId = business.workspace.id?.trim();
  // Empty scope is valid: resolveClientsWorkspaceId falls back to requireCurrentWorkspace()
  // (session/host). Blocking here left Approve unable to write when org lookup was null.
  return { workspaceId: workspaceId || null };
}

export function requireWorkspaceScope(
  business: AssistantBusinessContext,
): { ok: true; scope: ClientsWorkspaceScope } | { ok: false; validation: AssistantActionValidationResult } {
  if (!business.user.id) {
    return {
      ok: false,
      validation: {
        ok: false,
        errors: ["Authentication required to modify clients."],
        warnings: [],
      },
    };
  }
  return { ok: true, scope: clientsScopeFromBusiness(business) };
}

export function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeCompanyKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\b(limited|ltd|llc|inc|plc|co\.?|company)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function clientSnapshot(client: ManagedClient): Record<string, unknown> {
  const meta = readClientMeta(client.notes);
  return {
    id: client.id,
    companyName: client.companyName,
    accountStatus: client.accountStatus,
    industry: client.industry,
    primaryContact: client.primaryContact,
    primaryContactFirstName: client.primaryContactFirstName ?? "",
    primaryContactSurname: client.primaryContactSurname ?? "",
    email: client.email,
    phone: client.phone,
    jobTitle: client.jobTitle ?? "",
    region: client.region,
    companyAddress: client.companyAddress ?? "",
    companyCity: client.companyCity ?? "",
    companyPostcode: client.companyPostcode ?? "",
    companyCountry: client.companyCountry ?? "",
    billingAddress: client.billingAddress,
    notes: client.notes,
    accountManager: meta.accountManager ?? null,
    contacts: listEffectiveContacts(client),
    locations: listEffectiveLocations(client),
    activeProjects: client.activeProjects,
  };
}

export function parseClientMeta(notes: string): ClientMetaBlock {
  const start = notes.indexOf(META_START);
  const end = notes.indexOf(META_END);
  if (start < 0 || end < 0 || end <= start) return {};
  const raw = notes.slice(start + META_START.length, end).trim();
  try {
    const parsed = JSON.parse(raw) as ClientMetaBlock;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readClientMeta(notes: string | undefined | null): ClientMetaBlock {
  return parseClientMeta(notes ?? "");
}

export function writeClientMeta(notes: string | undefined | null, meta: ClientMetaBlock): string {
  const base = stripClientMeta(notes ?? "").trim();
  const payload = JSON.stringify(meta);
  const block = `${META_START}\n${payload}\n${META_END}`;
  return base ? `${base}\n\n${block}` : block;
}

export function stripClientMeta(notes: string): string {
  const start = notes.indexOf(META_START);
  const end = notes.indexOf(META_END);
  if (start < 0 || end < 0 || end <= start) return notes;
  return `${notes.slice(0, start)}${notes.slice(end + META_END.length)}`
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function listEffectiveContacts(client: ManagedClient): ClientContactRecord[] {
  const meta = readClientMeta(client.notes);
  const secondary = (meta.contacts ?? []).filter((c) => c && c.id && c.name);
  const primaryName =
    client.primaryContact?.trim() ||
    [client.primaryContactFirstName, client.primaryContactSurname].filter(Boolean).join(" ").trim();
  const contacts: ClientContactRecord[] = [];
  if (primaryName || client.email || client.phone) {
    contacts.push({
      id: `primary:${client.id}`,
      name: primaryName || "Primary contact",
      email: client.email || undefined,
      phone: client.phone || undefined,
      role: client.jobTitle || undefined,
      isPrimary: true,
    });
  }
  for (const contact of secondary) {
    if (contact.isPrimary) continue;
    contacts.push({ ...contact, isPrimary: false });
  }
  return contacts;
}

export function listEffectiveLocations(client: ManagedClient): ClientLocationRecord[] {
  const meta = readClientMeta(client.notes);
  const extra = (meta.locations ?? []).filter((loc) => loc && loc.id);
  const hasPrimary =
    Boolean(client.companyAddress?.trim()) ||
    Boolean(client.companyCity?.trim()) ||
    Boolean(client.companyPostcode?.trim()) ||
    Boolean(client.companyCountry?.trim()) ||
    Boolean(client.region);
  const locations: ClientLocationRecord[] = [];
  if (hasPrimary) {
    locations.push({
      id: `primary-location:${client.id}`,
      label: "Primary",
      address: client.companyAddress,
      city: client.companyCity,
      postcode: client.companyPostcode,
      country: client.companyCountry,
      region: client.region,
      isPrimary: true,
    });
  }
  for (const loc of extra) {
    if (loc.isPrimary) continue;
    locations.push({ ...loc, isPrimary: false });
  }
  return locations;
}

export async function findClientsByName(
  companyName: string,
  scope: ClientsWorkspaceScope,
  options?: { excludeId?: string },
): Promise<ManagedClient[]> {
  const key = normalizeCompanyKey(companyName);
  if (!key) return [];
  const clients = await listInternalClients(scope);
  return clients.filter((client) => {
    if (options?.excludeId && client.id === options.excludeId) return false;
    const clientKey = normalizeCompanyKey(client.companyName);
    return (
      clientKey === key ||
      client.companyName.trim().toLowerCase() === companyName.trim().toLowerCase() ||
      clientKey.includes(key) ||
      key.includes(clientKey)
    );
  });
}

export async function resolveClientRef(
  input: Record<string, unknown>,
  scope: ClientsWorkspaceScope,
  keys: { id?: string; name?: string } = { id: "clientId", name: "clientName" },
): Promise<
  | { ok: true; client: ManagedClient }
  | { ok: false; errors: string[]; matches?: ManagedClient[] }
> {
  const idKey = keys.id ?? "clientId";
  const nameKey = keys.name ?? "clientName";
  const clientId = asTrimmedString(input[idKey]);
  const clientName =
    asTrimmedString(input[nameKey]) ||
    asTrimmedString(input.companyName) ||
    asTrimmedString(input.name);

  if (clientId) {
    const client = await getInternalClient(clientId, scope);
    if (!client) {
      return { ok: false, errors: [`Client not found in this workspace (id: ${clientId}).`] };
    }
    return { ok: true, client };
  }

  if (!clientName) {
    return { ok: false, errors: ["clientId or clientName is required."] };
  }

  const matches = await findClientsByName(clientName, scope);
  if (matches.length === 0) {
    return { ok: false, errors: [`No client found matching “${clientName}”.`] };
  }
  if (matches.length > 1) {
    const exact = matches.filter(
      (c) => c.companyName.trim().toLowerCase() === clientName.toLowerCase(),
    );
    if (exact.length === 1) return { ok: true, client: exact[0]! };
    return {
      ok: false,
      errors: [
        `Multiple clients match “${clientName}”. Specify clientId. Matches: ${matches
          .slice(0, 5)
          .map((c) => `${c.companyName} (${c.id})`)
          .join(", ")}.`,
      ],
      matches,
    };
  }
  return { ok: true, client: matches[0]! };
}

export async function findPotentialDuplicates(
  companyName: string,
  scope: ClientsWorkspaceScope,
  excludeId?: string,
): Promise<ManagedClient[]> {
  return findClientsByName(companyName, scope, { excludeId });
}

export async function resolveAccountManager(
  input: Record<string, unknown>,
): Promise<
  | { ok: true; manager: ClientAccountManagerMeta }
  | { ok: false; errors: string[] }
> {
  const managerId = asTrimmedString(input.accountManagerId) || asTrimmedString(input.managerId);
  const managerName =
    asTrimmedString(input.accountManagerName) ||
    asTrimmedString(input.managerName) ||
    asTrimmedString(input.accountManager) ||
    asTrimmedString(input.manager);

  let operators: Awaited<ReturnType<typeof listInternalOperators>> = [];
  try {
    operators = await listInternalOperators();
  } catch {
    operators = [];
  }

  if (managerId) {
    const byId = operators.find((op) => op.id === managerId);
    if (byId) {
      return {
        ok: true,
        manager: { id: byId.id, name: byId.fullName || byId.username, email: byId.email },
      };
    }
    if (managerName) {
      return {
        ok: true,
        manager: { id: managerId, name: managerName, email: null },
      };
    }
    return {
      ok: false,
      errors: [`Account manager id “${managerId}” was not found in internal users.`],
    };
  }

  if (!managerName) {
    return {
      ok: false,
      errors: ["accountManagerName (or accountManagerId) is required."],
    };
  }

  const needle = managerName.toLowerCase();
  const matches = operators.filter((op) => {
    const hay = `${op.fullName} ${op.username} ${op.email ?? ""} ${op.operatorLabel}`.toLowerCase();
    return hay.includes(needle) || needle.includes(op.fullName.toLowerCase());
  });

  if (matches.length === 1) {
    const op = matches[0]!;
    return {
      ok: true,
      manager: { id: op.id, name: op.fullName || op.username, email: op.email },
    };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      errors: [
        `Multiple users match “${managerName}”. Specify accountManagerId. Matches: ${matches
          .slice(0, 5)
          .map((op) => `${op.fullName} (${op.id})`)
          .join(", ")}.`,
      ],
    };
  }

  // Allow free-text assignment when directory has no match (name-only meta).
  return {
    ok: true,
    manager: {
      id: `name:${normalizeCompanyKey(managerName) || managerName.toLowerCase()}`,
      name: managerName,
      email: null,
    },
  };
}

export function newContactId(): string {
  return `contact_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newLocationId(): string {
  return `loc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function describeFieldChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Array<{ field: string; from: unknown; to: unknown }> {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: Array<{ field: string; from: unknown; to: unknown }> = [];
  for (const key of keys) {
    const from = before[key];
    const to = after[key];
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    changes.push({ field: key, from, to });
  }
  return changes;
}

export function pickClientPatch(input: Record<string, unknown>): Partial<ManagedClient> {
  const patch: Partial<ManagedClient> = {};
  const map: Array<[keyof ManagedClient, string]> = [
    ["companyName", "companyName"],
    ["industry", "industry"],
    ["primaryContact", "primaryContact"],
    ["primaryContactFirstName", "primaryContactFirstName"],
    ["primaryContactSurname", "primaryContactSurname"],
    ["email", "email"],
    ["phone", "phone"],
    ["jobTitle", "jobTitle"],
    ["region", "region"],
    ["companyAddress", "companyAddress"],
    ["companyCity", "companyCity"],
    ["companyPostcode", "companyPostcode"],
    ["companyCountry", "companyCountry"],
    ["billingAddress", "billingAddress"],
    ["taxId", "taxId"],
    ["contractType", "contractType"],
    ["notes", "notes"],
    ["accountsPayableEmail", "accountsPayableEmail"],
  ];

  for (const [clientKey, inputKey] of map) {
    if (input[inputKey] === undefined) continue;
    const value = input[inputKey];
    if (typeof value === "string") {
      (patch as Record<string, unknown>)[clientKey] = value.trim();
    } else {
      (patch as Record<string, unknown>)[clientKey] = value;
    }
  }

  // Convenience: single "contactName" → primaryContact
  if (input.contactName !== undefined && patch.primaryContact === undefined) {
    patch.primaryContact = asTrimmedString(input.contactName);
  }

  return patch;
}
