import {
  CLIENT_ONBOARDING_STAGE_ORDER,
  computeOnboardingProgressPercent,
  getOnboardingStageLabel,
  mapClientOnboardingRecord,
  type ClientOnboardingAdvanceAction,
  type ClientOnboardingRecord,
  type ClientOnboardingStage,
} from "@/lib/client-onboarding-data";
import { getFileDownloadUrl } from "@/lib/internal-files-service";
import {
  ensureClientOnboardingRecordsTable,
  isMissingTableError,
} from "@/lib/internal-db-migrations";
import { listInternalClients, updateInternalClient } from "@/lib/internal-clients-service";
import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { sendMailboxEmail } from "@/lib/email/smtp";
import {
  ONBOARDING_MODULES,
  type OnboardingModuleId,
} from "@/lib/onboarding-modules-data";
import {
  getOrganisationBySlug,
  getOrganisationOnboarding,
  markOrganisationPaymentVerified,
  resolveOrganisationLogoUrl,
  type PlatformOrganisation,
} from "@/lib/organisation-service";
import { buildPaymentAcceptedEmail } from "@/lib/platform-email-verification/emails";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace-context";

type CreateClientOnboardingInput = {
  platformOrganisationId?: string | null;
  platformUserId?: string | null;
  companyName: string;
  contactName: string;
  contactEmail: string;
};

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
  }

  return createSupabaseServerClient();
}

async function withClientOnboardingTable<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isMissingTableError(error, "client_onboarding_records")) {
        throw error;
      }

      await ensureClientOnboardingRecordsTable();
      if (attempt === 4) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }

  throw new Error("Failed to access client onboarding records.");
}

function getExpectedPreviousStage(action: ClientOnboardingAdvanceAction): ClientOnboardingStage {
  const targetIndex = CLIENT_ONBOARDING_STAGE_ORDER.indexOf(action);
  if (targetIndex <= 0) {
    return "signed_up";
  }
  return CLIENT_ONBOARDING_STAGE_ORDER[targetIndex - 1]!;
}

function buildAdvanceUpdate(
  action: ClientOnboardingAdvanceAction,
  actorLabel: string,
  now: string,
): Record<string, string | number> {
  const progressPercent = computeOnboardingProgressPercent(action);
  const update: Record<string, string | number> = {
    current_stage: action,
    progress_percent: progressPercent,
    updated_at: now,
  };

  switch (action) {
    case "payment_received":
      update.payment_received_at = now;
      update.payment_received_by = actorLabel;
      break;
    case "questionnaire_complete":
      update.questionnaire_complete_at = now;
      update.questionnaire_complete_by = actorLabel;
      break;
    case "platform_clone_complete":
      update.platform_clone_complete_at = now;
      update.platform_clone_complete_by = actorLabel;
      break;
    case "review_complete":
      update.review_complete_at = now;
      update.review_complete_by = actorLabel;
      break;
    case "platform_live":
      update.platform_live_at = now;
      update.platform_live_by = actorLabel;
      update.current_status = "Platform Live";
      break;
    default:
      break;
  }

  return update;
}

async function handlePaymentReceivedSideEffects(record: ClientOnboardingRecord) {
  const organisationId = record.platformOrganisationId;
  if (!organisationId) {
    throw new Error("This onboarding record is not linked to a signup organisation.");
  }

  await markOrganisationPaymentVerified(organisationId);

  const supabase = requireSupabase();
  const { data: orgRow, error: orgError } = await supabase
    .from("platform_organisations")
    .select("slug, name")
    .eq("id", organisationId)
    .maybeSingle();

  if (orgError) {
    throw new Error(orgError.message);
  }

  const organisation =
    orgRow && typeof orgRow.slug === "string"
      ? await getOrganisationBySlug(orgRow.slug).catch(() => null)
      : null;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? CENTRAL_SITE_URL).replace(/\/$/, "");
  const orgSlug = organisation?.slug ?? (typeof orgRow?.slug === "string" ? orgRow.slug : null);
  const questionsUrl = orgSlug ? `${siteUrl}/questions/${orgSlug}` : `${siteUrl}/questions`;

  const message = buildPaymentAcceptedEmail({
    displayName: record.contactName,
    questionsUrl,
  });

  await sendMailboxEmail({
    account: "info",
    to: record.contactEmail,
    subject: message.subject,
    html: message.html,
    text: message.text,
  }).catch(() => undefined);

  const workspace = await getCurrentWorkspace();
  const scope = workspace ? { workspaceId: workspace.id } : undefined;
  const clients = scope ? await listInternalClients(scope) : [];
  const linkedClient =
    clients.find((client) => client.platformOrganisationId === organisationId) ??
    clients.find(
      (client) =>
        client.companyName.trim().toLowerCase() === record.companyName.trim().toLowerCase() &&
        client.email.trim().toLowerCase() === record.contactEmail.trim().toLowerCase(),
    );

  if (linkedClient && scope) {
    await updateInternalClient(
      linkedClient.id,
      {
        accountStatus: "Pending",
        platformOrganisationId: organisationId,
        notes: `${linkedClient.notes}\nPayment received ${new Date().toISOString()}.`.trim(),
      },
      scope,
    );
  }
}

/** Call from the signup flow when a customer successfully registers. */
export async function createClientOnboardingRecordForSignup(
  input: CreateClientOnboardingInput,
): Promise<ClientOnboardingRecord | null> {
  await ensureClientOnboardingRecordsTable().catch(() => false);

  const supabase = requireSupabase();
  const now = new Date().toISOString();

  return withClientOnboardingTable(async () => {
    const row = {
      platform_organisation_id: input.platformOrganisationId ?? null,
      platform_user_id: input.platformUserId ?? null,
      company_name: input.companyName.trim(),
      contact_name: input.contactName.trim(),
      contact_email: input.contactEmail.trim().toLowerCase(),
      signup_date: now,
      current_stage: "signed_up",
      progress_percent: computeOnboardingProgressPercent("signed_up"),
      current_status: "In Progress",
      signed_up_at: now,
      signed_up_by: "System",
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("client_onboarding_records")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapClientOnboardingRecord(data);
  });
}

export async function listClientOnboardingRecords(options?: {
  status?: "all" | "in_progress" | "platform_live";
}): Promise<ClientOnboardingRecord[]> {
  await ensureClientOnboardingRecordsTable().catch(() => false);
  const supabase = requireSupabase();

  return withClientOnboardingTable(async () => {
    let query = supabase
      .from("client_onboarding_records")
      .select("*")
      .order("signup_date", { ascending: false });

    if (options?.status === "in_progress") {
      query = query.eq("current_status", "In Progress");
    } else if (options?.status === "platform_live") {
      query = query.eq("current_status", "Platform Live");
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapClientOnboardingRecord);
  });
}

export async function getClientOnboardingRecord(id: string): Promise<ClientOnboardingRecord | null> {
  await ensureClientOnboardingRecordsTable().catch(() => false);
  const supabase = requireSupabase();

  return withClientOnboardingTable(async () => {
    const { data, error } = await supabase
      .from("client_onboarding_records")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return mapClientOnboardingRecord(data);
  });
}

export async function deleteClientOnboardingRecord(id: string): Promise<void> {
  await ensureClientOnboardingRecordsTable().catch(() => false);
  const supabase = requireSupabase();

  return withClientOnboardingTable(async () => {
    const { error } = await supabase.from("client_onboarding_records").delete().eq("id", id);
    if (error) throw new Error(error.message);
  });
}

export async function advanceClientOnboardingStage(input: {
  id: string;
  action: ClientOnboardingAdvanceAction;
  actorLabel: string;
}): Promise<ClientOnboardingRecord> {
  await ensureClientOnboardingRecordsTable().catch(() => false);
  const supabase = requireSupabase();
  const existing = await getClientOnboardingRecord(input.id);

  if (!existing) {
    throw new Error("Onboarding record not found.");
  }

  if (existing.currentStatus === "Platform Live") {
    throw new Error("This client onboarding is already complete.");
  }

  const expectedPreviousStage = getExpectedPreviousStage(input.action);
  if (existing.currentStage !== expectedPreviousStage) {
    throw new Error(
      `Complete "${getOnboardingStageLabel(expectedPreviousStage)}" before advancing.`,
    );
  }

  const now = new Date().toISOString();
  const update = buildAdvanceUpdate(input.action, input.actorLabel, now);

  return withClientOnboardingTable(async () => {
    const { data, error } = await supabase
      .from("client_onboarding_records")
      .update(update)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const updated = mapClientOnboardingRecord(data);

    if (input.action === "payment_received") {
      await handlePaymentReceivedSideEffects(existing);
    }

    return updated;
  });
}

export type ClientOnboardingQuestionnaireSummary = {
  organisationName: string | null;
  logoPath: string | null;
  completedAt: string | null;
  moduleSelectionMode: "all" | "choose";
  selectedModuleLabels: string[];
  importClientsCsv: boolean;
};

async function getOrganisationForOnboardingRecord(
  organisationId: string | null | undefined,
): Promise<PlatformOrganisation | null> {
  if (!organisationId) {
    return null;
  }

  const supabase = requireSupabase();

  for (const columns of [
    "id, name, slug, primary_email, logo_path, payment_verified_at, payment_submitted_at, invoice_file_path, onboarding_completed_at, payment_receipt_file_id",
    "id, name, slug, primary_email, logo_path, payment_verified_at, onboarding_completed_at, payment_receipt_file_id",
    "id, name, slug, primary_email, logo_path, onboarding_completed_at",
    "id, name, slug, primary_email",
  ]) {
    const { data, error } = await supabase
      .from("platform_organisations")
      .select(columns)
      .eq("id", organisationId)
      .maybeSingle();

    if (!error && data) {
      return data as unknown as PlatformOrganisation;
    }

    if (error && !error.message.includes("does not exist") && !error.message.includes(columns.split(",")[0]!)) {
      if (error.message.includes("payment_receipt_file_id") || error.message.includes("onboarding_completed_at")) {
        continue;
      }
      throw new Error(error.message);
    }
  }

  return null;
}

function mapSelectedModuleLabels(
  moduleSelectionMode: "all" | "choose",
  selectedModules: OnboardingModuleId[],
) {
  if (moduleSelectionMode === "all") {
    return [];
  }

  const labelsById = new Map(ONBOARDING_MODULES.map((module) => [module.id, module.label]));
  return selectedModules
    .map((moduleId) => labelsById.get(moduleId))
    .filter((label): label is string => Boolean(label));
}

export async function getClientOnboardingQuestionnaireSummary(
  recordId: string,
): Promise<ClientOnboardingQuestionnaireSummary | null> {
  const record = await getClientOnboardingRecord(recordId);
  if (!record) {
    return null;
  }

  const organisation = await getOrganisationForOnboardingRecord(record.platformOrganisationId);
  const onboarding = record.platformOrganisationId
    ? await getOrganisationOnboarding(record.platformOrganisationId).catch(() => null)
    : null;

  const moduleSelectionMode = onboarding?.moduleSelectionMode ?? "all";

  return {
    organisationName: organisation?.name ?? record.companyName,
    logoPath: organisation ? resolveOrganisationLogoUrl(organisation) : null,
    completedAt: organisation?.onboarding_completed_at ?? record.questionnaireCompleteAt ?? null,
    moduleSelectionMode,
    selectedModuleLabels: mapSelectedModuleLabels(
      moduleSelectionMode,
      onboarding?.selectedModules ?? [],
    ),
    importClientsCsv: onboarding?.importClientsCsv ?? false,
  };
}

export async function getClientOnboardingPaymentReceipt(
  recordId: string,
): Promise<{ url: string; name: string } | null> {
  const record = await getClientOnboardingRecord(recordId);
  if (!record?.platformOrganisationId) {
    return null;
  }

  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("platform_organisations")
    .select("payment_receipt_file_id")
    .eq("id", record.platformOrganisationId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("payment_receipt_file_id") || error.message.includes("does not exist")) {
      return null;
    }
    throw new Error(error.message);
  }

  const receiptFileId =
    data && typeof data.payment_receipt_file_id === "string" ? data.payment_receipt_file_id : null;

  if (!receiptFileId) {
    return null;
  }

  const download = await getFileDownloadUrl(receiptFileId);
  return {
    url: download.url,
    name: download.name,
  };
}
