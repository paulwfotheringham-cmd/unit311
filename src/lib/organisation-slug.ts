export function slugifyOrganisationName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function organisationPublicImageDir(slug: string) {
  return `/unit311central/${slug}/images`;
}

export function organisationLogoPath(slug: string, extension = "png") {
  return `${organisationPublicImageDir(slug)}/logo.${extension}`;
}

export function organisationStoragePrefix(slug: string) {
  return `unit311central/${slug}`;
}
