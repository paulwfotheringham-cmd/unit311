import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { INTERNAL_FILES_BUCKET } from "@/lib/internal-files-data";
import {
  ensurePlatformOrganisationOnboarding,
  ensurePlatformOrganisationsTable,
  isMissingColumnError,
  isMissingTableError,
} from "@/lib/internal-db-migrations";
import type { OnboardingModuleId } from "@/lib/onboarding-modules-data";
import {
  organisationLogoPath,
  organisationStoragePrefix,
  slugifyOrganisationName,
} from "@/lib/organisation-slug";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type PlatformOrganisation = {
  id: string;
  name: string;
  slug: string;
  primary_email: string;
  logo_path: string | null;
  payment_verified_at: string | null;
  payment_submitted_at: string | null;
  invoice_file_path: string | null;
  onboarding_completed_at: string | null;
};

export type OrganisationOnboardingState = {
  moduleSelectionMode: "all" | "choose";
  selectedModules: OnboardingModuleId[];
  importClientsCsv: boolean;
};

const ORGANISATION_SELECT_ATTEMPTS = [
  "id, name, slug, primary_email, logo_path, payment_verified_at, payment_submitted_at, invoice_file_path, onboarding_completed_at",
  "id, name, slug, primary_email, logo_path, payment_verified_at, onboarding_completed_at",
  "id, name, slug, primary_email",
  "id, name, primary_email",
] as const;

const PLATFORM_USER_ORG_SELECT_ATTEMPTS = [
  "organisation_id, client_name",
  "client_name",
] as const;

function isMissingTableOrColumnError(error: unknown, identifier: string) {
  if (isMissingColumnError(error, identifier)) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes(identifier) &&
    (message.includes("does not exist") || message.includes("schema cache"))
  );
}

function mapOrganisationRow(
  row: Record<string, unknown>,
  fallbackSlug?: string,
): PlatformOrganisation {
  const name = typeof row.name === "string" ? row.name : "";
  const slug =
    typeof row.slug === "string" && row.slug
      ? row.slug
      : (fallbackSlug ?? slugifyOrganisationName(name));

  return {
    id: String(row.id),
    name,
    slug,
    primary_email: typeof row.primary_email === "string" ? row.primary_email : "",
    logo_path: typeof row.logo_path === "string" ? row.logo_path : null,
    payment_verified_at:
      typeof row.payment_verified_at === "string" ? row.payment_verified_at : null,
    payment_submitted_at:
      typeof row.payment_submitted_at === "string" ? row.payment_submitted_at : null,
    invoice_file_path:
      typeof row.invoice_file_path === "string" ? row.invoice_file_path : null,
    onboarding_completed_at:
      typeof row.onboarding_completed_at === "string" ? row.onboarding_completed_at : null,
  };
}

async function selectOrganisationRow(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  filter: { column: "slug" | "name" | "id"; value: string },
) {
  for (const columns of ORGANISATION_SELECT_ATTEMPTS) {
    const { data, error } = await supabase
      .from("platform_organisations")
      .select(columns)
      .eq(filter.column, filter.value)
      .maybeSingle();

    if (!error && data && typeof data === "object") {
      return mapOrganisationRow(
        data as Record<string, unknown>,
        filter.column === "slug" ? filter.value : undefined,
      );
    }

    if (error) {
      if (
        isMissingTableError(error, "platform_organisations") ||
        isMissingTableOrColumnError(error, "slug") ||
        isMissingTableOrColumnError(error, "logo_path") ||
        isMissingTableOrColumnError(error, "payment_verified_at") ||
        isMissingTableOrColumnError(error, "payment_submitted_at") ||
        isMissingTableOrColumnError(error, "invoice_file_path") ||
        isMissingTableOrColumnError(error, "onboarding_completed_at")
      ) {
        continue;
      }

      throw new Error(error.message);
    }
  }

  return null;
}

async function getPlatformUserOrganisationHints(userId: string) {
  const supabase = requireSupabase();

  for (const columns of PLATFORM_USER_ORG_SELECT_ATTEMPTS) {
    const { data, error } = await supabase
      .from("platform_users")
      .select(columns)
      .eq("id", userId)
      .maybeSingle();

    if (!error && data && typeof data === "object") {
      const row = data as Record<string, unknown>;
      return {
        organisationId:
          typeof row.organisation_id === "string" ? row.organisation_id : null,
        clientName: typeof row.client_name === "string" ? row.client_name.trim() : "",
      };
    }

    if (error) {
      if (isMissingTableOrColumnError(error, "organisation_id")) {
        continue;
      }

      throw new Error(error.message);
    }
  }

  return null;
}

export async function createOrganisationRecord(name: string, primaryEmail: string) {
  const supabase = requireSupabase();
  await ensurePlatformOrganisationsTable().catch(() => false);

  const slug = await uniqueOrganisationSlug(name);
  await provisionOrganisationFolders(slug, name);
  const updatedAt = new Date().toISOString();

  const attempts: Array<Record<string, string>> = [
    { name, primary_email: primaryEmail, slug, updated_at: updatedAt },
    { name, primary_email: primaryEmail, updated_at: updatedAt },
  ];

  for (const row of attempts) {
    const { data, error } = await supabase
      .from("platform_organisations")
      .insert(row)
      .select("id, name, slug, primary_email")
      .single();

    if (!error && data && typeof data === "object") {
      return mapOrganisationRow(data as Record<string, unknown>, slug);
    }

    if (
      error &&
      (isMissingTableOrColumnError(error, "slug") || error.message.includes("does not exist"))
    ) {
      continue;
    }

    if (error) {
      throw new Error(error.message);
    }
  }

  throw new Error("Failed to create organisation.");
}

export async function ensureOrganisationForClientName(
  clientName: string,
  primaryEmail = "",
): Promise<PlatformOrganisation | null> {
  const trimmed = clientName.trim();
  if (!trimmed) {
    return null;
  }

  await ensurePlatformOrganisationsTable().catch(() => false);

  const slug = slugifyOrganisationName(trimmed);
  const bySlug = await getOrganisationBySlug(slug);
  if (bySlug) {
    return bySlug;
  }

  const supabase = requireSupabase();
  for (const columns of ORGANISATION_SELECT_ATTEMPTS) {
    const { data, error } = await supabase
      .from("platform_organisations")
      .select(columns)
      .eq("name", trimmed)
      .maybeSingle();

    if (!error && data && typeof data === "object") {
      return ensureOrganisationSlug(mapOrganisationRow(data as Record<string, unknown>, slug));
    }

    if (
      error &&
      (isMissingTableError(error, "platform_organisations") ||
        isMissingTableOrColumnError(error, "slug"))
    ) {
      break;
    }

    if (error) {
      throw new Error(error.message);
    }
  }

  try {
    return await createOrganisationRecord(trimmed, primaryEmail);
  } catch {
    return {
      id: `virtual-${slug}`,
      name: trimmed,
      slug,
      primary_email: primaryEmail,
      logo_path: null,
      payment_verified_at: null,
      payment_submitted_at: null,
      invoice_file_path: null,
      onboarding_completed_at: null,
    };
  }
}

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  return createSupabaseServerClient();
}

export async function uniqueOrganisationSlug(name: string, excludeId?: string) {
  const supabase = requireSupabase();
  await ensurePlatformOrganisationsTable().catch(() => false);

  const base = slugifyOrganisationName(name) || "organisation";
  let candidate = base;
  let suffix = 0;

  while (suffix < 100) {
    let query = supabase.from("platform_organisations").select("id").eq("slug", candidate).limit(1);
    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query;
    if (error && !isMissingColumnError(error, "slug")) {
      return base;
    }

    if (!data?.length) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return `${base}-${Date.now().toString(36)}`;
}

export async function provisionOrganisationFolders(slug: string, orgName: string) {
  const repoRoot = join(process.cwd(), "unit311central", slug);
  const publicImages = join(process.cwd(), "public", "unit311central", slug, "images");

  try {
    await mkdir(publicImages, { recursive: true });
    await mkdir(repoRoot, { recursive: true });
    await writeFile(
      join(repoRoot, "organisation.json"),
      JSON.stringify(
        {
          slug,
          name: orgName,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    await writeFile(join(publicImages, ".gitkeep"), "");
  } catch {
    // Non-fatal on read-only serverless filesystems.
  }
}

export async function getOrganisationBySlug(slug: string): Promise<PlatformOrganisation | null> {
  const supabase = requireSupabase();
  await ensurePlatformOrganisationsTable().catch(() => false);

  try {
    return await selectOrganisationRow(supabase, { column: "slug", value: slug });
  } catch (error) {
    if (isMissingTableError(error, "platform_organisations")) {
      return null;
    }
    throw error;
  }
}

async function ensureOrganisationSlug(
  organisation: PlatformOrganisation,
): Promise<PlatformOrganisation> {
  if (organisation.slug) {
    return organisation;
  }

  const supabase = requireSupabase();
  const slug = await uniqueOrganisationSlug(organisation.name, organisation.id);
  await provisionOrganisationFolders(slug, organisation.name);

  const { data, error } = await supabase
    .from("platform_organisations")
    .update({ slug, updated_at: new Date().toISOString() })
    .eq("id", organisation.id)
    .select(
      "id, name, slug, primary_email, logo_path, payment_verified_at, onboarding_completed_at",
    )
    .single();

  if (error || !data) {
    return { ...organisation, slug };
  }

  return data as PlatformOrganisation;
}

export async function getOrganisationForUser(
  userId: string,
  primaryEmail = "",
): Promise<PlatformOrganisation | null> {
  await ensurePlatformOrganisationsTable().catch(() => false);

  const hints = await getPlatformUserOrganisationHints(userId);
  if (!hints) {
    return null;
  }

  if (hints.organisationId) {
    const supabase = requireSupabase();
    const organisation = await selectOrganisationRow(supabase, {
      column: "id",
      value: hints.organisationId,
    });

    if (organisation) {
      return ensureOrganisationSlug(organisation);
    }
  }

  if (hints.clientName) {
    return ensureOrganisationForClientName(hints.clientName, primaryEmail);
  }

  return null;
}

export async function markOrganisationPaymentSubmitted(organisationId: string) {
  if (organisationId.startsWith("virtual-")) {
    return;
  }

  const supabase = requireSupabase();
  await ensurePlatformOrganisationsTable().catch(() => false);

  const patch = {
    payment_submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("platform_organisations").update(patch).eq("id", organisationId);

  if (error && !error.message.includes("payment_submitted_at")) {
    throw new Error(error.message);
  }
}

export async function markOrganisationPaymentReceiptFile(
  organisationId: string,
  receiptFileId: string,
) {
  if (organisationId.startsWith("virtual-")) {
    return;
  }

  const supabase = requireSupabase();
  await ensurePlatformOrganisationsTable().catch(() => false);

  const patch = {
    payment_receipt_file_id: receiptFileId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("platform_organisations").update(patch).eq("id", organisationId);

  if (error && !error.message.includes("payment_receipt_file_id")) {
    throw new Error(error.message);
  }
}

export async function markOrganisationPaymentVerified(organisationId: string) {
  if (organisationId.startsWith("virtual-")) {
    return;
  }

  const supabase = requireSupabase();
  await ensurePlatformOrganisationsTable().catch(() => false);

  const attempts = [
    {
      payment_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      updated_at: new Date().toISOString(),
    },
  ];

  for (const patch of attempts) {
    const { error } = await supabase.from("platform_organisations").update(patch).eq("id", organisationId);

    if (!error) {
      return;
    }

    if (isMissingTableOrColumnError(error, "payment_verified_at")) {
      continue;
    }

    throw new Error(error.message);
  }
}

export async function getOrganisationOnboarding(
  organisationId: string,
): Promise<OrganisationOnboardingState | null> {
  const supabase = requireSupabase();
  await ensurePlatformOrganisationOnboarding().catch(() => false);

  const { data, error } = await supabase
    .from("platform_organisation_onboarding")
    .select("module_selection_mode, selected_modules, import_clients_csv")
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("does not exist")) {
      return null;
    }
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    moduleSelectionMode: data.module_selection_mode === "choose" ? "choose" : "all",
    selectedModules: Array.isArray(data.selected_modules)
      ? (data.selected_modules as OnboardingModuleId[])
      : [],
    importClientsCsv: Boolean(data.import_clients_csv),
  };
}

export async function saveOrganisationOnboarding(
  organisationId: string,
  input: OrganisationOnboardingState,
) {
  const supabase = requireSupabase();
  await ensurePlatformOrganisationOnboarding().catch(() => false);

  const now = new Date().toISOString();
  const row = {
    organisation_id: organisationId,
    module_selection_mode: input.moduleSelectionMode,
    selected_modules: input.selectedModules,
    import_clients_csv: input.importClientsCsv,
    updated_at: now,
  };

  const { error: upsertError } = await supabase
    .from("platform_organisation_onboarding")
    .upsert(row, { onConflict: "organisation_id" });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const { error: orgError } = await supabase
    .from("platform_organisations")
    .update({
      onboarding_completed_at: now,
      updated_at: now,
    })
    .eq("id", organisationId);

  if (orgError) {
    throw new Error(orgError.message);
  }
}

function extensionFromFileName(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!match) {
    return "png";
  }

  const ext = match[1];
  if (ext === "jpeg") {
    return "jpg";
  }

  return ext;
}

export async function uploadOrganisationLogo(slug: string, file: File) {
  const supabase = requireSupabase();
  const organisation = await getOrganisationBySlug(slug);
  if (!organisation) {
    throw new Error("Organisation not found.");
  }

  const extension = extensionFromFileName(file.name);
  const storagePath = `${organisationStoragePrefix(slug)}/images/logo.${extension}`;
  const publicPath = organisationLogoPath(slug, extension);
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(INTERNAL_FILES_BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type || "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const localPath = join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  try {
    await mkdir(join(process.cwd(), "public", "unit311central", slug, "images"), {
      recursive: true,
    });
    await writeFile(localPath, bytes);
  } catch {
    // Local filesystem may be read-only in production.
  }

  const { data: publicUrlData } = supabase.storage
    .from(INTERNAL_FILES_BUCKET)
    .getPublicUrl(storagePath);

  const logoPath = publicUrlData.publicUrl || publicPath;

  const { error: updateError } = await supabase
    .from("platform_organisations")
    .update({
      logo_path: logoPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organisation.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    logoPath,
    publicPath,
    storagePath,
  };
}

export function resolveOrganisationLogoUrl(organisation: Pick<PlatformOrganisation, "slug" | "logo_path">) {
  if (organisation.logo_path) {
    return organisation.logo_path;
  }

  return organisationLogoPath(organisation.slug);
}
