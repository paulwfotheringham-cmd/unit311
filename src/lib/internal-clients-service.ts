import {
  assertClientAccountStatusTransition,
  createBlankClient,
  isClientAccountStatus,
  mapInternalClient,
  normalizeClientAccountStatus,
  type ClientAccountStatus,
  type ManagedClient,
} from "@/lib/client-management-data";
import {
  ensureClientBillingProfileColumns,
  ensureInternalClientsFilesFolderColumns,
  ensureInternalClientsSignupProfileColumns,
  ensureInternalClientsTable,
  withInternalClientsFilesFolderColumns,
  withInternalClientsSignupProfileColumns,
  withInternalClientsTable,
} from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

type DbClient = Parameters<typeof mapInternalClient>[0];

export type ClientsWorkspaceScope = {
  /** Explicit override for system/provisioning callers. Prefer omit to use session context. */
  workspaceId?: string | null;
};

function requireClientsSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }
  return createSupabaseServerClient();
}

/**
 * Resolve the tenant key for Clients module operations.
 * Uses requireCurrentWorkspace() unless an explicit workspaceId is provided.
 */
export async function resolveClientsWorkspaceId(
  scope?: ClientsWorkspaceScope,
): Promise<string> {
  const explicit = scope?.workspaceId?.trim();
  if (explicit) return explicit;
  const workspace = await requireCurrentWorkspace();
  return workspace.id;
}

/** PRM-001: CRM lineage lives on crm_lead_id only — strip legacy notes markers. */
function sanitizeClientNotes(notes: string): string {
  return notes
    .split(/\r?\n/)
    .filter((line) => !/^\s*CRM Lead ID\s*:/i.test(line))
    .join("\n")
    .trim();
}

function buildClientPayload(input: Partial<ManagedClient>) {
  const payload: Record<string, string | number | boolean | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.companyName !== undefined) payload.company_name = input.companyName.trim();
  if (input.industry !== undefined) payload.industry = input.industry;
  if (input.primaryContact !== undefined) payload.primary_contact = input.primaryContact.trim();
  if (input.email !== undefined) payload.email = input.email.trim();
  if (input.phone !== undefined) payload.phone = input.phone.trim();
  if (input.region !== undefined) payload.region = input.region;
  if (input.accountStatus !== undefined) {
    if (!isClientAccountStatus(input.accountStatus)) {
      throw new Error(
        `Invalid accountStatus "${String(input.accountStatus)}". Use PRM-001 lifecycle values.`,
      );
    }
    payload.account_status = input.accountStatus;
  }
  if (input.contractType !== undefined) payload.contract_type = input.contractType;
  if (input.taxId !== undefined) payload.tax_id = input.taxId.trim();
  if (input.billingAddress !== undefined) payload.billing_address = input.billingAddress.trim();
  if (input.jobTitle !== undefined) payload.job_title = input.jobTitle.trim();
  if (input.companyAddress !== undefined) payload.company_address = input.companyAddress.trim();
  if (input.companyCity !== undefined) payload.company_city = input.companyCity.trim();
  if (input.companyPostcode !== undefined) payload.company_postcode = input.companyPostcode.trim();
  if (input.companyCountry !== undefined) payload.company_country = input.companyCountry.trim();
  const accountsPayableEmail = input.accountsPayableEmail ?? input.invoiceEmail;
  if (accountsPayableEmail !== undefined) {
    payload.invoice_email = accountsPayableEmail.trim();
  }
  if (input.billingSameAsCompany !== undefined) {
    payload.billing_same_as_company = input.billingSameAsCompany;
  }
  if (input.primaryContactFirstName !== undefined) {
    payload.primary_contact_first_name = input.primaryContactFirstName.trim();
  }
  if (input.primaryContactSurname !== undefined) {
    payload.primary_contact_surname = input.primaryContactSurname.trim();
  }
  if (input.platformOrganisationId !== undefined) {
    payload.platform_organisation_id = input.platformOrganisationId?.trim() || null;
  }
  // PRM-001: active_projects is derived — never accept client/API writes.
  if (input.notes !== undefined) payload.notes = sanitizeClientNotes(input.notes);
  if (input.platformUrl !== undefined) payload.platform_url = input.platformUrl.trim() || null;
  if (input.filesFolderId !== undefined) payload.files_folder_id = input.filesFolderId?.trim() || null;
  if (input.filesFolderName !== undefined) {
    payload.files_folder_name = input.filesFolderName?.trim() || null;
  }
  if (input.subscriptionStatus !== undefined) {
    payload.subscription_status = input.subscriptionStatus;
  }
  if (input.billingFrequency !== undefined) {
    payload.billing_frequency = input.billingFrequency;
  }
  if (input.renewalDate !== undefined) payload.renewal_date = input.renewalDate;
  if (input.paymentMethod !== undefined) payload.payment_method = input.paymentMethod;
  if (input.crmLeadId !== undefined) payload.crm_lead_id = input.crmLeadId;
  if (input.provisioningStatus !== undefined) {
    payload.provisioning_status = input.provisioningStatus;
  }
  if (input.onboardingStage !== undefined) payload.onboarding_stage = input.onboardingStage;
  if (input.activationDate !== undefined) payload.activation_date = input.activationDate;
  if (input.paymentMatchedAt !== undefined) {
    payload.payment_matched_at = input.paymentMatchedAt;
  }
  if (input.lastPaidInvoiceNumber !== undefined) {
    payload.last_paid_invoice_number = input.lastPaidInvoiceNumber;
  }
  if (input.lastWiseTransactionId !== undefined) {
    payload.last_wise_transaction_id = input.lastWiseTransactionId;
  }

  return payload;
}

export async function listInternalClients(
  scope?: ClientsWorkspaceScope,
): Promise<ManagedClient[]> {
  const workspaceId = await resolveClientsWorkspaceId(scope);
  await ensureInternalClientsTable();
  await ensureInternalClientsFilesFolderColumns();
  return withInternalClientsFilesFolderColumns(() =>
    withInternalClientsTable(async () => {
      const supabase = requireClientsSupabase();
      const { data, error } = await supabase
        .from("internal_clients")
        .select(
          [
            "id",
            "company_name",
            "industry",
            "primary_contact",
            "email",
            "phone",
            "region",
            "account_status",
            "contract_type",
            "tax_id",
            "billing_address",
            "job_title",
            "company_address",
            "company_city",
            "company_postcode",
            "company_country",
            "invoice_email",
            "billing_same_as_company",
            "primary_contact_first_name",
            "primary_contact_surname",
            "active_projects",
            "notes",
            "platform_url",
            "platform_organisation_id",
            "files_folder_id",
            "files_folder_name",
            "subscription_status",
            "billing_frequency",
            "renewal_date",
            "payment_method",
            "crm_lead_id",
            "provisioning_status",
            "onboarding_stage",
            "activation_date",
            "payment_matched_at",
            "last_paid_invoice_number",
            "last_wise_transaction_id",
            "created_at",
            "updated_at",
          ].join(","),
        )
        .eq("workspace_id", workspaceId)
        .order("company_name", { ascending: true });

      if (error) throw new Error(error.message);
      return (data as unknown as DbClient[]).map(mapInternalClient);
    }),
  );
}

export async function getInternalClient(
  id: string,
  scope?: ClientsWorkspaceScope,
): Promise<ManagedClient | null> {
  const workspaceId = await resolveClientsWorkspaceId(scope);
  await ensureInternalClientsTable();
  await ensureInternalClientsFilesFolderColumns();
  return withInternalClientsFilesFolderColumns(() =>
    withInternalClientsTable(async () => {
      const supabase = requireClientsSupabase();
      const { data, error } = await supabase
        .from("internal_clients")
        .select("*")
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data ? mapInternalClient(data as DbClient) : null;
    }),
  );
}

/** Throws if the client is missing or belongs to another workspace. */
export async function requireInternalClientInWorkspace(
  id: string,
  scope?: ClientsWorkspaceScope,
): Promise<ManagedClient> {
  const client = await getInternalClient(id, scope);
  if (!client) {
    throw new Error("Client not found.");
  }
  return client;
}

export async function createInternalClient(
  input: Partial<ManagedClient> & { companyName?: string; workspaceId?: string },
  scope?: ClientsWorkspaceScope,
): Promise<ManagedClient> {
  const workspaceId = await resolveClientsWorkspaceId({
    workspaceId: input.workspaceId ?? scope?.workspaceId,
  });
  await ensureInternalClientsTable();
  await ensureInternalClientsSignupProfileColumns().catch(() => false);
  await ensureClientBillingProfileColumns().catch(() => false);
  return withInternalClientsSignupProfileColumns(() =>
    withInternalClientsTable(async () => {
      const supabase = requireClientsSupabase();
      const blank = createBlankClient();
      const id = `client-${crypto.randomUUID().slice(0, 8)}`;
      const accountsPayableEmail =
        input.accountsPayableEmail?.trim() || input.invoiceEmail?.trim() || "";

      const baseRow = {
        id,
        workspace_id: workspaceId,
        company_name: input.companyName?.trim() || blank.companyName || "New Client",
        industry: input.industry ?? blank.industry,
        primary_contact: input.primaryContact?.trim() ?? blank.primaryContact,
        email: input.email?.trim() ?? blank.email,
        phone: input.phone?.trim() ?? blank.phone,
        region: input.region ?? blank.region,
        // FDR-MOD-011: every new Directory client starts as Client Created.
        account_status: "Client Created" satisfies ClientAccountStatus,
        contract_type: input.contractType ?? blank.contractType,
        tax_id: input.taxId?.trim() ?? blank.taxId,
        billing_address: input.billingAddress?.trim() ?? blank.billingAddress,
        // PRM-001: derived field — always start at 0; projects modules update later.
        active_projects: 0,
        notes: sanitizeClientNotes(input.notes ?? blank.notes),
        platform_url: input.platformUrl?.trim() || null,
        platform_organisation_id: input.platformOrganisationId?.trim() || null,
      };

      const attempts: Array<Record<string, string | number | boolean | null>> = [
        {
          ...baseRow,
          job_title: input.jobTitle?.trim() ?? "",
          company_address: input.companyAddress?.trim() ?? "",
          company_city: input.companyCity?.trim() ?? "",
          company_postcode: input.companyPostcode?.trim() ?? "",
          company_country: input.companyCountry?.trim() ?? "",
          invoice_email: accountsPayableEmail,
          billing_same_as_company: input.billingSameAsCompany ?? true,
          primary_contact_first_name: input.primaryContactFirstName?.trim() ?? "",
          primary_contact_surname: input.primaryContactSurname?.trim() ?? "",
        },
        {
          ...baseRow,
          job_title: input.jobTitle?.trim() ?? "",
          company_address: input.companyAddress?.trim() ?? "",
          invoice_email: accountsPayableEmail,
        },
        baseRow,
      ];

      let lastError: Error | null = null;

      for (const row of attempts) {
        const { data, error } = await supabase.from("internal_clients").insert(row).select("*").single();

        if (!error && data) {
          const created = mapInternalClient(data as DbClient);
          try {
            const { ensureClientFilesRootFolder } = await import(
              "@/lib/client-files-root"
            );
            return await ensureClientFilesRootFolder(created, { workspaceId });
          } catch {
            return created;
          }
        }

        if (error) {
          lastError = new Error(error.message);
          if (
            error.message.includes("job_title") ||
            error.message.includes("company_address") ||
            error.message.includes("company_city") ||
            error.message.includes("company_postcode") ||
            error.message.includes("company_country") ||
            error.message.includes("invoice_email") ||
            error.message.includes("billing_same_as_company") ||
            error.message.includes("primary_contact_first_name") ||
            error.message.includes("primary_contact_surname") ||
            error.message.includes("platform_organisation_id")
          ) {
            continue;
          }
          throw lastError;
        }
      }

      throw lastError ?? new Error("Failed to create internal client.");
    }),
  );
}

export async function updateInternalClient(
  id: string,
  patch: Partial<ManagedClient>,
  scope?: ClientsWorkspaceScope,
): Promise<ManagedClient> {
  const workspaceId = await resolveClientsWorkspaceId(scope);
  await ensureClientBillingProfileColumns().catch(() => false);
  return withInternalClientsFilesFolderColumns(() =>
    withInternalClientsTable(async () => {
      const supabase = requireClientsSupabase();
      const existing = await requireInternalClientInWorkspace(id, { workspaceId });
      if (patch.accountStatus !== undefined) {
        const from = normalizeClientAccountStatus(existing.accountStatus);
        const to = isClientAccountStatus(patch.accountStatus)
          ? patch.accountStatus
          : normalizeClientAccountStatus(patch.accountStatus);
        assertClientAccountStatusTransition(from, to);
        patch = { ...patch, accountStatus: to };
      }
      const payload = buildClientPayload(patch);

      const { data, error } = await supabase
        .from("internal_clients")
        .update(payload)
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return mapInternalClient(data as DbClient);
    }),
  );
}

export async function deleteInternalClient(id: string, scope?: ClientsWorkspaceScope) {
  const workspaceId = await resolveClientsWorkspaceId(scope);
  return withInternalClientsTable(async () => {
    const supabase = requireClientsSupabase();
    await requireInternalClientInWorkspace(id, { workspaceId });

    const { data: invoices, error: invoiceListError } = await supabase
      .from("invoices")
      .select("id, status, invoice_number")
      .eq("client_id", id);

    if (invoiceListError) {
      // Invoices table may not exist in older environments — fall through to client delete.
      if (
        !invoiceListError.message.includes("does not exist") &&
        !invoiceListError.message.includes("schema cache")
      ) {
        throw new Error(invoiceListError.message);
      }
    } else {
      const rows = invoices ?? [];
      const paid = rows.filter((row) => row.status === "paid");
      if (paid.length > 0) {
        const numbers = paid
          .map((row) => row.invoice_number)
          .filter(Boolean)
          .slice(0, 5)
          .join(", ");
        throw new Error(
          `Cannot delete this client because ${paid.length} paid invoice${
            paid.length === 1 ? "" : "s"
          } exist${numbers ? ` (${numbers})` : ""}. Paid invoices and ledger entries must be kept for accounting. Archive the client instead.`,
        );
      }

      const removableIds = rows.map((row) => row.id as string).filter(Boolean);
      if (removableIds.length > 0) {
        // wise_payment_matches cascade from invoices.
        const { error: invoiceDeleteError } = await supabase
          .from("invoices")
          .delete()
          .in("id", removableIds);
        if (invoiceDeleteError) throw new Error(invoiceDeleteError.message);
      }
    }

    const { error } = await supabase
      .from("internal_clients")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);
    if (error) {
      if (error.message.includes("invoices_client_id_fkey")) {
        throw new Error(
          "Cannot delete this client while invoices are still linked. Remove or settle open invoices first.",
        );
      }
      throw new Error(error.message);
    }
  });
}

/** Soft-archive a client (accountStatus → Archived). */
export async function archiveInternalClient(
  id: string,
  scope?: ClientsWorkspaceScope,
): Promise<ManagedClient> {
  return updateInternalClient(id, { accountStatus: "Archived" }, scope);
}

/**
 * Restore an archived client to Dormant (review before re-activating).
 * Prefer this over a raw status patch so callers share one restore policy.
 */
export async function restoreInternalClient(
  id: string,
  scope?: ClientsWorkspaceScope,
): Promise<ManagedClient> {
  const existing = await requireInternalClientInWorkspace(id, scope);
  if (normalizeClientAccountStatus(existing.accountStatus) !== "Archived") {
    throw new Error("Only archived clients can be restored.");
  }
  return updateInternalClient(id, { accountStatus: "Dormant" }, scope);
}
