const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://refile.vercel.app";

export default function sitemap() {
  const now = new Date().toISOString();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/presets`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/workflow`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];
}
