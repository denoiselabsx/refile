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

const ENTRIES = [
  {
    date: "2026-05-20",
    tag: "Release v0.2",
    title: "v0.2 — Daily Free tier, SEO, presets, shareable links",
    body: [
      "Free plan is now 10 conversions per day (resets at UTC midnight) instead of 15 per month, and the file-size cap goes from 25 MB to 100 MB — a single iPhone video fits.",
      "20 hand-tuned conversion pages live at /convert/{from-to} (mp4-to-mp3, heic-to-jpg, mov-to-mp4, png-to-pdf, compress-pdf, …). Each drops a file → preset prompt → straight into the dashboard. Full index at /formats.",
      "Platform presets in the composer: WhatsApp, WhatsApp Status, Instagram Reel/Post, YouTube Thumbnail, Email-safe PDF, Email attachment, Print-ready. One tap fills the right prompt for the platform.",
      "Shareable output links — 24h /d/{code} pages with Copy link + Share on WhatsApp. Every shared link is also a marketing touchpoint with a Try-ReFile CTA.",
      "Conversational follow-ups: typing a filename in your prompt now resolves to that file instead of silently auto-chaining the previous output. When auto-chain does fire, a clear \"Following up on X\" indicator appears.",
      "Trust page rewrite at /security with concrete commitments (where files run, when they're deleted, what the AI actually sees) and a link to the public GitHub repo.",
      "History gains search, favorite-pinned starring, and a per-turn Run again button.",
      "Mobile polish: 44px touch targets on the composer, haptic feedback on conversion complete, tap-friendly drop zone copy, and a Files-auto-delete-in-24h trust badge.",
      "Downloads everywhere now trigger a real save dialog instead of opening files in a new tab.",
      "Operations: new analytics events table + admin dashboard at /admin/analytics, daily rollup cron, and a shared admin sub-nav at /admin.",
    ],
  },
  {
    date: "2026-05-14",
    tag: "Release",
    title: "Public preview",
    body: [
      "New mono-tonal design system with Instrument Serif display type.",
      "Conversational dashboard with live history and a unified composer.",
      "Voice transcription in 10+ Indian languages via Whisper.",
      "Visual workflow builder with example pipelines.",
      "Community preset library, likes, and the create-preset stepper.",
    ],
  },
  {
    date: "2026-05-12",
    tag: "Infra",
    title: "Convex migration",
    body: [
      "Moved from Supabase to Convex for real-time data + reactivity.",
      "Job execution is now event-driven — no more status polling.",
      "Convex Auth replaces the custom Arctic OAuth flow.",
    ],
  },
  {
    date: "2026-05-10",
    tag: "Stability",
    title: "Resilient routes",
    body: [
      "Every API route is now force-dynamic with lazy backend init — first-deploy builds never block on missing env.",
      "Page-level error boundaries on dashboard and presets.",
      "Sane loading skeletons everywhere.",
    ],
  },
  {
    date: "2026-05-01",
    tag: "Started",
    title: "ReFile begins",
    body: ["Day one of the project. Hello, world."],
  },
];

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
            A running log of releases, improvements, and the occasional honest
            note about what we got wrong and how we fixed it.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 pb-20">
        <ol className="relative space-y-12 border-l border-border pl-7">
          {ENTRIES.map((e) => (
            <li key={e.date} className="relative">
              <span className="absolute -left-[33px] top-1.5 size-2 rounded-full border border-border-strong bg-background" />
              <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
                <time className="text-mono text-muted-foreground">{e.date}</time>
                <Badge variant="secondary">{e.tag}</Badge>
              </div>
              <h2 className="mt-2 text-h2 font-serif font-normal">{e.title}</h2>
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
            </li>
          ))}
        </ol>
      </div>


    </AppShell>
  );
}
