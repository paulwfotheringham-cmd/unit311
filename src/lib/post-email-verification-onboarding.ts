import {
  buildCrmLeadClientNotes,
  CRM_LEAD_CLIENT_NOTE_PREFIX,
} from "@/lib/crm-lead-client-data";
import { type CrmLead } from "@/lib/crm-data";
import { findCrmLeadForSignup } from "@/lib/crm-signup-conversion";
import { getLeadByIdForCapability } from "@/lib/crm-leads-service";
import {
  createInternalClient,
  listInternalClients,
  updateInternalClient,
} from "@/lib/internal-clients-service";
import type { ManagedClient } from "@/lib/client-management-data";
import { issueFirstCustomerSubscriptionInvoice } from "@/lib/accounting/onboarding-invoice";
import { ensureClientBillingProfileColumns } from "@/lib/internal-db-migrations";
import { ensureOrganisationForClientName } from "@/lib/organisation-service";
import type { PlatformUserRecord } from "@/lib/platform-auth";
import { resolveUserEmail } from "@/lib/platform-email-verification-service";
import {
  formatBillingAddressBlock,
  formatCompanyAddressBlock,
  normalizeSignupBillingProfile,
  primaryContactDisplayName,
  resolveAccountsPayableEmail,
  type SignupBillingProfile,
} from "@/lib/signup-billing-profile";
import { mapSignupCountryToRegion } from "@/lib/signup-profile";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  ensureWorkspaceOwnerMembership,
  provisionCustomerWorkspace,
} from "@/lib/workspace-provisioning-service";
import { findWorkspaceBySlug } from "@/lib/workspace-host";

const INTERNAL_WORKSPACE_SLUG = "unit311";
const CLIENT_PENDING_PAYMENT_STATUS = "Pending Payment" as const;

type PlatformUserWithLinks = PlatformUserRecord & {
  email?: string | null;
  crm_lead_id?: string | null;
  organisation_id?: string | null;
  workspace_id?: string | null;
  client_name?: string | null;
  signup_billing_profile?: SignupBillingProfile | null;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function readStoredBillingProfile(user: PlatformUserWithLinks): SignupBillingProfile | null {
  if (!user.signup_billing_profile || typeof user.signup_billing_profile !== "object") {
    return null;
  }
  return normalizeSignupBillingProfile(user.signup_billing_profile);
}

async function resolveCrmLeadForUser(user: PlatformUserWithLinks): Promise<CrmLead | null> {
  const linkedId = user.crm_lead_id?.trim();
  if (linkedId) {
    const byId = await getLeadByIdForCapability(linkedId).catch(() => null);
    if (byId) return byId;
  }

  const email = resolveUserEmail(user) ?? "";
  const companyName = user.client_name?.trim() || "";
  if (!email && !companyName) return null;

  return findCrmLeadForSignup({ companyName, email }).catch(() => null);
}

async function ensurePendingPaymentClientFromLead(input: {
  lead: CrmLead | null;
  user: PlatformUserWithLinks;
  organisationId: string | null;
  email: string;
  billingProfile: SignupBillingProfile | null;
  workspaceId: string;
}): Promise<ManagedClient> {
  const lead = input.lead;
  const profile = input.billingProfile;
  const scope = { workspaceId: input.workspaceId };

  const firstName =
    profile?.firstName.trim() ||
    lead?.firstName.trim() ||
    input.user.display_name.trim().split(/\s+/)[0] ||
    "";
  const surname =
    profile?.surname.trim() ||
    lead?.surname.trim() ||
    input.user.display_name.trim().split(/\s+/).slice(1).join(" ") ||
    "";
  const companyName =
    profile?.companyName.trim() ||
    lead?.companyName.trim() ||
    userCompanyName(input.user) ||
    "Unit311 Central customer";
  const contactName =
    primaryContactDisplayName({ firstName, surname }) ||
    lead?.contactName.trim() ||
    input.user.display_name.trim() ||
    input.email;
  const email = (profile?.email || lead?.email.trim() || input.email).toLowerCase();
  const phone = profile?.phone.trim() || lead?.phone?.trim() || "";
  const jobTitle = profile?.role.trim() || lead?.role?.trim() || "";
  const accountsPayableEmail = profile
    ? resolveAccountsPayableEmail(profile)
    : email;
  const companyAddress = profile ? formatCompanyAddressBlock(profile) : "";
  const billingAddress = profile ? formatBillingAddressBlock(profile) : companyAddress;
  const companyCity = profile?.companyAddress.city ?? "";
  const companyPostcode = profile?.companyAddress.postcode ?? "";
  const companyCountry = profile?.companyAddress.country ?? "";
  const billingSameAsCompany = profile?.billingSameAsCompany ?? true;
  const region = companyCountry
    ? mapSignupCountryToRegion(companyCountry)
    : ("Europe-wide" as const);

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

  const discoveryBlock = lead
    ? [
        lead.discoveryNotes?.trim() ? `Discovery:\n${lead.discoveryNotes.trim()}` : "",
        lead.notes?.trim() ? `CRM notes:\n${lead.notes.trim()}` : "",
        lead.source?.trim() ? `Source: ${lead.source.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";

  const notes = lead
    ? buildCrmLeadClientNotes(lead.id, discoveryBlock || lead.notes)
    : `Platform user ${input.user.id}`;

  const patch: Partial<ManagedClient> = {
    companyName,
    primaryContact: contactName,
    primaryContactFirstName: firstName,
    primaryContactSurname: surname,
    email,
    phone,
    jobTitle,
    companyAddress,
    companyCity,
    companyPostcode,
    companyCountry,
    billingAddress,
    billingSameAsCompany,
    accountsPayableEmail,
    invoiceEmail: accountsPayableEmail,
    accountStatus: CLIENT_PENDING_PAYMENT_STATUS,
    subscriptionStatus: "pending_payment",
    contractType: "Retainer",
    industry: "Other",
    region,
    platformOrganisationId: input.organisationId,
    notes,
    crmLeadId: lead?.id ?? null,
    onboardingStage: "email_verified",
    provisioningStatus: "provisioning",
  };

  let client: ManagedClient;
  if (existing) {
    client = await updateInternalClient(existing.id, patch, scope);
  } else {
    client = await createInternalClient({ ...patch, workspaceId: input.workspaceId }, scope);
    client = await updateInternalClient(client.id, patch, scope);
  }

  const supabase = requireSupabase();
  try {
    await supabase
      .from("internal_clients")
      .update({
        account_status: CLIENT_PENDING_PAYMENT_STATUS,
        subscription_status: "pending_payment",
        onboarding_stage: "email_verified",
        crm_lead_id: lead?.id ?? null,
        platform_organisation_id: input.organisationId,
        primary_contact: contactName,
        primary_contact_first_name: firstName,
        primary_contact_surname: surname,
        job_title: jobTitle,
        phone,
        company_address: companyAddress,
        company_city: companyCity,
        company_postcode: companyPostcode,
        company_country: companyCountry,
        billing_address: billingAddress,
        billing_same_as_company: billingSameAsCompany,
        invoice_email: accountsPayableEmail,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id);
  } catch {
    // Structured billing columns may not be applied yet.
  }

  return client;
}

function userCompanyName(user: PlatformUserWithLinks) {
  return user.client_name?.trim() || "";
}

async function isInternalWorkspaceId(workspaceId: string | null | undefined) {
  if (!workspaceId) return true;
  const internal = await findWorkspaceBySlug(INTERNAL_WORKSPACE_SLUG);
  return Boolean(internal && internal.id === workspaceId);
}

async function bindWorkspaceIds(input: {
  workspaceId: string;
  platformUserId: string;
  organisationId: string | null;
  clientId: string;
}) {
  const supabase = requireSupabase();
  const updatedAt = new Date().toISOString();

  try {
    await supabase
      .from("platform_users")
      .update({ workspace_id: input.workspaceId, updated_at: updatedAt })
      .eq("id", input.platformUserId);
  } catch {
    // workspace_id may be unavailable.
  }

  if (input.organisationId) {
    try {
      await supabase
        .from("platform_organisations")
        .update({ workspace_id: input.workspaceId, updated_at: updatedAt })
        .eq("id", input.organisationId);
    } catch {
      // optional bind
    }
  }

  try {
    await supabase
      .from("internal_clients")
      .update({
        workspace_id: input.workspaceId,
        provisioning_status: "provisioning_pending",
        updated_at: updatedAt,
      })
      .eq("id", input.clientId);
  } catch {
    // optional bind
  }
}

/**
 * After email verification: Pending Payment client + provisioned inactive workspace
 * + first unpaid subscription invoice in the General Ledger.
 * No activation, welcome email, or Wise automation.
 */
export async function completePostEmailVerificationOnboarding(
  user: PlatformUserRecord,
): Promise<{ clientId: string; workspaceId: string; invoiceId: string | null }> {
  const typedUser = user as PlatformUserWithLinks;
  const email = (resolveUserEmail(typedUser) || typedUser.username).trim().toLowerCase();
  if (!email) {
    throw new Error("Verified account has no email address.");
  }

  let userWithProfile = typedUser;
  try {
    const supabase = requireSupabase();
    const { data } = await supabase
      .from("platform_users")
      .select("*")
      .eq("id", typedUser.id)
      .maybeSingle();
    if (data) {
      userWithProfile = data as PlatformUserWithLinks;
    }
  } catch {
    // Fall back to verified token user row.
  }

  const billingProfile = readStoredBillingProfile(userWithProfile);
  const lead = await resolveCrmLeadForUser(userWithProfile);
  const companyName =
    billingProfile?.companyName.trim() ||
    lead?.companyName.trim() ||
    userCompanyName(userWithProfile) ||
    userWithProfile.display_name ||
    "Customer";

  const organisation = await ensureOrganisationForClientName(companyName, email);
  const organisationId = organisation?.id ?? userWithProfile.organisation_id ?? null;

  if (organisationId && !userWithProfile.organisation_id) {
    const supabase = requireSupabase();
    try {
      await supabase
        .from("platform_users")
        .update({
          organisation_id: organisationId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userWithProfile.id);
    } catch {
      // organisation_id column may be unavailable.
    }
  }

  await ensureClientBillingProfileColumns().catch(() => false);

  let workspaceId = userWithProfile.workspace_id?.trim() || null;
  if (await isInternalWorkspaceId(workspaceId)) {
    workspaceId = null;
  }

  if (!workspaceId) {
    const provisioned = await provisionCustomerWorkspace({ companyName });
    workspaceId = provisioned.workspaceId;
  } else {
    const supabase = requireSupabase();
    await supabase
      .from("workspaces")
      .update({
        status: "Pending Payment",
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspaceId)
      .neq("status", "Active");
  }

  const client = await ensurePendingPaymentClientFromLead({
    lead,
    user: userWithProfile,
    organisationId,
    email,
    billingProfile,
    workspaceId,
  });

  await ensureWorkspaceOwnerMembership({
    workspaceId,
    platformUserId: userWithProfile.id,
  });

  await bindWorkspaceIds({
    workspaceId,
    platformUserId: userWithProfile.id,
    organisationId,
    clientId: client.id,
  });

  let invoiceId: string | null = null;
  try {
    const invoice = await issueFirstCustomerSubscriptionInvoice({
      client,
      workspaceId,
      organisationId,
    });
    invoiceId = invoice.id;

    await requireSupabase()
      .from("internal_clients")
      .update({
        onboarding_stage: "awaiting_payment",
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id);
  } catch (invoiceError) {
    console.error("Onboarding invoice generation failed:", invoiceError);
    // Customer still proceeds to /payment; payment APIs can retry invoice ensure.
  }

  return { clientId: client.id, workspaceId, invoiceId };
}

export { CLIENT_PENDING_PAYMENT_STATUS };
