import type { CrmLead } from "@/lib/crm-data";
import {
  DISCOVERY_QUESTION_SECTIONS,
  DISCOVERY_QUESTION_TEMPLATES,
  type DiscoveryQuestionnaireData,
} from "@/lib/discovery-questions-data";

export type ClientReportSection = {
  heading: string;
  lines: string[];
};

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function buildClientReportSections(input: {
  lead: CrmLead;
  questionnaire: DiscoveryQuestionnaireData | null;
}): ClientReportSection[] {
  const sections: ClientReportSection[] = [];
  const questionnaire = input.questionnaire;

  if (questionnaire) {
    for (const sectionName of DISCOVERY_QUESTION_SECTIONS) {
      const lines: string[] = [];

      for (const question of DISCOVERY_QUESTION_TEMPLATES.filter(
        (entry) => entry.section === sectionName,
      )) {
        const answer = cleanLine(questionnaire.answers[question.id] ?? "");
        if (answer) {
          lines.push(`${question.label}: ${answer}`);
        }
      }

      for (const row of questionnaire.customRows.filter((entry) => entry.section === sectionName)) {
        const answer = cleanLine(row.answer);
        if (answer) {
          lines.push(`${row.label}: ${answer}`);
        }
      }

      if (lines.length > 0) {
        sections.push({ heading: sectionName, lines });
      }
    }
  }

  if (sections.length === 0 && input.lead.discoveryNotes.trim()) {
    sections.push({
      heading: "Discovery highlights",
      lines: input.lead.discoveryNotes
        .replace(/<[^>]+>/g, " ")
        .split(/\n+/)
        .map(cleanLine)
        .filter(Boolean),
    });
  }

  if (sections.length === 0) {
    sections.push({
      heading: "Discovery highlights",
      lines: ["Discovery questionnaire answers will appear here once saved in CRM."],
    });
  }

  return sections;
}

export function buildClientReportSummary(lead: CrmLead) {
  return `Executive strategy report for ${lead.companyName.trim() || "the client organisation"}, prepared following the discovery session with ${lead.contactName.trim() || "the client contact"}.`;
}

/** Title + summary + one slide/page per populated section (matches PDF and PPTX). */
export function clientReportSlideCount(sections: ClientReportSection[]) {
  return 2 + sections.length;
}
