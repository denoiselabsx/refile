import Link from "next/link";
import { headers } from "next/headers";
import { Check, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";

import { Spotlight } from "@/components/spotlight";
import { Badge } from "@/components/ui/badge";
import { PricingCta } from "@/components/pricing-cta";
import { absoluteUrl } from "@/lib/site";
import { PLAN_IDS, plansForRegion } from "../../../lib/plans.js";
import { regionFromHeaders } from "../../../lib/region.js";

// Reads the Vercel geo header → must render per-request, not statically.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing",
  description:
    "Simple, honest pricing for ReFile. Start free. Pay as you go when you outgrow it. You only ever pay for conversions that actually succeed.",
  alternates: { canonical: absoluteUrl("/pricing") },
  openGraph: {
    title: "Pricing — ReFile",
    description:
      "Start free. Pay as you go when you outgrow it. Failed conversions are never charged.",
    url: absoluteUrl("/pricing"),
  },
};

function fmtSize(bytes) {
  const GB = 1024 * 1024 * 1024;
  if (bytes >= GB) return `${Math.round(bytes / GB)} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/**
 * Tiers are DERIVED from lib/plans.js for the request's region — the same
 * config the backend enforces. Every bullet corresponds to a real, enforced
 * limit. India sees lower prices for identical quotas; quota copy is
 * therefore region-independent and only the price differs.
 */
function buildTiers(region) {
  const plans = plansForRegion(region);
  return PLAN_IDS.map((id) => {
    const p = plans[id];
    const quotaLine =
      p.quotaPeriod === "day"
        ? `${p.includedConversions} conversions / day (resets at UTC midnight)`
        : p.overagePerConversion == null
          ? `${p.includedConversions} conversions / month (hard limit)`
          : `${p.includedConversions} conversions / month included`;
    const features = [
      quotaLine,
      p.overagePerConversion != null
        ? `Then $${p.overagePerConversion.toFixed(2)} per extra conversion`
        : "No overage — upgrade for more",
      `Files up to ${fmtSize(p.maxFileBytes)}`,
      p.maxFilesPerConversion === 1
        ? "One file per conversion"
        : `Up to ${p.maxFilesPerConversion} files per conversion (batch)`,
      p.maxPresets == null
        ? "Unlimited saved presets"
        : `Save up to ${p.maxPresets} preset${p.maxPresets === 1 ? "" : "s"}`,
      "Voice input in 11 languages",
      p.historyLimit == null
        ? "Full conversion history"
        : `Last ${p.historyLimit} conversions in history`,
      `${p.support} support`,
    ];
    return {
      id,
      name: p.name,
      price: `$${p.priceMonthly}`,
      cadence: p.cadence,
      description: p.tagline,
      features,
      featured: id === "pro",
      cta:
        id === "free"
          ? { label: "Get started", variant: "outline" }
          : {
              label: `Choose ${p.name}`,
              variant: id === "pro" ? "default" : "outline",
            },
    };
  });
}

export default async function PricingPage() {
  const region = regionFromHeaders(await headers());
  const TIERS = buildTiers(region);
  const isIndia = region === "IN";

  return (
    <AppShell mode="marketing">
      <div className="relative overflow-hidden">
        <div className="atmosphere" />
        <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />
        <div className="relative mx-auto max-w-5xl px-5 pt-20 pb-12">
          <div className="text-center">
            <Badge variant="outline" className="rounded-full">
              Pricing
            </Badge>
            <h1 className="text-display mt-5">
              Pay for conversions,
              <br />
              <em className="text-muted-foreground">only when they work.</em>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Start free. Move up only when you outgrow it. A conversion that
              fails is never counted and never charged. Cancel any time — your
              presets and history come with you.
            </p>
            {isIndia && (
              <p className="mx-auto mt-4 max-w-xl text-[13px] text-muted-foreground">
                🇮🇳 Showing India pricing — same limits, lower price. Prices
                are in USD; an Indian billing address is required at checkout
                to keep this rate.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-20">
        <div className="grid gap-4 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <Spotlight
              key={tier.id}
              className={`surface relative flex flex-col p-7 transition-all duration-300 ease-out hover:-translate-y-1 ${
                tier.featured
                  ? "border-border-strong shadow-[0_0_0_1px_color-mix(in_oklch,var(--foreground)_18%,transparent),0_30px_70px_-30px_rgba(0,0,0,0.45)]"
                  : "hover:border-border-strong"
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="cta-shimmer">Most popular</Badge>
                </div>
              )}
              <h3 className="font-serif text-[26px] leading-tight">
                {tier.name}
              </h3>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                {tier.description}
              </p>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-serif text-[44px] leading-none tracking-tight">
                  {tier.price}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {tier.cadence}
                </span>
              </div>

              <ul className="mt-6 space-y-2.5">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-[13px] leading-relaxed text-foreground/85"
                  >
                    <Check className="mt-0.5 size-3.5 shrink-0 text-foreground" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex-1" />
              <PricingCta
                planId={tier.id}
                region={region}
                label={tier.cta.label}
                variant={tier.cta.variant}
                featured={tier.featured}
              />
            </Spotlight>
          ))}
        </div>

        {/* Developer API — pay-as-you-go, sits below the 4-tier grid. */}
        <Spotlight className="surface mt-10 flex flex-col gap-6 p-7 md:flex-row md:items-start md:justify-between md:p-9">
          <div className="max-w-xl">
            <Badge variant="outline" className="rounded-full">
              For developers
            </Badge>
            <h2 className="mt-4 font-serif text-[26px] leading-tight text-foreground sm:text-[30px]">
              Developer API
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Build ReFile into your own product. Pay-as-you-go pricing — no
              minimum, no monthly commitment. Free to try.
            </p>

            <ul className="mt-5 space-y-2.5">
              {API_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-[13.5px] leading-relaxed text-foreground/85"
                >
                  <Check className="mt-0.5 size-3.5 shrink-0 text-foreground" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-[44px] leading-none tracking-tight">
                $0.05
              </span>
              <span className="text-[12px] text-muted-foreground">
                per job / per pipeline step
              </span>
            </div>
            <Link
              href="/settings/api"
              className="cta-shimmer inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-[13.5px] font-medium text-background transition-opacity hover:opacity-90"
            >
              Create an API key
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Read the docs
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </Spotlight>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-h1-serif text-center">
            Questions, <em className="text-muted-foreground">answered.</em>
          </h2>
          <div className="mx-auto mt-10 max-w-2xl divide-y divide-border rounded-xl border border-border bg-card">
            {FAQS.map((q, i) => (
              <details
                key={i}
                className="group p-5 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-[14px] font-medium">
                  {q.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45 text-lg leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
                  {q.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const API_FEATURES = [
  "$0.05 per job (single tool)",
  "$0.05 per pipeline step — a 3-step job is $0.15",
  "Files up to 1 GB",
  "No quota — usage billed monthly via your payment method on file",
];

const FAQS = [
  {
    q: "What counts as a 'file conversion'?",
    a: "One prompt-and-execute cycle is one conversion, no matter how many files are in that batch — uploading five images and running one command counts as one. Voice transcription is free and never counts.",
  },
  {
    q: "What if a conversion fails?",
    a: "It is not counted and not charged. We only meter a conversion once it completes successfully and produces output. A failed command, a rejected unsafe command, or a run that produces no files costs you nothing.",
  },
  {
    q: "How does pay-as-you-go work on paid plans?",
    a: "Your plan includes a monthly amount of conversions. Past that, each extra successful conversion is $0.02, billed at the end of the month. The Free plan has no overage — it stops at its limit. We recommend setting a monthly spend cap so you never get a surprise bill.",
  },
  {
    q: "Why do you track Groq and Modal usage?",
    a: "Every conversion costs us real money — an LLM call (Groq) plus sandbox compute (Modal). We show you that exact cost in your dashboard so usage is transparent, and overage pricing reflects real cost rather than a guess.",
  },
  {
    q: "Do you store my files?",
    a: "Inputs and outputs are kept for 24 hours so you can re-download, then permanently deleted. History (your prompts and commands) is kept so you can re-run them.",
  },
  {
    q: "Refunds?",
    a: "Yes — within 14 days, no questions asked. Just reply to your receipt.",
  },
];
