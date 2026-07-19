import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import { ensureExternalClientFolder } from "@/lib/external-files-service";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";
import { deleteFile, uploadFile } from "@/lib/internal-files-service";
import type { CrmLead } from "@/lib/crm-data";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function toUploadFile(name: string, buffer: Buffer, mimeType: string) {
  const bytes = Uint8Array.from(buffer);
  const blob = new Blob([bytes], { type: mimeType });
  return new File([blob], name, { type: mimeType });
}

function htmlToPlainParagraphs(html: string) {
  const normalized = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

  return normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function discoveryNotesFileName(organization: string) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
  const safeOrg = organization.replace(/[<>:"/\\|?*]+/g, "").trim() || "Client";
  return `Discovery Notes — ${safeOrg} — ${date}.docx`;
}

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

async function deleteNamedFilesInFolder(folderId: string, names: string[]) {
  const supabase = requireSupabase();
  for (const name of names) {
    const { data, error } = await supabase
      .from("file_objects")
      .select("id")
      .eq("folder_id", folderId)
      .eq("name", name)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) continue;
    await deleteFile(data.id as string);
  }
}

export async function saveCrmDiscoveryNotesDocument(lead: CrmLead) {
  const notesHtml = lead.discoveryNotes.trim();
  if (!notesHtml) {
    return null;
  }

  const folderId = (await ensureExternalClientFolder(lead.companyName)).id;
  const paragraphs = htmlToPlainParagraphs(notesHtml);
  const fileName = discoveryNotesFileName(lead.companyName);
  const savedAt = new Date().toISOString();

  await deleteNamedFilesInFolder(folderId, [fileName]);

  const children = [
    new Paragraph({
      text: `Discovery Notes — ${lead.companyName}`,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Contact: ${lead.contactName}` })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Saved: ${formatLondonDateTime(savedAt)} GMT`,
        }),
      ],
      spacing: { after: 240 },
    }),
    ...paragraphs.map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line })],
          spacing: { after: 120 },
        }),
    ),
  ];

  const doc = new Document({ sections: [{ children }] });
  const docxBuffer = await Packer.toBuffer(doc);

  const docxFile = await uploadFile({
    file: toUploadFile(
      fileName,
      docxBuffer,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    folderId,
    categoryId: null,
  });

  return {
    fileId: docxFile.id,
    fileName,
    folderId,
  };
}
