import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";

import { Badge } from "@/components/ui/badge";
import { absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Changelog",
  description:
    "What's new in ReFile — recent releases, fixes, and the road ahead.",
  alternates: { canonical: absoluteUrl("/changelog") },
  openGraph: {
    title: "Changelog — ReFile",
    description: "What's new in ReFile.",
    url: absoluteUrl("/changelog"),
  },
};

/**
 * Each entry can either be a flat list of bullets (the old shape, kept
 * for short entries) OR a grouped object of { sectionLabel: [...] }
 * for releases that touch enough surfaces that a single bullet stream
 * becomes a wall. Renderer below handles both.
 *
 * Dates are the date the change actually landed in production, not the
 * date of the git tag — they were close enough for v0.2 that they
 * coincide.
 */
const ENTRIES = [
  // ── v0.2.0 ────────────────────────────────────────────────────
  {
    date: "2026-05-20",
    tag: "Release v0.2.0",
    title: "The make-people-come-back release",
    link: "https://github.com/denoiselabsx/refile/releases/tag/v0.2.0",
    sections: {
      "Plans & quotas": [
        "Free plan switched to 10 conversions per day (resets at UTC midnight) instead of 15 per month. The old monthly cap was making every Free user anxious about a single conversion eating their allowance.",
        "Free file-size cap raised 25 MB → 100 MB so a single iPhone video fits.",
        "New usage meter: live \"Resets in Xh Ym\" countdown for Free; compact \"Projected bill\" line that expands to the Groq + Modal split for paid plans.",
      ],
      "Growth & SEO": [
        "20 hand-tuned landing pages at /convert/{from-to} (mp4-to-mp3, heic-to-jpg, mov-to-mp4, png-to-pdf, compress-pdf, …) — each with unique copy + FAQPage JSON-LD for rich results.",
        "Master index at /formats grouping every conversion by category.",
        "Footer \"Convert\" column + homepage \"Popular conversions\" grid so internal traffic finds the pages without Google.",
      ],
      "Composer & follow-ups": [
        "Platform presets pill row: WhatsApp, WhatsApp Status, Instagram Reel/Post, YouTube Thumbnail, Email-safe PDF, Email attachment, Print-ready. One tap drops the right natural-language prompt.",
        "Conversational follow-up: typing a filename in your prompt now resolves to that file instead of silently auto-chaining the previous output. When auto-chain does fire, a clear \"Following up on X\" indicator shows in the chat.",
        "/presets page now leads with \"Official prompts\" (the platform + conversion recipes) above community presets — same list, two clearly-labeled lanes.",
      ],
      "Sharing": [
        "Shareable output links at /d/{code}, 24h validity. Copy link + Share on WhatsApp from a dropdown on every output.",
        "Share page is robots-noindexed and shows a clean download card with a \"Try ReFile\" CTA — every share is also a marketing surface.",
        "Downloads everywhere now trigger a real save dialog instead of opening in a new tab (the cross-origin `<a download>` issue).",
      ],
      "History": [
        "Search bar in the history panel (full-text across chat titles).",
        "Favorite (star) a chat → sorts to the top of the list.",
        "Per-turn \"Run again\" button reopens a fresh chat with the prompt pre-filled.",
      ],
      "Mobile polish": [
        "44px touch targets on the composer Attach + Send buttons (Apple HIG / Material minimum).",
        "Haptic feedback on conversion complete via `navigator.vibrate`.",
        "Tap-friendly drop zone with \"Tap to select files (or use the camera)\" copy.",
        "\"Files auto-delete in 24h\" trust badge under the composer.",
      ],
      "Trust & security": [
        "Trust page rewrite at /security with concrete commitments: where files run (Modal sandbox), when they're deleted (24h, cron-enforced), what the AI sees (prompt + filenames only, never bytes), what we store, no ads/training/resale.",
        "\"How one conversion actually flows\" — a 4-step walkthrough mapping the claims to the real data path.",
        "Public GitHub link so every claim is verifiable: if the code doesn't match this page, that's a bug.",
      ],
      "Operations & analytics": [
        "Analytics events table + daily rollup cron + admin dashboard at /admin/analytics.",
        "Shared /admin hub with sub-nav (Analytics, Lessons) and a Claim-access flow for allowlisted accounts.",
        "Force-download proxy for all output links.",
      ],
      "Bug fixes": [
        "Sidebar footer overflow: logout no longer escapes the border for users with long names.",
        "Chat history list actually scrolls when long (min-h-0 propagation fix in the sidebar flex chain).",
        "/presets page is scrollable for signed-in users (was clipped by the app-mode shell).",
      ],
    },
  },

  // ── v0.1.0 ────────────────────────────────────────────────────
  {
    date: "2026-05-20",
    tag: "Release v0.1.0",
    title: "First public tag",
    link: "https://github.com/denoiselabsx/refile/releases/tag/v0.1.0",
    sections: {
      "Core product": [
        "Conversational dashboard with chat-style history and a unified composer.",
        "Multi-step pipeline support (chain commands per request, per-plan step cap).",
        "Auto-chain across turns: previous outputs become the next turn's inputs automatically.",
        "File previews for image, PDF, video, audio, CSV, text.",
      ],
      "Billing & plans": [
        "Locked four-tier pricing (Free / Student / Pro / Power) with global + India regional pricing.",
        "Polar.sh integration: subscriptions, customer portal, $0.02-per-conversion overage on paid plans with a real-provider-cost floor.",
        "Region verification against Polar's billing country (anti-spoof).",
      ],
      "Developer API": [
        "Public REST API v1 (uploads, jobs, jobs/:id).",
        "API key management with hashed storage and visible prefix.",
        "Per-job webhooks delivered on settlement.",
        "20-job free trial; payment method required past that.",
        "/docs/api reference + /developers landing.",
      ],
      "Reliability & ops": [
        "Self-improving loop: clustered command failures get distilled into prompt lessons, admin-reviewed before being injected.",
        "24-hour file retention with an hourly cleanup cron.",
        "Tool / command / flag names are never surfaced to the browser — sanitized server-side.",
      ],
      "UI": [
        "Claude-style collapsible sidebar with persisted expand state.",
        "Uploads panel.",
        "Community presets surface with likes, search, and category filters.",
      ],
    },
  },

  // ── Pre-v0.1 timeline (rebuilt from git history) ─────────────
  {
    date: "2026-05-16",
    tag: "Infra",
    title: "Polar billing wired end-to-end",
    body: [
      "Polar.sh checkout + customer portal integration.",
      "Webhook handler that resolves user, plan, and region from the purchased product.",
      "Regional pricing locked: global vs. India variants per tier.",
    ],
  },
  {
    date: "2026-05-14",
    tag: "Design",
    title: "Mono-tonal design system",
    body: [
      "Instrument Serif as the display face; Inter for UI; JetBrains Mono for code.",
      "Surfaces, borders, and tokens unified across the dashboard, presets, and marketing pages.",
      "Hero video + spotlight on the landing.",
    ],
  },
  {
    date: "2026-05-12",
    tag: "Infra",
    title: "Convex migration",
    body: [
      "Moved from Supabase to Convex for real-time data + reactivity.",
      "Job execution is now event-driven — no more status polling from the browser.",
      "Convex Auth replaces the custom Arctic OAuth flow.",
    ],
  },
  {
    date: "2026-05-10",
    tag: "Stability",
    title: "Resilient routes",
    body: [
      "Every API route is force-dynamic with lazy backend init — first-deploy builds never block on missing env.",
      "Page-level error boundaries on dashboard and presets.",
      "Loading skeletons everywhere; no more flash of empty page.",
    ],
  },
  {
    date: "2026-05-01",
    tag: "Workflows",
    title: "Visual workflow builder",
    body: [
      "Canvas for chaining presets into a reusable pipeline.",
      "Preset detail pages with one-click \"Use preset\" → dashboard composer pre-filled.",
    ],
  },
  {
    date: "2026-04-15",
    tag: "Features",
    title: "Voice input + multilingual",
    body: [
      "Voice transcription via Groq-hosted Whisper.",
      "Script hints for Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Urdu, and English — Whisper output stays in the right script for short utterances.",
    ],
  },
  {
    date: "2026-03-10",
    tag: "Features",
    title: "Community presets",
    body: [
      "Reusable command recipes shared by other operators.",
      "Likes, usage counts, category + tag filtering, search.",
      "Create-preset stepper with command-template validation.",
    ],
  },
  {
    date: "2026-01-20",
    tag: "Stack",
    title: "FastAPI → Next.js + Modal",
    body: [
      "Modal sandboxes replace the original FastAPI worker for command execution — per-job ephemeral containers with no shared state.",
      "Next.js App Router replaces the original SPA + FastAPI split.",
    ],
  },
  {
    date: "2025-12-15",
    tag: "AI",
    title: "Groq integration",
    body: [
      "Groq replaces the first-pass model for command generation.",
      "Token usage metered per turn; cost surfaced in the live usage meter.",
    ],
  },
  {
    date: "2025-11-10",
    tag: "Features",
    title: "Multi-file uploads + delete endpoint",
    body: [
      "Upload multiple files in one turn; the AI plans across them.",
      "Per-file delete from the uploads panel.",
    ],
  },
  {
    date: "2025-10-28",
    tag: "Started",
    title: "ReFile begins",
    body: [
      "Day one: a static home page, dark/light mode, and a sketch of the chat surface.",
      "First end-to-end demo: upload a file, ask in plain English, the FastAPI backend calls an LLM, runs a command, returns the result.",
    ],
  },
];

function Section({ label, lines }) {
  return (
    <div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <ul className="mt-2 space-y-1.5">
        {lines.map((line, i) => (
          <li
            key={i}
            className="text-[13.5px] leading-relaxed text-foreground/85"
          >
            — {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ChangelogPage() {
  return (
    <AppShell mode="marketing">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl px-5 pt-20 pb-12">
          <Badge variant="outline" className="rounded-full">
            Changelog
          </Badge>
          <h1 className="text-display mt-5">
            What we <em className="text-muted-foreground">shipped.</em>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            A running log of every release and the meaningful change in between
            — newest first. The honest version: real dates, real reasons, no
            "improved performance" filler.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 pb-20">
        <ol className="relative space-y-12 border-l border-border pl-7">
          {ENTRIES.map((e) => {
            const isRelease = e.tag?.startsWith("Release");
            return (
              <li key={`${e.date}-${e.title}`} className="relative">
                <span
                  className={`absolute -left-[34px] top-1.5 size-2.5 rounded-full border bg-background ${
                    isRelease
                      ? "border-foreground"
                      : "border-border-strong"
                  }`}
                />
                <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
                  <time className="text-mono text-muted-foreground">
                    {e.date}
                  </time>
                  <Badge variant={isRelease ? "default" : "secondary"}>
                    {e.tag}
                  </Badge>
                  {e.link ? (
                    <Link
                      href={e.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      GitHub →
                    </Link>
                  ) : null}
                </div>
                <h2 className="mt-2 text-h2 font-serif font-normal">
                  {e.title}
                </h2>

                {/* Grouped sections OR a flat bullet list, never both. */}
                {e.sections ? (
                  <div>
                    {Object.entries(e.sections).map(([label, lines]) => (
                      <Section key={label} label={label} lines={lines} />
                    ))}
                  </div>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {e.body.map((line, i) => (
                      <li
                        key={i}
                        className="text-[13.5px] leading-relaxed text-foreground/85"
                      >
                        — {line}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </AppShell>
  );
}
