import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";

import { Spotlight } from "@/components/spotlight";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Pricing",
  description:
    "Simple, honest pricing for ReFile. Start free. Upgrade when files start outpacing the free quota.",
  alternates: { canonical: absoluteUrl("/pricing") },
  openGraph: {
    title: "Pricing — ReFile",
    description:
      "Start free. Upgrade when files outpace the free quota. No surprises.",
    url: absoluteUrl("/pricing"),
  },
};

const TIERS = [
  {
    name: "Hobby",
    price: "$0",
    cadence: "forever",
    description: "For weekend projects and casual conversions.",
    features: [
      "50 file conversions / month",
      "Files up to 100 MB",
      "Voice input in 10+ languages",
      "Save up to 3 personal presets",
      "Community presets, read-only",
    ],
    cta: { label: "Get started", href: "/login/google", variant: "outline" },
  },
  {
    name: "Pro",
    price: "$9",
    cadence: "per month",
    description: "For people who do this every day.",
    features: [
      "Unlimited file conversions",
      "Files up to 2 GB",
      "Unlimited personal presets",
      "Workflow builder + execution",
      "Priority processing",
      "Email support",
    ],
    cta: { label: "Start Pro trial", href: "/login/google", variant: "default" },
    featured: true,
  },
  {
    name: "Team",
    price: "$29",
    cadence: "per seat / month",
    description: "Shared presets, workflows, and history.",
    features: [
      "Everything in Pro",
      "Shared preset library",
      "Shared workflow canvas",
      "Role-based permissions",
      "SSO (coming soon)",
      "Dedicated support",
    ],
    cta: { label: "Contact sales", href: "mailto:hello@denoiselabs.com", variant: "outline" },
  },
];

export default function PricingPage() {
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
              Pay for results,
              <br />
              <em className="text-muted-foreground">not seats you don't fill.</em>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Start free. Move up only when you're getting real value. Cancel any
              time — your presets and history come with you.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <Spotlight
              key={tier.name}
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
              <h3 className="font-serif text-[26px] leading-tight">{tier.name}</h3>
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
              <Button
                variant={tier.cta.variant}
                asChild
                className={`w-full ${tier.featured ? "cta-shimmer" : ""}`}
                size="lg"
              >
                <Link href={tier.cta.href}>
                  {tier.cta.label}
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </Spotlight>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-h1-serif text-center">
            Questions, <em className="text-muted-foreground">answered.</em>
          </h2>
          <div className="mx-auto mt-10 max-w-2xl divide-y divide-border rounded-xl border border-border bg-card">
            {FAQS.map((q, i) => (
              <details key={i} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-[14px] font-medium">
                  {q.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45 text-lg leading-none">+</span>
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

const FAQS = [
  {
    q: "What counts as a 'file conversion'?",
    a: "Each prompt-and-execute cycle is one conversion. Uploading three images and running one command counts as one. Re-running a workflow with three steps counts as three.",
  },
  {
    q: "Do you store my files?",
    a: "Inputs and outputs are kept for 24 hours so you can re-download, then permanently deleted. Pro and Team can opt into longer retention.",
  },
  {
    q: "Can I run ReFile on my own machine?",
    a: "Not yet, but the commands ReFile generates are plain shell — copy any command and run it locally. We're working on a self-hosted runner.",
  },
  {
    q: "Refunds?",
    a: "Yes — within 14 days, no questions asked. Just reply to your receipt.",
  },
];
