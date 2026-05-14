import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { SITE_URL } from "@/lib/site";

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
    { url: `${SITE_URL}/presets`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
  ];

  const presets = await fetchPublicPresets();
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
