/**
 * /convert/<slug> — the public, no-login SEO landing page for one
 * conversion (e.g. /convert/heic-to-jpg).
 *
 * Three layers of value on one page:
 *   1. The TOOL above the fold (RecipeRunner) — anonymous users can
 *      run the conversion immediately, no signup wall. Funnel design
 *      decisions live in components/upgrade.jsx.
 *   2. SEO content — intro, bullets, FAQ, related recipes. Sourced
 *      from src/lib/conversions.js. Each page is statically rendered
 *      and indexable.
 *   3. Structured data — FAQPage + HowTo + SoftwareApplication JSON-LD.
 *      Powers Google's rich-result tiles (expanding FAQ, How-to card,
 *      app rating in the SERP).
 *
 * Anonymous flow:
 *   The RecipeRunner detects no auth and routes uploads through
 *   /api/anon-convert/upload-url + /api/anon-convert. Per-IP daily
 *   quota lives in convex/anonQuota.ts. When quota is hit, the
 *   UpgradeModal opens (no redirect, no signup wall on first use).
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldCheck, Zap, Lock } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { RecipeRunner } from "@/components/recipe-runner";
import {
  CONVERSIONS,
  CATEGORY_LABEL,
  getConversion,
  relatedConversions,
} from "@/lib/conversions";
import { absoluteUrl } from "@/lib/site";
import { LandingViewBeacon } from "@/components/landing-view-beacon";
import { getQuickConvertEntry } from "../../../../convex/quickConvertCommands";

/* ──────────────────────────────────────────────────────────────── *
 *  Mapping: a /convert/<slug> SEO entry → the executable Quick
 *  Convert recipe. Most slugs match 1:1. The fallback returns the
 *  closest recipe by fromExt → toExt; if no match exists, the page
 *  renders WITHOUT the tool (content-only) so we never ship a
 *  broken dropzone.
 * ──────────────────────────────────────────────────────────────── */
function recipeIdForConversion(c) {
  // Direct slug match first — most reliable.
  const direct = getQuickConvertEntry(c.slug);
  if (direct) return direct.id;
  // jpg-to-pdf / png-to-pdf SEO entries route to the images-to-pdf
  // recipe (it accepts both as inputs). The page hides multi-file
  // hint visually via the SEO copy, but functionally the user can
  // drop just one image and it'll convert fine.
  if (c.slug === "jpg-to-pdf" || c.slug === "png-to-pdf") {
    return "images-to-pdf";
  }
  return null;
}

/* ──────────────────────────────────────────────────────────────── *
 *  Static params: pre-render every conversion at build time.
 * ──────────────────────────────────────────────────────────────── */

export async function generateStaticParams() {
  return CONVERSIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const c = getConversion(slug);
  if (!c) return {};
  const canonical = absoluteUrl(`/convert/${c.slug}`);

  // CTR-tuned title + description.
  //   • Title — lead with action verb + format pair + a one-word value
  //     prop ("Free"). Keep under 60 chars so the SERP doesn't truncate.
  //   • Description — first sentence answers "what is this?", second
  //     adds a friction-killer ("No signup. No watermark.") that
  //     consistently outperforms generic feature lists in SERP CTR.
  const compactDescription = `${c.intro.split(".")[0]}. No signup, no watermark, files deleted in 24 hours.`;

  return {
    title: c.title,
    description: compactDescription,
    alternates: { canonical },
    keywords: [
      `${c.from} to ${c.to}`,
      `convert ${c.from} to ${c.to}`,
      `${c.from} to ${c.to} converter`,
      `${c.from} to ${c.to} online`,
      `free ${c.from} to ${c.to}`,
    ],
    openGraph: {
      title: c.title,
      description: compactDescription,
      url: canonical,
      type: "website",
      siteName: "ReFile",
    },
    twitter: {
      card: "summary_large_image",
      title: c.title,
      description: compactDescription,
    },
    // Helps Google understand this is a tool page, not editorial content.
    other: {
      "format-detection": "telephone=no",
    },
  };
}

export default async function ConvertPage({ params }) {
  const { slug } = await params;
  const c = getConversion(slug);
  if (!c) notFound();

  const related = relatedConversions(slug);
  const recipeId = recipeIdForConversion(c);
  const canonical = absoluteUrl(`/convert/${c.slug}`);

  /* ── JSON-LD: FAQPage + HowTo + SoftwareApplication ────────────
   * Three schema types, three different rich-result paths:
   *   FAQPage           → expanding Q&A tile under the SERP entry
   *   HowTo             → step-by-step card with the conversion flow
   *   SoftwareApplication → optional star-rating + price block
   * Plain values only; no markdown inside schema strings. */
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: c.title.replace(/ Online — Free$/, ""),
    description: c.intro,
    totalTime: "PT30S",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: `Upload your ${c.from.toUpperCase()} file`,
        text: `Drop or pick a ${c.from.toUpperCase()} file. ReFile validates the format on the spot.`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Run the conversion",
        text: `Click ${c.category === "compress" ? '"Compress now"' : '"Convert now"'}. The job runs in an isolated sandbox — your file never touches another user's job.`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: `Download the ${c.to.toUpperCase()}`,
        text: `Your ${c.to.toUpperCase()} is ready in seconds. Files auto-delete from our servers after 24 hours.`,
      },
    ],
  };

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ReFile",
    applicationCategory: "Utility",
    operatingSystem: "Web",
    url: canonical,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  // BreadcrumbList — feeds Google's "breadcrumb trail" rich result that
  // replaces the raw URL under the SERP title. Reads cleanly and
  // increases click-through on long URLs.
  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Convert",
        item: absoluteUrl("/convert"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: c.title.replace(" Online — Free", ""),
        item: canonical,
      },
    ],
  };

  return (
    // Forced `marketing` chrome on every /convert/<slug> page. These
    // are public SEO landing pages — signed-in visitors arriving from
    // a Google result still want the landing experience, not the
    // workspace sidebar. The app shell is reserved for /dashboard/*.
    <AppShell mode="marketing">
      <LandingViewBeacon slug={c.slug} from={c.from} to={c.to} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:pt-14">
        {/* ── Breadcrumb (SEO + UX) ─────────────────────────────── */}
        <nav
          aria-label="Breadcrumb"
          className="mb-5 text-[12px] text-muted-foreground"
        >
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link
                href="/"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Home
              </Link>
            </li>
            <li aria-hidden className="text-muted-foreground/40">/</li>
            <li>
              <Link
                href="/convert"
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Convert
              </Link>
            </li>
            <li aria-hidden className="text-muted-foreground/40">/</li>
            <li className="text-foreground">
              {c.title.replace(" Online — Free", "")}
            </li>
          </ol>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <header>
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABEL[c.category] ?? c.category}
          </p>
          <h1 className="text-h1-serif mt-2 text-balance">{c.title}</h1>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-muted-foreground">
            {c.intro}
          </p>

          {/* Trust signals — short, factual, no-marketing tone. */}
          <ul className="mt-5 flex flex-wrap gap-2">
            <TrustChip icon={<Zap className="size-3" />} label="No signup to try" />
            <TrustChip icon={<ShieldCheck className="size-3" />} label="Sandboxed processing" />
            <TrustChip icon={<Lock className="size-3" />} label="Files deleted in 24 h" />
          </ul>
        </header>

        {/* ── The actual tool ──────────────────────────────────── */}
        <div className="mt-8">
          {recipeId ? (
            <RecipeRunner entryId={recipeId} variant="card" />
          ) : (
            <NoRecipeFallback slug={c.slug} />
          )}
        </div>

        {/* ── What you can ask for ─────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-[16px] font-semibold tracking-tight">
            What this does
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

        {/* ── How it works (mirrors HowTo JSON-LD, human copy) ──── */}
        <section className="mt-12">
          <h2 className="text-[16px] font-semibold tracking-tight">
            How it works
          </h2>
          <ol className="mt-4 space-y-3">
            <HowStep n="1" title={`Upload your ${c.from.toUpperCase()}`}>
              Drop it above, or click to pick from your device. We validate the
              format immediately — no spinning on a file we can't process.
            </HowStep>
            <HowStep n="2" title="Run the conversion">
              The recipe runs in an isolated cloud sandbox — same as every
              other ReFile job. No AI guessing involved; it's a hand-written
              command that does one thing.
            </HowStep>
            <HowStep n="3" title={`Download the ${c.to.toUpperCase()}`}>
              Result lands in seconds. Files auto-delete from our servers
              after 24 hours; signed download URLs expire in the same window.
            </HowStep>
          </ol>
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
        {related.length > 0 && (
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
        )}

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-[13px]">
          <Link
            href="/convert"
            className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <ArrowRight className="size-3.5" />
            Browse every conversion
          </Link>
          <Link
            href="/pricing"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            See plans →
          </Link>
        </div>
      </article>
    </AppShell>
  );
}

/* ──────────────────────────────────────────────────────────────── *
 *  Small presentational helpers
 * ──────────────────────────────────────────────────────────────── */

function TrustChip({ icon, label }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">
      {icon}
      {label}
    </li>
  );
}

function HowStep({ n, title, children }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-card font-mono text-[11px] font-semibold text-foreground">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-foreground">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {children}
        </p>
      </div>
    </li>
  );
}

function NoRecipeFallback({ slug }) {
  // Renders when a /convert/<slug> SEO entry exists but no executable
  // Quick Convert recipe ships yet for it. The page still indexes for
  // SEO; users get a clear path to the place they CAN do this.
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
      <p className="text-[13.5px] font-medium text-foreground">
        Direct browser conversion is coming for this format
      </p>
      <p className="mt-1.5 text-[12.5px] text-muted-foreground">
        For now, sign in and describe what you need — ReFile handles it.
      </p>
      <Link
        href={`/dashboard?prompt=${encodeURIComponent(slug.replace(/-/g, " "))}`}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[12.5px] font-medium text-background hover:opacity-90"
      >
        Open ReFile chat
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
