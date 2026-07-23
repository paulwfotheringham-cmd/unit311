import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

type SitemapRoute = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const routes: SitemapRoute[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.8 },
  { path: "/security", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
  { path: "/book", changeFrequency: "weekly", priority: 0.9 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.7 },
  { path: "/industries", changeFrequency: "monthly", priority: 0.8 },
  { path: "/inspection", changeFrequency: "monthly", priority: 0.7 },
  { path: "/surveying", changeFrequency: "monthly", priority: 0.7 },
  { path: "/commercial-imaging", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacypolicy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/termsandconditions", changeFrequency: "yearly", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: path === "" ? `${SITE_URL}/` : `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
