/**
 * /convert — the public hub page for every conversion ReFile supports.
 *
 * SEO targets:
 *   • "file converter", "convert files online", "free file converter"
 *   • broad-match queries that don't specify a format
 *
 * The page lists every recipe from src/lib/conversions.js (the SEO
 * catalogue), grouped by category, each linking to its own /convert/<slug>
 * page. It is purely a directory — the actual tool lives on each leaf.
 *
 * Statically rendered. No client JS for the listing itself; a small
 * client-only filter chip strip lives in <ConvertHubFilters> if we
 * need it later (today: pure SSR, fastest possible TTI).
 */

import Link from "next/link";
import { ArrowRight, FileText, Image as ImageIcon, Film, Music, Layers } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { CONVERSIONS, CATEGORY_LABEL } from "@/lib/conversions";
import { absoluteUrl } from "@/lib/site";

const CATEGORY_ICON = {
  pdf: FileText,
  image: ImageIcon,
  video: Film,
  audio: Music,
  compress: Layers,
  document: FileText,
  data: FileText,
};

const CATEGORY_ORDER = [
  "pdf",
  "image",
  "video",
  "audio",
  "compress",
  "document",
  "data",
];

export const metadata = {
  title: "Free File Converter — PDF, Image, Video, Audio · No Signup",
  description:
    "Convert and compress files online — free, no signup, no watermark. PDF to Word, HEIC to JPG, MOV to MP4, compress video, and 35+ more. Files deleted in 24 hours.",
  alternates: { canonical: absoluteUrl("/convert") },
  keywords: [
    "file converter",
    "free file converter",
    "convert files online",
    "online file converter",
    "pdf converter",
    "image converter",
    "video converter",
    "audio converter",
    "compress file online",
  ],
  openGraph: {
    title: "Free File Converter — PDF, Image, Video, Audio · No Signup",
    description:
      "Convert and compress files online — free, no signup, no watermark. 40+ formats supported.",
    url: absoluteUrl("/convert"),
    type: "website",
    siteName: "ReFile",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free File Converter — No Signup, No Watermark",
    description:
      "Convert PDF, image, video, audio, document, and spreadsheet files online — 40+ free recipes.",
  },
};

export default async function ConvertHubPage({ searchParams }) {
  // Honor the WebSite SearchAction (?q=) declared in root layout JSON-LD.
  // Server-side filter so the result is crawlable and shareable; if no q,
  // the page is statically rendered at build (Next infers from no
  // searchParams use).
  const sp = await searchParams;
  const query = (sp?.q || "").toString().trim().toLowerCase();

  const filtered = query
    ? CONVERSIONS.filter((c) => {
        const hay = [
          c.title,
          c.intro,
          c.slug,
          c.from,
          c.to,
          c.category,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      })
    : CONVERSIONS;

  const grouped = {};
  for (const c of filtered) {
    (grouped[c.category] ??= []).push(c);
  }

  // CollectionPage schema — helps Google understand the hub as an
  // index page (vs. a single article).
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "ReFile — file conversion catalogue",
    url: absoluteUrl("/convert"),
    hasPart: CONVERSIONS.map((c) => ({
      "@type": "WebPage",
      name: c.title,
      url: absoluteUrl(`/convert/${c.slug}`),
      description: c.intro,
    })),
  };

  return (
    // `marketing` (not `auto`) — these are public SEO landing pages.
    // Even signed-in visitors arriving from Google want the landing
    // page they searched for, not the workspace shell with the
    // sidebar. The app shell stays for /dashboard/* only.
    <AppShell mode="marketing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <header className="max-w-2xl">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            File converter
          </p>
          <h1 className="text-h1-serif mt-2 text-balance">
            {query ? `Conversions matching “${query}”` : "Every conversion ReFile does"}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            {query ? (
              <>
                Showing {filtered.length} of {CONVERSIONS.length} conversions. <Link href="/convert" className="text-foreground underline-offset-4 hover:underline">Clear search</Link>
              </>
            ) : (
              <>
                Pick a format. Drop your file. Get the result — no signup for
                your first 3 free conversions, files deleted in 24 hours.
              </>
            )}
          </p>
        </header>

        {query && filtered.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-[14px] font-medium text-foreground">
              No conversions match “{query}”.
            </p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Try a different format name (heic, mp4, excel…), or browse all conversions below.
            </p>
            <Link
              href="/convert"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-muted"
            >
              Browse all conversions
            </Link>
          </div>
        )}

        {/* ── Categories ───────────────────────────────────────── */}
        <div className="mt-10 space-y-12">
          {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => {
            const Icon = CATEGORY_ICON[cat] ?? FileText;
            return (
              <section key={cat}>
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wide text-foreground">
                    <span className="flex size-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                      <Icon className="size-3.5" />
                    </span>
                    {CATEGORY_LABEL[cat] ?? cat}
                  </h2>
                  <span className="text-[11px] text-muted-foreground">
                    {grouped[cat].length}{" "}
                    {grouped[cat].length === 1 ? "conversion" : "conversions"}
                  </span>
                </div>

                <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[cat].map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/convert/${c.slug}`}
                        className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-px hover:border-border-strong hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <FormatChip text={c.from} />
                            <ArrowRight className="size-3 text-muted-foreground/60" />
                            <FormatChip text={c.to} solid />
                          </div>
                          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/0 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                        </div>
                        <p className="text-[13.5px] font-medium leading-snug text-foreground">
                          {c.title.replace(" Online — Free", "")}
                        </p>
                        <p className="line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
                          {c.intro}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* ── CTA strip ────────────────────────────────────────── */}
        <section className="mt-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
            Need a format that isn't here?
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            ReFile's chat handles open-ended file work — "extract the audio
            from this video and remove silence," "convert this scan into a
            searchable PDF," "blur the faces in this image." Sign up free
            and describe what you need.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/signup?from=convert-hub"
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[12.5px] font-medium text-background hover:opacity-90"
            >
              Sign up free
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-[12.5px] font-medium text-foreground hover:bg-muted"
            >
              See plans
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function FormatChip({ text, solid }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${
        solid
          ? "bg-foreground text-background"
          : "border border-border bg-background text-foreground"
      }`}
    >
      {text}
    </span>
  );
}
