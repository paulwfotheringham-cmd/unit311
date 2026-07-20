import type { ManagedClient } from "@/lib/client-management-data";
import {
  buildCrmLeadClientNotes,
  CRM_LEAD_CLIENT_NOTE_PREFIX,
} from "@/lib/crm-lead-client-data";
import {
  getLeadById,
  resolveCrmWorkspaceId,
  type CrmWorkspaceScope,
} from "@/lib/crm-leads-service";
import {
  createInternalClient,
  listInternalClients,
  updateInternalClient,
} from "@/lib/internal-clients-service";

function clientMatchesCrmLead(client: ManagedClient, leadId: string) {
  return (
    client.crmLeadId === leadId ||
    client.notes.includes(`${CRM_LEAD_CLIENT_NOTE_PREFIX} ${leadId}`)
  );
}

/**
 * Convert CRM Lead → Client Directory row.
 * Prospect stays in CRM; Directory always starts at Client Created (FDR-MOD-011).
 */
export async function promoteCrmLeadToClient(
  leadId: string,
  scope?: CrmWorkspaceScope,
): Promise<ManagedClient> {
  const workspaceId = await resolveCrmWorkspaceId(scope);
  const lead = await getLeadById(leadId, { workspaceId });
  if (!lead) {
    throw new Error("Lead not found.");
  }

  const clients = await listInternalClients({ workspaceId });
  const existing =
    clients.find((client) => clientMatchesCrmLead(client, leadId)) ??
    clients.find(
      (client) =>
        client.companyName.trim().toLowerCase() === lead.companyName.trim().toLowerCase(),
    );

  const clientPayload = {
    companyName: lead.companyName,
    primaryContact: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    crmLeadId: leadId,
    notes: buildCrmLeadClientNotes(leadId, lead.notes),
  };

  if (existing) {
    // Do not rewrite lifecycle on re-promote — status remains Directory-owned.
    return updateInternalClient(existing.id, clientPayload, { workspaceId });
  }

  return createInternalClient(
    {
      ...clientPayload,
      accountStatus: "Client Created",
      industry: "Other",
      region: "United Kingdom",
      contractType: "Project-based",
    },
    { workspaceId },
  );
}
