import Link from "next/link";
import {
  ArrowRight,
  Wand2,
  Server,
  ShieldCheck,
  Receipt,
  ImageDown,
  FileSignature,
  Film,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Spotlight } from "@/components/spotlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { absoluteUrl } from "@/lib/site";
import { BRAND } from "@/lib/nav";

export const metadata = {
  title: "Developer API",
  description:
    "Natural-language file operations as a REST API. Submit a prompt + files; get the result.",
  alternates: { canonical: absoluteUrl("/developers") },
  openGraph: {
    title: `Developer API — ${BRAND.name}`,
    description:
      "Same engine as the web app. POST a prompt + files, get the result.",
    url: absoluteUrl("/developers"),
  },
};

const BENEFITS = [
  {
    icon: Wand2,
    title: "Natural language, not flags",
    body: "Skip learning ffmpeg, ImageMagick, or Ghostscript syntax. Describe what you want; we pick the tool and run it.",
  },
  {
    icon: Server,
    title: "Hosted execution",
    body: "No sandboxes to maintain, no binaries to install. We run the container; you get the finished file.",
  },
  {
    icon: ShieldCheck,
    title: "Production ready",
    body: "Webhooks, rate limits, sanitized errors, signed downloads. Built for backend use, not just demos.",
  },
];

const USE_CASES = [
  {
    icon: Receipt,
    title: "Receipt and document pipelines",
    body: "Convert customer-uploaded PDFs and HEICs to structured outputs without writing parser code.",
  },
  {
    icon: ImageDown,
    title: "User-generated content moderation",
    body: "Resize, strip metadata, and transcode user uploads in the background before they hit your storage.",
  },
  {
    icon: FileSignature,
    title: "Automated document workflows",
    body: "Merge, split, watermark, and reorder PDFs straight from your existing app flows.",
  },
  {
    icon: Film,
    title: "Media compression at scale",
    body: "Compress video and audio uploads to sane sizes before you pay to store and serve them.",
  },
];

export default function DevelopersPage() {
  return (
    <AppShell mode="marketing">
      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden">
        <div className="atmosphere" />
        <div className="absolute inset-0 grid-bg opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />

        <div className="relative mx-auto max-w-5xl px-4 pt-14 pb-12 sm:px-5 sm:pt-24 sm:pb-16">
          <div className="text-center">
            <Badge variant="outline" className="rounded-full">
              Developer API
            </Badge>
            <h1 className="text-display mt-5 text-balance">
              Run natural-language file operations{" "}
              <em className="text-muted-foreground">from your backend.</em>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">
              Same engine as the web app. POST a prompt and a list of files; get
              the result. One endpoint, no SDK required.
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center sm:gap-3">
              <Button size="lg" asChild className="cta-shimmer">
                <Link href="/settings/api">
                  Create an API key
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs/api">Read the docs</Link>
              </Button>
            </div>
          </div>

          {/* ───── Curl showcase ───── */}
          <div className="mt-14 sm:mt-16">
            <Spotlight className="surface mx-auto w-full max-w-3xl overflow-hidden shadow-[0_30px_120px_-30px_rgba(0,0,0,0.4)]">
              {/* Window chrome */}
              <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-muted/40 px-3 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="size-2.5 shrink-0 rounded-full bg-border-strong/80" />
                  <span className="size-2.5 shrink-0 rounded-full bg-border-strong/60" />
                  <span className="size-2.5 shrink-0 rounded-full bg-border-strong/40" />
                  <span className="ml-2 truncate text-mono text-muted-foreground sm:ml-3">
                    POST /api/v1/jobs
                  </span>
                </div>
                <span className="hidden shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex">
                  <span className="inline-flex size-1.5 rounded-full bg-success animate-pulse-soft" />
                  live
                </span>
              </div>

              <pre className="overflow-x-auto px-4 py-5 text-mono text-[12.5px] leading-relaxed text-foreground/90 sm:px-6 sm:py-6 sm:text-[13px]">
                <code>
                  <span className="text-muted-foreground">$</span>{" "}
                  <span className="text-foreground">curl</span> -X POST{" "}
                  <span className="text-success">
                    'https://refile.denoiselabs.com/api/v1/jobs?wait=true'
                  </span>{" "}
                  \{"\n"}
                  {"  "}-H{" "}
                  <span className="text-success">
                    "Authorization: Bearer rf_live_..."
                  </span>{" "}
                  \{"\n"}
                  {"  "}-d{" "}
                  <span className="text-success">
                    {
                      '\'{"prompt":"compress this video","files":[...]}\''
                    }
                  </span>
                </code>
              </pre>
            </Spotlight>
          </div>
        </div>
      </section>

      {/* ───── Why use this? ───── */}
      <section className="border-t border-border/70">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-h1-serif text-balance">
              Why use this?{" "}
              <em className="text-muted-foreground">
                Because file plumbing is not your job.
              </em>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              The API is the same engine that powers {BRAND.name} — same tools,
              same sandbox, same guarantees.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <Spotlight
                  key={b.title}
                  className="group relative bg-card p-7 transition-colors"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-transform group-hover:-translate-y-0.5">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="mt-5 text-[15px] font-semibold tracking-tight">
                    {b.title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                    {b.body}
                  </p>
                </Spotlight>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── Built for these jobs ───── */}
      <section className="border-t border-border/70 bg-subtle/30">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-h1-serif text-balance">
              Built for{" "}
              <em className="text-muted-foreground">these jobs.</em>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Concrete workloads {BRAND.name} replaces on day one.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {USE_CASES.map((u) => {
              const Icon = u.icon;
              return (
                <Spotlight
                  key={u.title}
                  className="surface flex gap-4 p-6 transition-colors hover:border-border-strong"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-semibold tracking-tight">
                      {u.title}
                    </h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                      {u.body}
                    </p>
                  </div>
                </Spotlight>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── Pricing strip ───── */}
      <section className="border-t border-border/70">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:py-24">
          <Spotlight className="surface flex flex-col gap-6 p-7 md:flex-row md:items-center md:justify-between md:p-9">
            <div className="max-w-xl">
              <Badge variant="outline" className="rounded-full">
                Pricing
              </Badge>
              <h2 className="mt-4 font-serif text-[26px] leading-tight text-foreground sm:text-[30px]">
                Pay-as-you-go. No minimum.
              </h2>
              <ul className="mt-5 space-y-2 text-[13.5px] leading-relaxed text-foreground/85">
                <li className="flex items-baseline gap-2">
                  <span className="font-mono text-foreground">$0.05</span>
                  <span className="text-muted-foreground">
                    per command job
                  </span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="font-mono text-foreground">$0.05</span>
                  <span className="text-muted-foreground">
                    per pipeline step
                  </span>
                </li>
                <li className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">
                    Billed monthly. Failed jobs are never charged.
                  </span>
                </li>
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
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                See full pricing
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </Spotlight>
        </div>
      </section>

      {/* ───── Final CTA ───── */}
      <section className="border-t border-border/70">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="text-h1-serif text-balance">
            Ship file features{" "}
            <em className="text-muted-foreground">in an afternoon.</em>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            One key, one endpoint, billed by usage.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild className="cta-shimmer">
              <Link href="/settings/api">
                Create an API key
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-1.5 text-[13.5px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Read the docs
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
