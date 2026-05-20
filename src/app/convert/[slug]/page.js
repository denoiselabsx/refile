import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import {
  CONVERSIONS,
  CATEGORY_LABEL,
  getConversion,
  relatedConversions,
} from "@/lib/conversions";
import { absoluteUrl } from "@/lib/site";
import { LandingComposerEmbed } from "@/components/landing-composer-embed";
import { LandingViewBeacon } from "@/components/landing-view-beacon";

/* ──────────────────────────────────────────────────────────────── *
 *  Static params: pre-render every conversion at build time.
 *  This is what makes /convert/mp4-to-mp3 a static, indexable URL
 *  (no server roundtrip per visit, ideal for SEO).
 * ──────────────────────────────────────────────────────────────── */

export async function generateStaticParams() {
  return CONVERSIONS.map((c) => ({ slug: c.slug }));
}

/* ──────────────────────────────────────────────────────────────── *
 *  Per-page metadata + JSON-LD.
 *  Title + description are tuned for SERP click-through (lead with
 *  the formats, mention "free", short).
 * ──────────────────────────────────────────────────────────────── */

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const c = getConversion(slug);
  if (!c) return {};
  const canonical = absoluteUrl(`/convert/${c.slug}`);
  return {
    title: c.title,
    description: c.intro,
    alternates: { canonical },
    openGraph: {
      title: c.title,
      description: c.intro,
      url: canonical,
    },
  };
}

export default async function ConvertPage({ params }) {
  const { slug } = await params;
  const c = getConversion(slug);
  if (!c) notFound();

  const related = relatedConversions(slug);

  // FAQPage JSON-LD — what unlocks Google's rich-result "expanding FAQ"
  // tile in search results. Plain text answers; no markdown.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <AppShell mode="marketing">
      {/* Client-only mount that fires the landing_view analytics event
          once per page view. Keeps the page itself server-rendered. */}
      <LandingViewBeacon slug={c.slug} from={c.from} to={c.to} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-5 pb-20 pt-12 sm:pt-16">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <header>
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABEL[c.category] ?? c.category}
          </p>
          <h1 className="text-h1-serif mt-2 text-balance">{c.title}</h1>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-muted-foreground">
            {c.intro}
          </p>
        </header>

        {/* ── Composer embed ─────────────────────────────────────
            Drop or pick a file → we stash it in sessionStorage with
            the example prompt and bounce through auth into the
            dashboard, which reads the stash and submits. */}
        <div className="mt-8">
          <LandingComposerEmbed
            slug={c.slug}
            from={c.from}
            to={c.to}
            examplePrompt={c.examplePrompt}
          />
        </div>

        {/* ── What you can ask for ──────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-[16px] font-semibold tracking-tight">
            What you can ask for
          </h2>
          <ul className="mt-4 space-y-2.5">
            {c.bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2.5 text-[14px] leading-relaxed text-foreground/85"
              >
                <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-foreground/40" />
                {b}
              </li>
            ))}
          </ul>
        </section>

        {/* ── FAQs ──────────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-[16px] font-semibold tracking-tight">
            Frequently asked
          </h2>
          <dl className="mt-4 divide-y divide-border border-y border-border">
            {c.faqs.map((f) => (
              <div key={f.q} className="py-4">
                <dt className="text-[14px] font-medium text-foreground">
                  {f.q}
                </dt>
                <dd className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Related ───────────────────────────────────────────── */}
        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-[16px] font-semibold tracking-tight">
              Related conversions
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/convert/${r.slug}`}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-3 text-[13.5px] transition-colors hover:bg-muted/60"
                  >
                    <span className="font-medium text-foreground">
                      {r.title.replace(" Online — Free", "")}
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ── Footer link to the master index ────────────────────── */}
        <div className="mt-12 flex items-center justify-between border-t border-border pt-6 text-[13px]">
          <Link
            href="/formats"
            className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <UploadCloud className="size-3.5" />
            See every supported conversion
          </Link>
          <Link
            href="/"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            About ReFile →
          </Link>
        </div>
      </article>
    </AppShell>
  );
}
