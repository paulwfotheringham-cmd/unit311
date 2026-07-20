import {
  createBlankCompanyDetailsFields,
  isCompanyStatus,
  sanitizeCompanyDetailsFields,
  validateCompanyDetailsFields,
  type CompanyDetails,
  type CompanyDetailsFields,
  type CompanyStatus,
} from "@/lib/company-details-data";
import { isMissingTableError } from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { requireCurrentWorkspace } from "@/lib/workspace-context";

type CompanyDetailsScope = {
  workspaceId?: string | null;
};

export const COMPANY_DETAILS_MIGRATION_REQUIRED =
  "Company Details schema is missing. Apply Supabase migration 092_company_details.sql before using this module.";

export const COMPANY_DETAILS_MIGRATION_FILE = "092_company_details.sql";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function throwIfCompanyDetailsSchemaMissing(error: { message: string }) {
  if (isMissingTableError(error, "company_details")) {
    throw new Error(COMPANY_DETAILS_MIGRATION_REQUIRED);
  }
  throw new Error(error.message);
}

/**
 * Read-only schema probe. Does not create or alter tables.
 * Returns false when migration 092 has not been applied.
 */
export async function isCompanyDetailsSchemaReady(): Promise<boolean> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("company_details").select("id").limit(1);
  if (!error) return true;
  if (isMissingTableError(error, "company_details")) return false;
  throw new Error(error.message);
}

async function resolveWorkspaceId(scope?: CompanyDetailsScope) {
  const explicit = scope?.workspaceId?.trim();
  if (explicit) return explicit;
  const workspace = await requireCurrentWorkspace();
  return workspace.id;
}

function mapRow(row: Record<string, unknown>): CompanyDetails {
  const status = String(row.company_status ?? "Active");
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    legalCompanyName: String(row.legal_company_name ?? ""),
    tradingName: String(row.trading_name ?? ""),
    companyNumber: String(row.company_number ?? ""),
    vatTaxNumber: String(row.vat_tax_number ?? ""),
    registeredOfficeAddress: String(row.registered_office_address ?? ""),
    principalBusinessAddress: String(row.principal_business_address ?? ""),
    countryOfRegistration: String(row.country_of_registration ?? ""),
    dateOfIncorporation: row.date_of_incorporation
      ? String(row.date_of_incorporation).slice(0, 10)
      : "",
    companyStatus: isCompanyStatus(status) ? status : "Active",
    sicIndustryClassification: String(row.sic_industry_classification ?? ""),
    website: String(row.website ?? ""),
    primaryEmail: String(row.primary_email ?? ""),
    primaryTelephone: String(row.primary_telephone ?? ""),
    generalCompanyDescription: String(row.general_company_description ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function toDbPayload(fields: CompanyDetailsFields, workspaceId: string) {
  const clean = sanitizeCompanyDetailsFields(fields);
  return {
    workspace_id: workspaceId,
    legal_company_name: clean.legalCompanyName,
    trading_name: clean.tradingName,
    company_number: clean.companyNumber,
    vat_tax_number: clean.vatTaxNumber,
    registered_office_address: clean.registeredOfficeAddress,
    principal_business_address: clean.principalBusinessAddress,
    country_of_registration: clean.countryOfRegistration,
    date_of_incorporation: clean.dateOfIncorporation || null,
    company_status: clean.companyStatus,
    sic_industry_classification: clean.sicIndustryClassification,
    website: clean.website,
    primary_email: clean.primaryEmail,
    primary_telephone: clean.primaryTelephone,
    general_company_description: clean.generalCompanyDescription,
    updated_at: new Date().toISOString(),
  };
}

export async function getCompanyDetails(
  scope?: CompanyDetailsScope,
): Promise<CompanyDetails | null> {
  const workspaceId = await resolveWorkspaceId(scope);
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("company_details")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throwIfCompanyDetailsSchemaMissing(error);
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function upsertCompanyDetails(
  input: Partial<CompanyDetailsFields>,
  scope?: CompanyDetailsScope,
): Promise<CompanyDetails> {
  const workspaceId = await resolveWorkspaceId(scope);

  const current = await getCompanyDetails({ workspaceId });
  const merged: CompanyDetailsFields = {
    ...createBlankCompanyDetailsFields(),
    ...(current
      ? {
          legalCompanyName: current.legalCompanyName,
          tradingName: current.tradingName,
          companyNumber: current.companyNumber,
          vatTaxNumber: current.vatTaxNumber,
          registeredOfficeAddress: current.registeredOfficeAddress,
          principalBusinessAddress: current.principalBusinessAddress,
          countryOfRegistration: current.countryOfRegistration,
          dateOfIncorporation: current.dateOfIncorporation,
          companyStatus: current.companyStatus,
          sicIndustryClassification: current.sicIndustryClassification,
          website: current.website,
          primaryEmail: current.primaryEmail,
          primaryTelephone: current.primaryTelephone,
          generalCompanyDescription: current.generalCompanyDescription,
        }
      : {}),
    ...Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    ),
  } as CompanyDetailsFields;

  if (input.companyStatus !== undefined && !isCompanyStatus(input.companyStatus)) {
    throw new Error("Invalid company status.");
  }

  const validation = validateCompanyDetailsFields(merged);
  const firstError = Object.values(validation)[0];
  if (firstError) {
    throw new Error(firstError);
  }

  const payload = toDbPayload(merged, workspaceId);
  const supabase = requireSupabase();

  if (current) {
    const { data, error } = await supabase
      .from("company_details")
      .update(payload)
      .eq("id", current.id)
      .eq("workspace_id", workspaceId)
      .select("*")
      .single();

    if (error) throwIfCompanyDetailsSchemaMissing(error);
    return mapRow(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("company_details")
    .insert(payload)
    .select("*")
    .single();

  if (error) throwIfCompanyDetailsSchemaMissing(error);
  return mapRow(data as Record<string, unknown>);
}

export type { CompanyStatus };
