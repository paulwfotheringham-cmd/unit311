import { CENTRAL_SITE_URL } from "@/lib/app-domains";
import { updateInternalClient } from "@/lib/internal-clients-service";
import { sendMailboxEmail } from "@/lib/email/smtp";
import {
  markOrganisationPaymentVerified,
} from "@/lib/organisation-service";
import { buildPaymentAcceptedEmail } from "@/lib/platform-email-verification/emails";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

export async function markClientPaymentReceived(clientId: string) {
  const supabase = requireSupabase();
  const { data: clientRow, error } = await supabase
    .from("internal_clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!clientRow) throw new Error("Client not found.");

  const organisationId =
    typeof clientRow.platform_organisation_id === "string"
      ? clientRow.platform_organisation_id
      : null;

  if (!organisationId) {
    throw new Error("This client is not linked to a signup organisation.");
  }

  await markOrganisationPaymentVerified(organisationId);

  const workspaceId =
    typeof clientRow.workspace_id === "string" ? clientRow.workspace_id.trim() : "";
  if (!workspaceId) {
    throw new Error("This client is not linked to a workspace.");
  }

  const updatedClient = await updateInternalClient(
    clientId,
    {
      accountStatus: "Active",
      notes: `${String(clientRow.notes ?? "")}\nPayment marked received ${new Date().toISOString()}.`.trim(),
    },
    { workspaceId },
  );

  const { data: orgRow } = await supabase
    .from("platform_organisations")
    .select("slug, name, primary_email")
    .eq("id", organisationId)
    .maybeSingle();

  const slug = typeof orgRow?.slug === "string" ? orgRow.slug : null;
  const contactEmail =
    (typeof clientRow.email === "string" && clientRow.email) ||
    (typeof orgRow?.primary_email === "string" && orgRow.primary_email) ||
    null;

  if (contactEmail && slug) {
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? CENTRAL_SITE_URL).replace(/\/$/, "");
    const questionsUrl = `${baseUrl}/questions/${slug}`;
    const message = buildPaymentAcceptedEmail({
      displayName: String(clientRow.primary_contact ?? orgRow?.name ?? "there"),
      questionsUrl,
    });

    await sendMailboxEmail({
      account: "info",
      to: contactEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }).catch(() => undefined);
  }

  return updatedClient;
}
