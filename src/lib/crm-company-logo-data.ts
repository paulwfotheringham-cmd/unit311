/** Normalized report logo canvas — 2:1 landscape slot, logo scaled to fit inside. */
export const CRM_COMPANY_LOGO_FILENAME = "Company Logo.png";
export const CRM_COMPANY_LOGO_CANVAS_WIDTH = 480;
export const CRM_COMPANY_LOGO_CANVAS_HEIGHT = 240;
export const CRM_COMPANY_LOGO_ASPECT = CRM_COMPANY_LOGO_CANVAS_WIDTH / CRM_COMPANY_LOGO_CANVAS_HEIGHT;
export const CRM_COMPANY_LOGO_ACCEPT = "image/png,image/jpeg,image/jpg,image/svg+xml";
export const CRM_COMPANY_LOGO_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** PDF title page logo box (millimetres). */
export const CRM_COMPANY_LOGO_PDF_WIDTH_MM = 36;
export const CRM_COMPANY_LOGO_PDF_HEIGHT_MM = 18;

/** PowerPoint title slide logo box (inches). */
export const CRM_COMPANY_LOGO_PPTX_WIDTH_IN = 2.4;
export const CRM_COMPANY_LOGO_PPTX_HEIGHT_IN = 1.2;

export type ClientReportLogo = {
  dataUrl: string;
  width: number;
  height: number;
};

export function bufferToClientReportLogo(buffer: Buffer): ClientReportLogo {
  return {
    dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
    width: CRM_COMPANY_LOGO_CANVAS_WIDTH,
    height: CRM_COMPANY_LOGO_CANVAS_HEIGHT,
  };
}
