import pptxgen from "pptxgenjs";

import {
  buildClientReportSections,
  buildClientReportSummary,
} from "@/lib/crm-client-report-content";
import {
  CRM_COMPANY_LOGO_PPTX_HEIGHT_IN,
  CRM_COMPANY_LOGO_PPTX_WIDTH_IN,
  type ClientReportLogo,
} from "@/lib/crm-company-logo-data";
import type { CrmLead } from "@/lib/crm-data";
import type { DiscoveryQuestionnaireData } from "@/lib/discovery-questions-data";
import { formatLondonDateTime } from "@/lib/founder-booking/slots";

export function clientReportPptxFileName(organization: string) {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
  const safeOrg = organization.replace(/[<>:"/\\|?*]+/g, "").trim() || "Client";
  return `Executive Report — ${safeOrg} — ${date}.pptx`;
}

export async function buildCrmClientReportPptx(
  lead: CrmLead,
  questionnaire: DiscoveryQuestionnaireData | null,
  logo: ClientReportLogo | null = null,
): Promise<Uint8Array> {
  const generatedAt = new Date().toISOString();
  const sections = buildClientReportSections({ lead, questionnaire });
  const pptx = new pptxgen();
  pptx.author = "Unit311 Central";
  pptx.title = `Executive Report — ${lead.companyName}`;
  pptx.layout = "LAYOUT_WIDE";

  const titleSlide = pptx.addSlide();
  if (logo) {
    titleSlide.addShape(pptx.ShapeType.roundRect, {
      x: 10.2,
      y: 0.25,
      w: CRM_COMPANY_LOGO_PPTX_WIDTH_IN + 0.2,
      h: CRM_COMPANY_LOGO_PPTX_HEIGHT_IN + 0.2,
      fill: { color: "FFFFFF" },
      line: { color: "E2E8F0", width: 0.75 },
      rectRadius: 0.08,
    });
    titleSlide.addImage({
      data: logo.dataUrl,
      x: 10.3,
      y: 0.35,
      w: CRM_COMPANY_LOGO_PPTX_WIDTH_IN,
      h: CRM_COMPANY_LOGO_PPTX_HEIGHT_IN,
    });
  }
  titleSlide.addText("Executive Strategy Report", {
    x: 0.6,
    y: 1.2,
    w: 11.5,
    h: 1,
    fontSize: 32,
    bold: true,
    color: "0B2D63",
  });
  titleSlide.addText(lead.companyName.trim() || "Client organisation", {
    x: 0.6,
    y: 2.3,
    w: 11.5,
    h: 0.6,
    fontSize: 20,
    color: "334155",
  });
  titleSlide.addText(`Prepared for ${lead.contactName.trim() || "Contact"}`, {
    x: 0.6,
    y: 3.0,
    w: 11.5,
    h: 0.5,
    fontSize: 14,
    color: "64748B",
  });
  titleSlide.addText(`Generated ${formatLondonDateTime(generatedAt)} GMT`, {
    x: 0.6,
    y: 6.5,
    w: 11.5,
    h: 0.4,
    fontSize: 11,
    color: "94A3B8",
  });
  titleSlide.addText("Unit311 Central", {
    x: 0.6,
    y: 6.9,
    w: 11.5,
    h: 0.4,
    fontSize: 11,
    color: "94A3B8",
  });

  const summarySlide = pptx.addSlide();
  summarySlide.addText("Summary", {
    x: 0.6,
    y: 0.6,
    w: 11.5,
    h: 0.6,
    fontSize: 24,
    bold: true,
    color: "0B2D63",
  });
  summarySlide.addText(buildClientReportSummary(lead), {
    x: 0.6,
    y: 1.5,
    w: 11.5,
    h: 4.5,
    fontSize: 16,
    color: "334155",
    valign: "top",
  });

  for (const section of sections) {
    const slide = pptx.addSlide();
    slide.addText(section.heading, {
      x: 0.6,
      y: 0.6,
      w: 11.5,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: "0B2D63",
    });
    slide.addText(section.lines.join("\n\n"), {
      x: 0.6,
      y: 1.5,
      w: 11.5,
      h: 5.0,
      fontSize: 14,
      color: "334155",
      valign: "top",
    });
  }

  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return new Uint8Array(buffer);
}
