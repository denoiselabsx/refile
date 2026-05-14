import { AppShell } from "@/components/shell/app-shell";
import { Footer } from "@/components/shell/footer";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Changelog",
  description:
    "What's new in ReFile — recent releases, fixes, and the road ahead.",
  openGraph: {
    title: "Changelog — ReFile",
    description: "What's new in ReFile.",
  },
};

const ENTRIES = [
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

      <Footer />
    </AppShell>
  );
}
