import {
  CRM_COMPANY_LOGO_CANVAS_HEIGHT,
  CRM_COMPANY_LOGO_CANVAS_WIDTH,
  CRM_COMPANY_LOGO_FILENAME,
  CRM_COMPANY_LOGO_MAX_UPLOAD_BYTES,
} from "@/lib/crm-company-logo-data";

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "svg"]);

function extensionFromFileName(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function validateCompanyLogoUpload(file: File) {
  const extension = extensionFromFileName(file.name);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Logo must be a PNG, JPG, or SVG file.");
  }

  if (file.size > CRM_COMPANY_LOGO_MAX_UPLOAD_BYTES) {
    throw new Error("Logo file is too large. Maximum size is 5 MB.");
  }
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read logo image."));
    };
    image.src = url;
  });
}

/** Rasterize and fit the logo into a fixed 2:1 canvas for consistent report placement. */
export async function normalizeCompanyLogoFile(file: File) {
  validateCompanyLogoUpload(file);

  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = CRM_COMPANY_LOGO_CANVAS_WIDTH;
  canvas.height = CRM_COMPANY_LOGO_CANVAS_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to process logo image.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const scale = Math.min(
    canvas.width / image.width,
    canvas.height / image.height,
    1,
  );
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (canvas.width - drawWidth) / 2;
  const offsetY = (canvas.height - drawHeight) / 2;

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("Unable to encode logo image."));
        return;
      }
      resolve(result);
    }, "image/png");
  });

  return new File([blob], CRM_COMPANY_LOGO_FILENAME, { type: "image/png" });
}
