import type { CrmLead } from "@/lib/crm-data";
import {
  bufferToClientReportLogo,
  CRM_COMPANY_LOGO_FILENAME,
  type ClientReportLogo,
} from "@/lib/crm-company-logo-data";
import { ensureExternalClientFolder } from "@/lib/external-files-service";
import { getLeadById, updateLead } from "@/lib/crm-leads-service";
import {
  deleteFile,
  downloadFileBuffer,
  requireFilesSupabase,
  uploadFile,
} from "@/lib/internal-files-service";

async function findFolderLogoFile(folderId: string, fileName = CRM_COMPANY_LOGO_FILENAME) {
  const supabase = requireFilesSupabase();
  const { data, error } = await supabase
    .from("file_objects")
    .select("id")
    .eq("folder_id", folderId)
    .eq("name", fileName)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id as string | undefined;
}

export async function uploadCrmLeadCompanyLogo(leadId: string, file: File) {
  const lead = await getLeadById(leadId);
  if (!lead) {
    throw new Error("Lead not found.");
  }

  const folder = await ensureExternalClientFolder(lead.companyName);
  const existingFolderLogoId = await findFolderLogoFile(folder.id);
  if (existingFolderLogoId) {
    await deleteFile(existingFolderLogoId).catch(() => undefined);
  }

  if (lead.companyLogoFileId && lead.companyLogoFileId !== existingFolderLogoId) {
    await deleteFile(lead.companyLogoFileId).catch(() => undefined);
  }

  const uploaded = await uploadFile({
    file,
    folderId: folder.id,
    categoryId: null,
  });

  const updatedLead = await updateLead(
    leadId,
    {
      companyLogoFileId: uploaded.id,
      companyLogoFileName: uploaded.name,
    },
    { workspaceId: lead.workspaceId },
  );

  return {
    lead: updatedLead,
    fileId: uploaded.id,
    fileName: uploaded.name,
    folderId: folder.id,
  };
}

export async function loadClientReportLogoForLead(
  lead: Pick<CrmLead, "companyLogoFileId">,
): Promise<ClientReportLogo | null> {
  if (!lead.companyLogoFileId) return null;

  try {
    const saved = await downloadFileBuffer(lead.companyLogoFileId);
    return bufferToClientReportLogo(saved.buffer);
  } catch {
    return null;
  }
}
