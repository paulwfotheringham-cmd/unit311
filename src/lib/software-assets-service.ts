import {
  computeSoftwareAssetsSummary,
  createBlankSoftwareAsset,
  normalizeSoftwareAssetFinance,
  SOFTWARE_DEFAULT_CURRENCY,
  SOFTWARE_DEFAULT_LAST_PAYMENT,
  SOFTWARE_DEFAULT_NEXT_PAYMENT,
  type LicenceType,
  type RenewalFrequency,
  type SoftwareAsset,
  type SoftwareAssetCredentials,
  type SoftwareAssetFile,
  type SoftwareAttachmentKind,
  type SoftwareAssetsSummary,
  type SoftwareStatus,
} from "@/lib/software-assets-data";
import {
  decryptSecret,
  encryptSecret,
  hasEncryptedSecret,
} from "@/lib/secure-credentials";
import {
  ensureSoftwareAssetRegisterTables,
  withSoftwareAssetRegisterTables,
} from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";
import { getPlatformSession } from "@/lib/platform-session";

type SoftwareWorkspaceScope = {
  workspaceId?: string | null;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

async function resolveWorkspaceId(scope?: SoftwareWorkspaceScope) {
  const explicit = scope?.workspaceId?.trim();
  if (explicit) return explicit;
  const workspace = await requireCurrentWorkspace();
  return workspace.id;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapCredentials(row: Record<string, unknown> | null | undefined): SoftwareAssetCredentials {
  if (!row) {
    return createBlankSoftwareAsset().credentials;
  }
  return {
    primaryAccountEmail: String(row.primary_account_email ?? ""),
    portalUrl: String(row.portal_url ?? ""),
    username: String(row.username ?? ""),
    passwordSet: hasEncryptedSecret({
      ciphertext: row.password_ciphertext as string | undefined,
      nonce: row.password_nonce as string | undefined,
      tag: row.password_tag as string | undefined,
    }),
    mfaEnabled: Boolean(row.mfa_enabled),
    recoveryEmail: String(row.recovery_email ?? ""),
    recoveryPhone: String(row.recovery_phone ?? ""),
    notes: String(row.notes ?? ""),
  };
}

function mapFile(row: Record<string, unknown>, fileName = "Attachment"): SoftwareAssetFile {
  return {
    id: String(row.id),
    fileObjectId: String(row.file_object_id),
    fileName,
    attachmentKind: (row.attachment_kind as SoftwareAttachmentKind) || "Other",
    createdAt: String(row.created_at),
  };
}

function mapAsset(
  row: Record<string, unknown>,
  credentials?: Record<string, unknown> | null,
  files: SoftwareAssetFile[] = [],
): SoftwareAsset {
  return normalizeSoftwareAssetFinance({
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    name: String(row.name ?? ""),
    vendor: String(row.vendor ?? ""),
    purpose: String(row.purpose ?? ""),
    category: String(row.category ?? ""),
    websiteUrl: String(row.website_url ?? ""),
    supportUrl: String(row.support_url ?? ""),
    documentationUrl: String(row.documentation_url ?? ""),
    status: (row.status as SoftwareStatus) || "Active",
    licencesPurchased: toNumber(row.licences_purchased),
    licencesAllocated: toNumber(row.licences_allocated),
    licenceType: (row.licence_type as LicenceType) || "Named",
    monthlyCost: toNumber(row.monthly_cost),
    annualCost: toNumber(row.annual_cost),
    currency: String(row.currency ?? SOFTWARE_DEFAULT_CURRENCY),
    lastPaymentAmount:
      row.last_payment_amount === null || row.last_payment_amount === undefined
        ? null
        : toNumber(row.last_payment_amount),
    lastPaymentDate: (row.last_payment_date as string | null) ?? SOFTWARE_DEFAULT_LAST_PAYMENT,
    nextRenewalDate: (row.next_renewal_date as string | null) ?? SOFTWARE_DEFAULT_NEXT_PAYMENT,
    renewalFrequency: (row.renewal_frequency as RenewalFrequency) || "Monthly",
    contractLength: String(row.contract_length ?? ""),
    costCentre: String(row.cost_centre ?? ""),
    budgetOwner: String(row.budget_owner ?? ""),
    supplierName: String(row.supplier_name ?? ""),
    invoiceReference: String(row.invoice_reference ?? ""),
    financialAccountCode: String(row.financial_account_code ?? "5010"),
    businessOwner: String(row.business_owner ?? ""),
    technicalOwner: String(row.technical_owner ?? ""),
    department: String(row.department ?? ""),
    approver: String(row.approver ?? ""),
    supplierCompany: String(row.supplier_company ?? ""),
    accountManager: String(row.account_manager ?? ""),
    supportEmail: String(row.support_email ?? ""),
    supportPhone: String(row.support_phone ?? ""),
    customerNumber: String(row.customer_number ?? ""),
    integrationConnected: Boolean(row.integration_connected),
    integrationApiKeySet: Boolean(row.integration_api_key_set),
    integrationWebhookUrl: String(row.integration_webhook_url ?? ""),
    integrationOauthStatus: String(row.integration_oauth_status ?? ""),
    integrationSyncStatus: String(row.integration_sync_status ?? ""),
    linkedExpenseId: (row.linked_expense_id as string | null) ?? null,
    filesFolderId: (row.files_folder_id as string | null) ?? null,
    credentials: mapCredentials(credentials),
    files,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  });
}

async function writeAudit(input: {
  workspaceId: string;
  softwareAssetId: string | null;
  action: string;
  summary: string;
  payload?: Record<string, unknown>;
}) {
  const session = await getPlatformSession();
  const supabase = requireSupabase();
  await supabase.from("software_asset_audit_events").insert({
    workspace_id: input.workspaceId,
    software_asset_id: input.softwareAssetId,
    actor: session?.displayName || session?.username || "system",
    action: input.action,
    summary: input.summary,
    payload: input.payload ?? {},
  });
}

async function loadFilesForAssets(
  workspaceId: string,
  assetIds: string[],
): Promise<Map<string, SoftwareAssetFile[]>> {
  const map = new Map<string, SoftwareAssetFile[]>();
  if (assetIds.length === 0) return map;

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("software_asset_files")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("software_asset_id", assetIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const fileIds = (data ?? []).map((row) => String((row as Record<string, unknown>).file_object_id));
  const nameById = new Map<string, string>();
  if (fileIds.length > 0) {
    const { data: objects } = await supabase
      .from("file_objects")
      .select("id, name")
      .in("id", fileIds);
    for (const object of objects ?? []) {
      nameById.set(String(object.id), String(object.name));
    }
  }

  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    const assetId = String(record.software_asset_id);
    const list = map.get(assetId) ?? [];
    list.push(mapFile(record, nameById.get(String(record.file_object_id)) ?? "Attachment"));
    map.set(assetId, list);
  }

  return map;
}

async function loadCredentialsMap(assetIds: string[]) {
  const map = new Map<string, Record<string, unknown>>();
  if (assetIds.length === 0) return map;
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("software_asset_credentials")
    .select("*")
    .in("software_asset_id", assetIds);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const record = row as Record<string, unknown>;
    map.set(String(record.software_asset_id), record);
  }
  return map;
}

function buildAssetPayload(input: Partial<SoftwareAsset>) {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name.trim() || "Untitled software";
  if (input.vendor !== undefined) payload.vendor = input.vendor.trim();
  if (input.purpose !== undefined) payload.purpose = input.purpose.trim();
  if (input.category !== undefined) payload.category = input.category.trim();
  if (input.websiteUrl !== undefined) payload.website_url = input.websiteUrl.trim();
  if (input.supportUrl !== undefined) payload.support_url = input.supportUrl.trim();
  if (input.documentationUrl !== undefined) {
    payload.documentation_url = input.documentationUrl.trim();
  }
  if (input.status !== undefined) payload.status = input.status;
  if (input.licencesPurchased !== undefined) {
    payload.licences_purchased = Math.max(0, Math.floor(input.licencesPurchased));
  }
  if (input.licencesAllocated !== undefined) {
    payload.licences_allocated = Math.max(0, Math.floor(input.licencesAllocated));
  }
  if (input.licenceType !== undefined) payload.licence_type = input.licenceType;
  if (input.monthlyCost !== undefined) payload.monthly_cost = toNumber(input.monthlyCost);
  if (input.annualCost !== undefined) payload.annual_cost = toNumber(input.annualCost);
  if (input.currency !== undefined) payload.currency = input.currency.trim() || "GBP";
  if (input.lastPaymentAmount !== undefined) {
    payload.last_payment_amount =
      input.lastPaymentAmount === null ? null : toNumber(input.lastPaymentAmount);
  }
  if (input.lastPaymentDate !== undefined) {
    payload.last_payment_date = input.lastPaymentDate || null;
  }
  if (input.nextRenewalDate !== undefined) {
    payload.next_renewal_date = input.nextRenewalDate || null;
  }
  if (input.renewalFrequency !== undefined) payload.renewal_frequency = input.renewalFrequency;
  if (input.contractLength !== undefined) payload.contract_length = input.contractLength.trim();
  if (input.costCentre !== undefined) payload.cost_centre = input.costCentre.trim();
  if (input.budgetOwner !== undefined) payload.budget_owner = input.budgetOwner.trim();
  if (input.supplierName !== undefined) payload.supplier_name = input.supplierName.trim();
  if (input.invoiceReference !== undefined) {
    payload.invoice_reference = input.invoiceReference.trim();
  }
  if (input.financialAccountCode !== undefined) {
    payload.financial_account_code = input.financialAccountCode.trim() || "5010";
  }
  if (input.businessOwner !== undefined) payload.business_owner = input.businessOwner.trim();
  if (input.technicalOwner !== undefined) payload.technical_owner = input.technicalOwner.trim();
  if (input.department !== undefined) payload.department = input.department.trim();
  if (input.approver !== undefined) payload.approver = input.approver.trim();
  if (input.supplierCompany !== undefined) payload.supplier_company = input.supplierCompany.trim();
  if (input.accountManager !== undefined) payload.account_manager = input.accountManager.trim();
  if (input.supportEmail !== undefined) payload.support_email = input.supportEmail.trim();
  if (input.supportPhone !== undefined) payload.support_phone = input.supportPhone.trim();
  if (input.customerNumber !== undefined) payload.customer_number = input.customerNumber.trim();
  if (input.integrationConnected !== undefined) {
    payload.integration_connected = Boolean(input.integrationConnected);
  }
  if (input.integrationApiKeySet !== undefined) {
    payload.integration_api_key_set = Boolean(input.integrationApiKeySet);
  }
  if (input.integrationWebhookUrl !== undefined) {
    payload.integration_webhook_url = input.integrationWebhookUrl.trim();
  }
  if (input.integrationOauthStatus !== undefined) {
    payload.integration_oauth_status = input.integrationOauthStatus.trim();
  }
  if (input.integrationSyncStatus !== undefined) {
    payload.integration_sync_status = input.integrationSyncStatus.trim();
  }
  if (input.linkedExpenseId !== undefined) {
    payload.linked_expense_id = input.linkedExpenseId || null;
  }
  if (input.filesFolderId !== undefined) {
    payload.files_folder_id = input.filesFolderId || null;
  }

  return payload;
}

async function upsertCredentials(
  workspaceId: string,
  assetId: string,
  credentials: Partial<SoftwareAssetCredentials> | undefined,
  passwordPlaintext?: string | null,
) {
  if (!credentials && passwordPlaintext === undefined) return;

  const supabase = requireSupabase();
  const payload: Record<string, unknown> = {
    software_asset_id: assetId,
    workspace_id: workspaceId,
    updated_at: new Date().toISOString(),
  };

  if (credentials?.primaryAccountEmail !== undefined) {
    payload.primary_account_email = credentials.primaryAccountEmail.trim();
  }
  if (credentials?.portalUrl !== undefined) payload.portal_url = credentials.portalUrl.trim();
  if (credentials?.username !== undefined) payload.username = credentials.username.trim();
  if (credentials?.mfaEnabled !== undefined) payload.mfa_enabled = Boolean(credentials.mfaEnabled);
  if (credentials?.recoveryEmail !== undefined) {
    payload.recovery_email = credentials.recoveryEmail.trim();
  }
  if (credentials?.recoveryPhone !== undefined) {
    payload.recovery_phone = credentials.recoveryPhone.trim();
  }
  if (credentials?.notes !== undefined) payload.notes = credentials.notes.trim();

  if (passwordPlaintext !== undefined) {
    if (!passwordPlaintext) {
      payload.password_ciphertext = null;
      payload.password_nonce = null;
      payload.password_tag = null;
    } else {
      const encrypted = encryptSecret(passwordPlaintext);
      payload.password_ciphertext = encrypted.ciphertext;
      payload.password_nonce = encrypted.nonce;
      payload.password_tag = encrypted.tag;
    }
  }

  const { error } = await supabase.from("software_asset_credentials").upsert(payload, {
    onConflict: "software_asset_id",
  });
  if (error) throw new Error(error.message);
}

export async function listSoftwareAssets(
  scope?: SoftwareWorkspaceScope,
): Promise<SoftwareAsset[]> {
  await ensureSoftwareAssetRegisterTables();
  return withSoftwareAssetRegisterTables(async () => {
    const workspaceId = await resolveWorkspaceId(scope);
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("software_assets")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Record<string, unknown>[];
    const ids = rows.map((row) => String(row.id));
    const [credentialsMap, filesMap] = await Promise.all([
      loadCredentialsMap(ids),
      loadFilesForAssets(workspaceId, ids),
    ]);

    return rows.map((row) =>
      mapAsset(row, credentialsMap.get(String(row.id)), filesMap.get(String(row.id)) ?? []),
    );
  });
}

export async function getSoftwareAsset(
  id: string,
  scope?: SoftwareWorkspaceScope,
): Promise<SoftwareAsset | null> {
  await ensureSoftwareAssetRegisterTables();
  return withSoftwareAssetRegisterTables(async () => {
    const workspaceId = await resolveWorkspaceId(scope);
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("software_assets")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const [credentialsMap, filesMap] = await Promise.all([
      loadCredentialsMap([id]),
      loadFilesForAssets(workspaceId, [id]),
    ]);

    return mapAsset(
      data as Record<string, unknown>,
      credentialsMap.get(id),
      filesMap.get(id) ?? [],
    );
  });
}

export async function createSoftwareAsset(
  input: Partial<SoftwareAsset> & { password?: string | null },
  scope?: SoftwareWorkspaceScope,
): Promise<SoftwareAsset> {
  await ensureSoftwareAssetRegisterTables();
  return withSoftwareAssetRegisterTables(async () => {
    const workspaceId = await resolveWorkspaceId(scope);
    const blank = createBlankSoftwareAsset(workspaceId);
    const merged = { ...blank, ...input, workspaceId };
    const supabase = requireSupabase();

    const insertPayload = {
      workspace_id: workspaceId,
      ...buildAssetPayload(merged),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("software_assets")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    const assetId = String((data as Record<string, unknown>).id);

    await upsertCredentials(workspaceId, assetId, merged.credentials, input.password ?? null);
    await writeAudit({
      workspaceId,
      softwareAssetId: assetId,
      action: "created",
      summary: `Created software asset “${merged.name}”`,
    });

    const created = await getSoftwareAsset(assetId, { workspaceId });
    if (!created) throw new Error("Failed to load created software asset.");
    return created;
  });
}

export async function updateSoftwareAsset(
  id: string,
  input: Partial<SoftwareAsset> & { password?: string | null },
  scope?: SoftwareWorkspaceScope,
): Promise<SoftwareAsset> {
  await ensureSoftwareAssetRegisterTables();
  return withSoftwareAssetRegisterTables(async () => {
    const workspaceId = await resolveWorkspaceId(scope);
    const supabase = requireSupabase();
    const payload = buildAssetPayload(input);

    const { data, error } = await supabase
      .from("software_assets")
      .update(payload)
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    await upsertCredentials(
      workspaceId,
      id,
      input.credentials,
      input.password !== undefined ? input.password : undefined,
    );

    await writeAudit({
      workspaceId,
      softwareAssetId: id,
      action: "updated",
      summary: `Updated software asset “${String((data as Record<string, unknown>).name ?? id)}”`,
    });

    const updated = await getSoftwareAsset(id, { workspaceId });
    if (!updated) throw new Error("Software asset not found after update.");
    return updated;
  });
}

export async function deleteSoftwareAsset(
  id: string,
  scope?: SoftwareWorkspaceScope,
): Promise<void> {
  await ensureSoftwareAssetRegisterTables();
  return withSoftwareAssetRegisterTables(async () => {
    const workspaceId = await resolveWorkspaceId(scope);
    const existing = await getSoftwareAsset(id, { workspaceId });
    if (!existing) throw new Error("Software asset not found.");

    const supabase = requireSupabase();
    const { error } = await supabase
      .from("software_assets")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", id);

    if (error) throw new Error(error.message);

    await writeAudit({
      workspaceId,
      softwareAssetId: null,
      action: "deleted",
      summary: `Deleted software asset “${existing.name}”`,
      payload: { id, name: existing.name },
    });
  });
}

export async function revealSoftwareAssetPassword(
  id: string,
  scope?: SoftwareWorkspaceScope,
): Promise<string> {
  await ensureSoftwareAssetRegisterTables();
  return withSoftwareAssetRegisterTables(async () => {
    const workspaceId = await resolveWorkspaceId(scope);
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("software_asset_credentials")
      .select("password_ciphertext, password_nonce, password_tag")
      .eq("workspace_id", workspaceId)
      .eq("software_asset_id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (
      !data ||
      !hasEncryptedSecret({
        ciphertext: data.password_ciphertext as string,
        nonce: data.password_nonce as string,
        tag: data.password_tag as string,
      })
    ) {
      throw new Error("No password is stored for this software asset.");
    }

    return decryptSecret({
      ciphertext: String(data.password_ciphertext),
      nonce: String(data.password_nonce),
      tag: String(data.password_tag),
    });
  });
}

export async function linkSoftwareAssetFile(input: {
  assetId: string;
  fileObjectId: string;
  attachmentKind?: SoftwareAttachmentKind;
  scope?: SoftwareWorkspaceScope;
}): Promise<SoftwareAsset> {
  await ensureSoftwareAssetRegisterTables();
  return withSoftwareAssetRegisterTables(async () => {
    const workspaceId = await resolveWorkspaceId(input.scope);
    const supabase = requireSupabase();
    const { error } = await supabase.from("software_asset_files").insert({
      workspace_id: workspaceId,
      software_asset_id: input.assetId,
      file_object_id: input.fileObjectId,
      attachment_kind: input.attachmentKind ?? "Other",
    });
    if (error) throw new Error(error.message);

    const asset = await getSoftwareAsset(input.assetId, { workspaceId });
    if (!asset) throw new Error("Software asset not found.");
    return asset;
  });
}

export async function unlinkSoftwareAssetFile(input: {
  assetId: string;
  linkId: string;
  scope?: SoftwareWorkspaceScope;
}): Promise<SoftwareAsset> {
  await ensureSoftwareAssetRegisterTables();
  return withSoftwareAssetRegisterTables(async () => {
    const workspaceId = await resolveWorkspaceId(input.scope);
    const supabase = requireSupabase();
    const { error } = await supabase
      .from("software_asset_files")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("software_asset_id", input.assetId)
      .eq("id", input.linkId);
    if (error) throw new Error(error.message);

    const asset = await getSoftwareAsset(input.assetId, { workspaceId });
    if (!asset) throw new Error("Software asset not found.");
    return asset;
  });
}

async function countActiveEmployees(workspaceId?: string): Promise<number | null> {
  try {
    const supabase = requireSupabase();
    let query = supabase.from("hr_employees").select("id, employment_status");
    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    const { data, error } = await query;
    if (error) return null;
    const activeStatuses = new Set(["active", "probation", "notice_given", "leave_of_absence"]);
    return (data ?? []).filter((row) => {
      const status = String(
        (row as { employment_status?: string }).employment_status ?? "active",
      ).toLowerCase();
      return activeStatuses.has(status);
    }).length;
  } catch {
    return null;
  }
}

export async function getSoftwareAssetsSummary(
  scope?: SoftwareWorkspaceScope,
): Promise<{ assets: SoftwareAsset[]; summary: SoftwareAssetsSummary }> {
  const assets = await listSoftwareAssets(scope);
  const employeeCount = await countActiveEmployees();
  return {
    assets,
    summary: computeSoftwareAssetsSummary(assets, employeeCount),
  };
}
