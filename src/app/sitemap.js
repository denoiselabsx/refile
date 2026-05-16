import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { SITE_URL } from "@/lib/site";
import { HIDE_LAUNCH_FEATURES } from "@/lib/nav";
import { DOCS_PAGES, docsHref } from "../../lib/docs-nav.js";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

async function fetchPublicPresets() {
  if (!CONVEX_URL) return [];
  try {
    const client = new ConvexHttpClient(CONVEX_URL);
    const result = await client.query(api.presets.list, { limit: 500 });
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const now = new Date().toISOString();

  const staticEntries = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    ...(HIDE_LAUNCH_FEATURES
      ? []
      : [{ url: `${SITE_URL}/presets`, lastModified: now, changeFrequency: "daily", priority: 0.9 }]),
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    // Doc sub-pages, generated from the docs registry so it stays in sync.
    ...DOCS_PAGES.filter((p) => p.slug !== "").map((p) => ({
      url: `${SITE_URL}${docsHref(p.slug)}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    })),
    { url: `${SITE_URL}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/community`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/status`, lastModified: now, changeFrequency: "daily", priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/security`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const presets = HIDE_LAUNCH_FEATURES ? [] : await fetchPublicPresets();
  const presetEntries = presets.map((p) => ({
    url: `${SITE_URL}/presets/${p._id}`,
    lastModified: p._creationTime
      ? new Date(p._creationTime).toISOString()
      : now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...presetEntries];
}
