import type { ManagedClient } from "@/lib/client-management-data";
import {
  buildCrmLeadClientNotes,
  CRM_LEAD_CLIENT_NOTE_PREFIX,
} from "@/lib/crm-lead-client-data";
import { mapCrmLead, type CrmLead } from "@/lib/crm-data";
import {
  createInternalClient,
  listInternalClients,
  updateInternalClient,
} from "@/lib/internal-clients-service";
import type { PlatformSignupProfileInput } from "@/lib/signup-profile";
import {
  buildSignupClientNotes,
  formatSignupAddress,
  mapSignupCountryToRegion,
} from "@/lib/signup-profile";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { provisionCustomerWorkspace } from "@/lib/workspace-provisioning-service";
import { resolveWorkspaceBinding } from "@/lib/workspace-context";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

export async function findCrmLeadForSignup(input: {
  companyName: string;
  email: string;
}): Promise<CrmLead | null> {
  const supabase = requireSupabase();
  const company = normalizeKey(input.companyName);
  const email = normalizeKey(input.email);
  // Signup conversion matches against Internal CRM pipeline only.
  const internal = await resolveWorkspaceBinding({ fallbackInternal: true });
  if (!internal) return null;

  const { data, error } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("workspace_id", internal.id)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  const leads = (data ?? []).map(mapCrmLead);
  const byEmail = leads.find((lead) => normalizeKey(lead.email || "") === email);
  if (byEmail) return byEmail;
  return leads.find((lead) => normalizeKey(lead.companyName) === company) ?? null;
}

async function markLeadWon(leadId: string, workspaceId: string) {
  const supabase = requireSupabase();
  await supabase
    .from("crm_leads")
    .update({
      status: "Won",
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("workspace_id", workspaceId)
    .neq("status", "Won");
}

/**
 * Before/at signup: convert matching CRM lead into a Pending Payment client,
 * or create a new pending client when no lead exists.
 */
export async function ensureClientFromSignup(input: {
  profile: PlatformSignupProfileInput;
  organisationId: string | null;
  platformUserId: string;
}): Promise<ManagedClient> {
  const companyAddress = formatSignupAddress(input.profile.companyAddress);
  const billingAddress = input.profile.billingSameAsCompany
    ? companyAddress
    : formatSignupAddress(input.profile.billingAddress);
  const displayName = `${input.profile.firstName} ${input.profile.surname}`.trim();
  const email = input.profile.email;
  const companyName = input.profile.companyName;

  const lead = await findCrmLeadForSignup({ companyName, email }).catch(() => null);
  const provisioned = await provisionCustomerWorkspace({ companyName });
  const workspaceId = provisioned.workspaceId;
  const scope = { workspaceId };
  const clients = await listInternalClients(scope);

  const linkedByLead =
    lead &&
    clients.find(
      (client) =>
        client.crmLeadId === lead.id ||
        client.notes.includes(`${CRM_LEAD_CLIENT_NOTE_PREFIX} ${lead.id}`),
    );

  const linkedByOrg =
    input.organisationId &&
    clients.find((client) => client.platformOrganisationId === input.organisationId);

  const linkedByEmail = clients.find(
    (client) => normalizeKey(client.email) === normalizeKey(email),
  );

  const existing = linkedByLead || linkedByOrg || linkedByEmail || null;

  const signupNotes = buildSignupClientNotes({
    organisationId: input.organisationId,
    jobTitle: input.profile.jobTitle,
    accountsPayableEmail:
      input.profile.accountsPayableEmail || input.profile.invoiceEmail,
    billingSameAsCompany: input.profile.billingSameAsCompany,
  });

  const discoveryBlock = lead
    ? [
        lead.discoveryNotes?.trim() ? `Discovery:\n${lead.discoveryNotes.trim()}` : "",
        lead.notes?.trim() ? `CRM notes:\n${lead.notes.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";

  const notes = lead
    ? [buildCrmLeadClientNotes(lead.id, discoveryBlock || lead.notes), signupNotes]
        .filter(Boolean)
        .join("\n\n")
    : signupNotes;

  const accountsPayableEmail =
    input.profile.accountsPayableEmail?.trim() ||
    input.profile.invoiceEmail?.trim() ||
    email;
  const companyCity = input.profile.companyAddress.city.trim();
  const companyPostcode = input.profile.companyAddress.postcode.trim();
  const companyCountry = input.profile.companyAddress.country.trim();

  const patch: Partial<ManagedClient> = {
    companyName: lead?.companyName || companyName,
    primaryContact: lead?.contactName || displayName,
    primaryContactFirstName: input.profile.firstName.trim(),
    primaryContactSurname: input.profile.surname.trim(),
    email: lead?.email || email,
    phone: lead?.phone || input.profile.phone || "",
    jobTitle: input.profile.jobTitle,
    companyAddress,
    companyCity,
    companyPostcode,
    companyCountry,
    accountsPayableEmail,
    invoiceEmail: accountsPayableEmail,
    billingSameAsCompany: input.profile.billingSameAsCompany,
    billingAddress,
    accountStatus: "Client Created",
    subscriptionStatus: "pending_payment",
    contractType: "Retainer",
    industry: "Other",
    region: mapSignupCountryToRegion(input.profile.companyAddress.country),
    platformOrganisationId: input.organisationId,
    notes,
    crmLeadId: lead?.id ?? null,
    onboardingStage: "signup_submitted",
    provisioningStatus: "none",
  };

  let client: ManagedClient;
  if (existing) {
    client = await updateInternalClient(existing.id, patch, scope);
  } else {
    client = await createInternalClient({ ...patch, workspaceId }, scope);
  }

  const supabase = requireSupabase();
  if (lead) {
    await markLeadWon(lead.id, lead.workspaceId).catch(() => undefined);
    try {
      await supabase
        .from("internal_clients")
        .update({
          crm_lead_id: lead.id,
          subscription_status: "pending_payment",
          onboarding_stage: "signup_submitted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", client.id);
    } catch {
      // Columns from migration 072 may not be applied yet.
    }
  } else {
    try {
      await supabase
        .from("internal_clients")
        .update({
          subscription_status: "pending_payment",
          onboarding_stage: "signup_submitted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", client.id);
    } catch {
      // Columns from migration 072 may not be applied yet.
    }
  }

  return client;
}
