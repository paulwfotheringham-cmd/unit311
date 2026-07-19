export const BOOK_THANK_YOU_GENERAL_ITEMS = [
  "Real-time visibility across your business",
  "Integration and interoperability across business functions and software",
  "Dashboard customization",
  "Generating advanced business reports",
  "Business-wide data consistency and governance",
  "Platform security and scalability",
  "The onboarding process",
] as const;

export const BOOK_THANK_YOU_MODULE_ITEMS = [
  "AI Executive Assistant / Board Deck Automation / Other",
  "Clients, CRM, Client Acquisition / Onboarding",
  "CRM",
  "Project Management",
  "Financial / Reporting",
  "Human Resources / Representative Mgmt",
  "Asset, Inventory & Logistics Management",
  "Engineering Management",
  "Information Repository",
  "Messaging / Calendar / Email / Social Media Mgmt",
  "Support Center",
  "Training Center",
  "Quality Management System",
  "Competitors / Whiteboard",
  "Website Management",
  "User, Roles & Notification Management",
] as const;

export type BookThankYouSelections = {
  general: Record<string, boolean>;
  modules: Record<string, boolean>;
};

export function createEmptyBookThankYouSelections(): BookThankYouSelections {
  return {
    general: Object.fromEntries(BOOK_THANK_YOU_GENERAL_ITEMS.map((item) => [item, false])),
    modules: Object.fromEntries(BOOK_THANK_YOU_MODULE_ITEMS.map((item) => [item, false])),
  };
}

export function getSelectedBookThankYouItems(selections: BookThankYouSelections) {
  const general = BOOK_THANK_YOU_GENERAL_ITEMS.filter((item) => selections.general[item]);
  const modules = BOOK_THANK_YOU_MODULE_ITEMS.filter((item) => selections.modules[item]);
  return { general, modules };
}

export function formatBookThankYouSelectionsNotes(selections: BookThankYouSelections) {
  const { general, modules } = getSelectedBookThankYouItems(selections);
  const lines = ["Pre-meeting focus areas submitted via /book:"];

  lines.push("", "General:");
  if (general.length === 0) {
    lines.push("- (none selected)");
  } else {
    general.forEach((item) => lines.push(`- ${item}`));
  }

  lines.push("", "Modules:");
  if (modules.length === 0) {
    lines.push("- (none selected)");
  } else {
    modules.forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n");
}

export const PRE_MEETING_FOCUS_PDF_FILE_ID_PREFIX = "Pre-meeting focus PDF file id:";

export function buildPreMeetingFocusPdfNote(fileId: string) {
  return `${PRE_MEETING_FOCUS_PDF_FILE_ID_PREFIX} ${fileId}`;
}

export function parsePreMeetingFocusPdfFileId(notes: string | null | undefined) {
  const match = notes?.match(
    /Pre-meeting focus PDF file id:\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  return match?.[1] ?? null;
}
