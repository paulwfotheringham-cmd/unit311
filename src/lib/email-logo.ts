import { SITE_LOGO_URL, SITE_NAME } from "@/lib/site";

export function emailLogoHtml() {
  const logoUrl = SITE_LOGO_URL;
  return `
    <div style="margin-bottom:24px;">
      <img
        src="${logoUrl}"
        alt="${SITE_NAME}"
        width="155"
        height="40"
        style="display:block;height:40px;width:auto;max-width:100%;"
      />
    </div>
  `;
}
