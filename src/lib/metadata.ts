import type { Metadata } from "next";
import {
  SEO_KEYWORDS,
  SITE_DESCRIPTION,
  SITE_HOME_TITLE,
  SITE_NAME,
  SITE_OG_IMAGE_URL,
  SITE_URL,
} from "./site";

type PageMeta = {
  title: string;
  description: string;
  path: string;
  /** When set, used as the full document title (no "| Unit311" suffix). */
  absoluteTitle?: string;
  index?: boolean;
  follow?: boolean;
};

function absoluteUrl(path: string) {
  if (path === "" || path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createPageMetadata({
  title,
  description,
  path,
  absoluteTitle,
  index = true,
  follow = true,
}: PageMeta): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = absoluteTitle ?? (path === "/" ? SITE_HOME_TITLE : `${title} | ${SITE_NAME}`);
  const ogImages = [
    {
      url: SITE_OG_IMAGE_URL,
      width: 1200,
      height: 630,
      alt: `${SITE_NAME} business operations platform`,
    },
  ];

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
    },
    keywords: [...SEO_KEYWORDS],
    openGraph: {
      type: "website",
      locale: "en_GB",
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [SITE_OG_IMAGE_URL],
    },
    robots: {
      index,
      follow,
    },
  };
}

export function createNoIndexMetadata({
  title,
  description,
  path,
  absoluteTitle,
}: Omit<PageMeta, "index" | "follow">): Metadata {
  return createPageMetadata({
    title,
    description,
    path,
    absoluteTitle,
    index: false,
    follow: false,
  });
}

export const homeMetadata = createPageMetadata({
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: SITE_HOME_TITLE,
});
