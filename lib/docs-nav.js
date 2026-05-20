/**
 * Docs page registry — single source of truth for the multipage docs.
 * Drives the sidebar nav, prev/next links, and the sitemap. Order here
 * IS the reading order.
 *
 * Keep this free of React/Next imports so the sitemap (server) and the
 * docs layout (client-ish) can both consume it.
 */

export const DOCS_GROUPS = [
  {
    group: "Start here",
    pages: [
      { slug: "", title: "Overview", desc: "What ReFile is, in 60 seconds." },
      {
        slug: "getting-started",
        title: "Getting started",
        desc: "Your first conversion, end to end.",
      },
    ],
  },
  {
    group: "What ReFile does",
    pages: [
      {
        slug: "what-it-can-do",
        title: "What it can & can't do",
        desc: "An honest, exact capability list.",
      },
      {
        slug: "formats",
        title: "Supported formats",
        desc: "Every format and operation, by category.",
      },
      {
        slug: "writing-prompts",
        title: "Writing good prompts",
        desc: "Get the right result on the first try.",
      },
      {
        slug: "voice",
        title: "Voice input",
        desc: "Speak your request in 11 languages.",
      },
    ],
  },
  {
    group: "Plans & limits",
    pages: [
      {
        slug: "limits-and-plans",
        title: "Limits & plans",
        desc: "Quotas, file caps, pay-as-you-go.",
      },
      {
        slug: "troubleshooting",
        title: "Troubleshooting",
        desc: "When something doesn't work.",
      },
    ],
  },
  {
    group: "Account",
    pages: [
      {
        slug: "account",
        title: "Account & data",
        desc: "Sign-in, sessions, deleting your data.",
      },
    ],
  },
  {
    group: "Developers",
    pages: [
      {
        slug: "api",
        title: "API reference",
        desc: "REST API for submitting file jobs from any backend.",
      },
    ],
  },
];

/** Flat, ordered list of every doc page. */
export const DOCS_PAGES = DOCS_GROUPS.flatMap((g) =>
  g.pages.map((p) => ({ ...p, group: g.group }))
);

/** Build a /docs path from a slug ("" → /docs). */
export function docsHref(slug) {
  return slug ? `/docs/${slug}` : "/docs";
}

/** Prev/next neighbours for the footer nav. */
export function docsNeighbours(slug) {
  const i = DOCS_PAGES.findIndex((p) => p.slug === slug);
  return {
    prev: i > 0 ? DOCS_PAGES[i - 1] : null,
    next: i >= 0 && i < DOCS_PAGES.length - 1 ? DOCS_PAGES[i + 1] : null,
  };
}
