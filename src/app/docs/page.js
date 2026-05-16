import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  Mic,
  Workflow,
  Layers,
  Terminal,
  KeyRound,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";

import { Badge } from "@/components/ui/badge";
import { absoluteUrl } from "@/lib/site";
import { HIDE_LAUNCH_FEATURES } from "@/lib/nav";

export const metadata = {
  title: "Docs",
  description:
    "Learn how to use ReFile — composing prompts, building presets, chaining workflows, and getting the most out of voice input.",
  alternates: { canonical: absoluteUrl("/docs") },
  openGraph: {
    title: "Docs — ReFile",
    description:
      "Learn how to use ReFile — prompts, presets, workflows, voice input.",
    url: absoluteUrl("/docs"),
  },
};

const TOC = [
  {
    title: "Getting started",
    icon: Sparkles,
    items: [
      { label: "Your first conversion", href: "#first-conversion" },
      { label: "Reading the AI's response", href: "#reading-response" },
      { label: "Downloading the output", href: "#downloads" },
    ],
  },
  {
    title: "Writing good prompts",
    icon: Terminal,
    items: [
      { label: "Specifying format + quality", href: "#format-quality" },
      { label: "Working with multiple files", href: "#multi-file" },
      { label: "When to mention the tool", href: "#mention-tool" },
    ],
  },
  {
    title: "Voice input",
    icon: Mic,
    items: [
      { label: "Languages supported", href: "#languages" },
      { label: "Tips for clean transcription", href: "#transcription-tips" },
    ],
  },
  {
    title: "Presets",
    icon: Layers,
    items: [
      { label: "What a good preset looks like", href: "#good-preset" },
      { label: "Variable substitution", href: "#variables" },
      { label: "Publishing to the community", href: "#publishing" },
    ],
  },
  {
    title: "Workflows",
    icon: Workflow,
    items: [
      { label: "Anatomy of a workflow", href: "#workflow-anatomy" },
      { label: "Connecting nodes", href: "#connecting" },
      { label: "Running and re-running", href: "#running" },
    ],
  },
  {
    title: "Account & access",
    icon: KeyRound,
    items: [
      { label: "Google sign-in", href: "#sign-in" },
      { label: "How sessions work", href: "#sessions" },
      { label: "Deleting your data", href: "#delete-data" },
    ],
  },
];

function Code({ children }) {
  return (
    <pre className="code-block my-3 max-w-full overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

function Anchor({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h3 className="group flex items-baseline gap-2 text-[16px] font-semibold tracking-tight">
        <a
          href={`#${id}`}
          aria-label={`Link to ${title}`}
          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        >
          #
        </a>
        {title}
      </h3>
      <div className="mt-2 space-y-3 text-[14.5px] leading-relaxed text-foreground/85">
        {children}
      </div>
    </section>
  );
}

export default function DocsPage() {
  const tocSections = HIDE_LAUNCH_FEATURES
    ? TOC.filter((s) => s.title !== "Presets" && s.title !== "Workflows")
    : TOC;

  return (
    <AppShell mode="marketing">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl px-4 pb-10 pt-14 sm:px-5 sm:pt-20 sm:pb-12">
          <Badge variant="outline" className="gap-1.5 rounded-full">
            <BookOpen className="size-3" />
            Docs
          </Badge>
          <h1 className="text-display mt-5">
            Learn ReFile in{" "}
            <em className="text-muted-foreground">an afternoon.</em>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Short pages, no fluff. Every section ends with a runnable example.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 sm:px-5 lg:grid-cols-[240px_1fr]">
        {/* Sticky TOC (desktop) + collapsible nav (mobile) */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-6">
            {tocSections.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title}>
                  <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <Icon className="size-3" />
                    {s.title}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {s.items.map((it) => (
                      <li key={it.href}>
                        <a
                          href={it.href}
                          className="block rounded-md px-2 py-1 text-[13px] text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {it.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Mobile quick-jump grid */}
        <details className="surface group p-4 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-medium">
            On this page
            <ArrowRight className="size-3.5 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {tocSections.flatMap((s) => s.items).map((it) => (
              <a
                key={it.href}
                href={it.href}
                className="truncate rounded-md border border-border bg-card/50 px-2.5 py-1.5 text-[12px] text-foreground/80 hover:bg-muted hover:text-foreground"
              >
                {it.label}
              </a>
            ))}
          </div>
        </details>

        <article className="min-w-0 space-y-14">
          {/* Getting started */}
          <section className="space-y-6">
            <header>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Getting started
              </p>
              <h2 className="mt-1 text-h2 tracking-tight">
                Sign in, drop a file, get a command.
              </h2>
            </header>

            <Anchor id="first-conversion" title="Your first conversion">
              <p>
                Sign in with Google, then on the dashboard, drag any file
                anywhere on the page. Type what you want in plain English and
                hit <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-mono text-[11px]">↵</kbd> (or
                press the up-arrow button).
              </p>
              <p>
                ReFile picks the right tool ({" "}
                <code className="text-mono">ffmpeg</code>,{" "}
                <code className="text-mono">magick</code>,{" "}
                <code className="text-mono">qpdf</code>,{" "}
                <code className="text-mono">tesseract</code>,{" "}
                <code className="text-mono">pandoc</code>… ), writes a one-line
                shell command, runs it in a sandbox, and hands you the output
                file.
              </p>
              <p className="text-muted-foreground">
                Tip: you can attach multiple files. ReFile sees all of them.
              </p>
            </Anchor>

            <Anchor id="reading-response" title="Reading the AI's response">
              <p>Every response has two parts:</p>
              <ul className="ml-4 list-disc space-y-1.5">
                <li>
                  <strong>What this does</strong> — a one-sentence summary in
                  plain language of the operation ReFile performed.
                </li>
                <li>
                  <strong>Inputs / Outputs</strong> — the files involved, with
                  download links on the outputs.
                </li>
              </ul>
              <p>
                If something fails, you'll see the sandbox logs collapsed under
                the response — expand them for the raw{" "}
                <code className="text-mono">stderr</code>.
              </p>
            </Anchor>

            <Anchor id="downloads" title="Downloading the output">
              <p>
                Click the download icon next to any output file. Files are
                served straight from our encrypted storage — no extra hop.
              </p>
              <p className="text-muted-foreground">
                Heads up: outputs and uploads are deleted automatically after
                24 hours. Re-run the chat to regenerate.
              </p>
            </Anchor>
          </section>

          {/* Prompts */}
          <section className="space-y-6">
            <header>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Writing good prompts
              </p>
              <h2 className="mt-1 text-h2 tracking-tight">
                Specifics meaningfully change the output.
              </h2>
            </header>

            <Anchor id="format-quality" title="Specifying format + quality">
              <p>
                The more concrete you are, the closer the first answer is to
                what you want. Compare:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="surface p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Vague
                  </p>
                  <p className="mt-2 text-[13.5px] text-foreground/85">
                    "compress this video"
                  </p>
                </div>
                <div className="surface p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Specific
                  </p>
                  <p className="mt-2 text-[13.5px] text-foreground/85">
                    "Compress this MP4 to under 8 MB at 720p, H.264, keep audio
                    at 96 kbps AAC."
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground">
                Useful hints: target size, resolution, codec, bitrate, frame
                rate, color space, output format.
              </p>
            </Anchor>

            <Anchor id="multi-file" title="Working with multiple files">
              <p>
                Drop them all in one go. Reference them by what they are, not by
                filename — "merge these PDFs in order", "watermark every image
                in the bottom-right", "extract audio from each video".
              </p>
              <p>
                ReFile passes every file path to the command, so things like{" "}
                <code className="text-mono">*.jpg</code> patterns work
                naturally.
              </p>
            </Anchor>

            <Anchor id="mention-tool" title="When to mention the tool">
              <p>
                You don't have to — ReFile picks one. But if you know what you
                want, say it: "use ffmpeg, not magick", "compress with
                Ghostscript at /screen preset", "use libwebp's lossy mode".
              </p>
              <p className="text-muted-foreground">
                Tool hints take priority over auto-selection.
              </p>
            </Anchor>
          </section>

          {/* Voice */}
          <section className="space-y-6">
            <header>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Voice input
              </p>
              <h2 className="mt-1 text-h2 tracking-tight">
                Use your voice. Multilingual support included.
              </h2>
            </header>

            <Anchor id="languages" title="Languages supported">
              <p>
                Tap the microphone icon to record. Set the language to your
                spoken language for the cleanest transcription. Today we
                support:
              </p>
              <p>
                English, हिन्दी, தமிழ், తెలుగు, ಕನ್ನಡ, മലയാളം, मराठी, বাংলা,
                ગુજરાતી, ਪੰਜਾਬੀ, اردو.
              </p>
              <p className="text-muted-foreground">
                Auto-detect works fine if you're switching languages mid-prompt.
              </p>
            </Anchor>

            <Anchor id="transcription-tips" title="Tips for clean transcription">
              <ul className="ml-4 list-disc space-y-1.5">
                <li>Record in a quiet room — even small background noise hurts.</li>
                <li>Speak naturally; don't over-enunciate.</li>
                <li>
                  Spell out filenames if they're unusual ("file foo dash one
                  dot pdf").
                </li>
                <li>
                  You can edit the transcribed text before sending — voice is a
                  starting point, not a contract.
                </li>
              </ul>
            </Anchor>
          </section>

          {/* Presets */}
          {!HIDE_LAUNCH_FEATURES && (
          <section className="space-y-6">
            <header>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Presets
              </p>
              <h2 className="mt-1 text-h2 tracking-tight">
                Reusable shell-command recipes you can share.
              </h2>
            </header>

            <Anchor id="good-preset" title="What a good preset looks like">
              <p>
                A preset is a templated shell command plus a description. It
                accepts named inputs (your files) and produces named outputs.
                Good presets are:
              </p>
              <ul className="ml-4 list-disc space-y-1.5">
                <li>Specific enough to be useful, generic enough to reuse.</li>
                <li>Named for what they do, not what tool they use.</li>
                <li>Documented with one example input/output.</li>
              </ul>
            </Anchor>

            <Anchor id="variables" title="Variable substitution">
              <p>
                Use <code className="text-mono">{"{input}"}</code>,{" "}
                <code className="text-mono">{"{input.0}"}</code>,{" "}
                <code className="text-mono">{"{output}"}</code> in your
                template:
              </p>
              <Code>{`magick {input} -resize 1920x1080 -quality 82 -format webp {output}.webp`}</Code>
              <p>
                Multi-input variants are positional. Output paths are inferred
                from the template's right-hand side.
              </p>
            </Anchor>

            <Anchor id="publishing" title="Publishing to the community">
              <p>
                When you save a preset, mark it public to share it. Public
                presets appear on{" "}
                <Link
                  href="/presets"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  /presets
                </Link>
                . You can edit, fork, or unpublish from the preset detail page.
              </p>
            </Anchor>
          </section>
          )}

          {/* Workflows */}
          {!HIDE_LAUNCH_FEATURES && (
          <section className="space-y-6">
            <header>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Workflows
              </p>
              <h2 className="mt-1 text-h2 tracking-tight">
                Chain presets on the canvas.
              </h2>
            </header>

            <Anchor id="workflow-anatomy" title="Anatomy of a workflow">
              <p>
                A workflow is a directed graph of preset nodes. Each node takes
                files in, produces files out. Connections move files from one
                node's output to the next node's input.
              </p>
            </Anchor>

            <Anchor id="connecting" title="Connecting nodes">
              <p>
                Drag from a node's output handle to another node's input
                handle. Type compatibility is checked — you'll see a red line
                if a connection would never run.
              </p>
            </Anchor>

            <Anchor id="running" title="Running and re-running">
              <p>
                Hit Run. Each node runs in topological order. Failed nodes
                short-circuit downstream nodes. Re-runs reuse cached outputs
                where possible.
              </p>
            </Anchor>
          </section>
          )}

          {/* Account */}
          <section className="space-y-6">
            <header>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Account & access
              </p>
              <h2 className="mt-1 text-h2 tracking-tight">
                Sign-in, sessions, and security.
              </h2>
            </header>

            <Anchor id="sign-in" title="Google sign-in">
              <p>
                ReFile uses Sign in with Google. We request only your basic
                profile (name, email, avatar). We can't read your Drive, Gmail,
                or anything else.
              </p>
            </Anchor>

            <Anchor id="sessions" title="How sessions work">
              <p>
                Your session is an HTTP-only signed cookie. It lasts 30 days
                from your last activity. Signing out clears it.
              </p>
            </Anchor>

            <Anchor id="delete-data" title="Deleting your data">
              <p>
                Delete individual chats from the history sidebar. For full
                account deletion, email{" "}
                <a
                  href="mailto:privacy@denoiselabs.com"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  privacy@denoiselabs.com
                </a>{" "}
                — we wipe everything within 30 days.
              </p>
              <p className="text-muted-foreground">
                See the{" "}
                <Link
                  href="/privacy"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </Link>{" "}
                for the full picture.
              </p>
            </Anchor>
          </section>

          {/* CTA */}
          <div className="surface bg-muted/30 px-5 py-8 text-center sm:px-7 sm:py-9">
            <h2 className="text-h2 text-balance">
              Still stuck?{" "}
              <em className="font-serif text-muted-foreground">We'll help.</em>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
              Email{" "}
              <a
                href="mailto:hello@denoiselabs.com"
                className="text-foreground underline-offset-4 hover:underline"
              >
                hello@denoiselabs.com
              </a>{" "}
              with what you tried — a real person reads every message.
            </p>
          </div>
        </article>
      </div>


    </AppShell>
  );
}
