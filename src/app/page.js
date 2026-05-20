"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Wand2,
  FileStack,
  Workflow,
  Mic,
  ShieldCheck,
  Sparkles,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  ScanText,
  FileCode,
  Check,
  Download,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";

import { Spotlight } from "@/components/spotlight";
import { DemoVideo } from "@/components/demo-video";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { HIDE_LAUNCH_FEATURES } from "@/lib/nav";
import { APP_VERSION } from "@/lib/site";

const FEATURES = [
  {
    icon: Wand2,
    title: "Describe it, get it done",
    body: "Say what you want in plain words. ReFile figures out the right tool — ImageMagick, FFmpeg, Poppler, Pandoc — and does it. No commands, no flags, no manuals.",
  },
  {
    icon: Mic,
    title: "Voice in your language",
    body: "Speak in Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Urdu, or English.",
  },
  {
    icon: FileStack,
    title: "Community presets",
    body: "Reusable recipes shared by other operators. Fork them, run them, save your own.",
  },
  {
    icon: Workflow,
    title: "Visual workflows",
    body: "Chain presets together on a canvas. Build deterministic, repeatable file pipelines.",
  },
  {
    icon: Sparkles,
    title: "Just the result",
    body: "No terminal, no jargon. Drop a file, describe the outcome, download what you asked for. ReFile handles everything in between.",
  },
  {
    icon: ShieldCheck,
    title: "Yours, end to end",
    body: "Your files, your account, your history. Google sign-in, encrypted sessions, downloadable artifacts.",
  },
];

// Each card = one file type. Prompts are real things you can type into ReFile.
// Listed prominently because each one is a high-intent SEO landing too
// ("compress mp4", "extract audio from video", "merge pdfs", etc.).
const CAPABILITIES = [
  {
    icon: ImageIcon,
    title: "Images",
    tool: "ImageMagick · Ghostscript",
    examples: [
      "Resize all of these to 1080p, save as WebP",
      "Convert this PNG to PDF",
      "Add a watermark in the bottom-right",
      "Strip EXIF and GPS metadata",
      "Crop a square from the center",
      "Compress JPEG to under 200 KB",
      "Sharpen this slightly blurry photo",
    ],
  },
  {
    icon: Video,
    title: "Video",
    tool: "FFmpeg",
    examples: [
      "Compress this MP4 for WhatsApp",
      "Convert MOV to MP4 at 1080p",
      "Trim from 0:30 to 1:45",
      "Make a GIF from this clip",
      "Burn subtitles into the video",
      "Mute the audio",
      "Speed it up 2×",
    ],
  },
  {
    icon: Music,
    title: "Audio",
    tool: "FFmpeg",
    examples: [
      "Extract audio as 192 kbps MP3",
      "Trim silence from the start",
      "Normalize the loudness",
      "Slow it down to 0.75× without pitch shift",
      "Convert WAV to MP3",
      "Fade in and out by 3 seconds",
    ],
  },
  {
    icon: FileText,
    title: "PDFs",
    tool: "Ghostscript · qpdf · Poppler",
    examples: [
      "Compress this PDF",
      "Merge these three PDFs",
      "Extract pages 2–5",
      "Split each page into its own file",
      "Render page 1 as a PNG",
      "Remove the password",
      "Rotate every page 90°",
    ],
  },
  {
    icon: ScanText,
    title: "OCR & text",
    tool: "Tesseract",
    examples: [
      "Read the text from this scan",
      "OCR this image to a .txt file",
      "Make a searchable PDF from these scans",
      "Extract Hindi text from this poster",
    ],
  },
  {
    icon: FileCode,
    title: "Documents",
    tool: "Pandoc",
    examples: [
      "Convert this DOCX to PDF",
      "Markdown to a styled PDF",
      "EPUB to plain text",
      "HTML to Markdown",
      "Strip all formatting",
    ],
  },
];

// Outcome-focused — deliberately NO raw shell commands. The product hides
// the command (users "need not know"); the landing must match that promise
// and not scare non-technical visitors with a wall of ffmpeg flags.
const SHOWCASE = [
  {
    prompt: "Extract the audio from this video as a clean MP3.",
    result: "song.mp3",
    note: "192 kbps · ready in seconds",
  },
  {
    prompt: "Merge these three PDFs and shrink it under 2 MB.",
    result: "merged.pdf",
    note: "3 files → 1 · 1.2 MB",
  },
  {
    prompt: "Resize every photo to 1080p and save as WebP.",
    result: "12 images",
    note: "WebP · aspect kept",
  },
];

export default function Home() {
  // Note: deliberately NO auto-redirect for authenticated users. The landing
  // page (and all marketing pages) must stay viewable while signed in;
  // logged-in users enter the app via the "Dashboard" button in the nav
  // (top-bar already swaps Sign in → Dashboard when authed). A forced
  // / → /dashboard redirect here trapped users who wanted /, /pricing, etc.

  return (
    <AppShell mode="marketing">
      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden">
        <div className="atmosphere" />
        <div className="absolute inset-0 grid-bg opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />

        <div className="relative mx-auto max-w-5xl px-4 pt-14 pb-16 sm:px-5 sm:pt-28 sm:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
          >
            <div className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 backdrop-blur transition-colors hover:border-border-strong">
              <span className="relative inline-flex size-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                Public preview
              </span>
              <span className="text-[11.5px] text-muted-foreground opacity-50">·</span>
              <span className="text-[11.5px] font-medium tracking-tight">
                {APP_VERSION}
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="text-display mt-6 text-center text-balance"
          >
            Do anything to a file.{" "}
            <em className="text-muted-foreground">Just say it.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-6 max-w-2xl text-center text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]"
          >
            Convert, compress, resize, crop, rotate, merge, split, extract, transcribe,
            redact, watermark, OCR — anything ffmpeg, ImageMagick, Ghostscript, or qpdf
            can do, ReFile can do. Type or speak the result you want — ReFile
            handles the rest and hands back the finished file.
            <span className="block mt-1.5 text-foreground/80">
              Any file. Any operation. No tools to learn, no upload limits, no watermarks.
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
          >
            <Button size="lg" asChild className="cta-shimmer">
              <Link href="/login/google">
                Get started — it's free
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            {!HIDE_LAUNCH_FEATURES && (
              <Button size="lg" variant="outline" asChild>
                <Link href="/presets">Browse presets</Link>
              </Button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.32 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 px-2 text-center text-[11.5px] text-muted-foreground"
          >
            <span className="whitespace-nowrap">No credit card.</span>
            <span aria-hidden className="hidden sm:inline">·</span>
            <span className="whitespace-nowrap">Sign in with Google.</span>
            <span aria-hidden className="hidden sm:inline">·</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> anywhere
            </span>
          </motion.div>

          {/* ───── Hero showcase card ───── */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 sm:mt-20"
          >
            <ShowcaseCard />
          </motion.div>
        </div>
      </section>

      {/* ───── Demo video ───── */}
      <section className="border-t border-border/70 bg-subtle/30">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              See it in action
            </p>
            <h2 className="text-h1-serif mt-3 text-balance">
              Watch a file get done{" "}
              <em className="text-muted-foreground">in seconds.</em>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              No setup, no commands. Describe the outcome, get the file.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 sm:mt-14"
          >
            <DemoVideo />
          </motion.div>
        </div>
      </section>

      {/* ───── Capabilities — "what can I actually ask?" ───── */}
      <section className="border-t border-border/70">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-h1-serif text-balance">
              If a tool can do it, <em className="text-muted-foreground">you can ask for it.</em>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              ReFile speaks every file format and every operation that ffmpeg,
              ImageMagick, Ghostscript, qpdf, Poppler, Tesseract, and Pandoc support —
              which is most of them. A few of the things people ask for:
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <Spotlight
                  key={cap.title}
                  className="surface group flex flex-col gap-3 p-5 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-md border border-border bg-card">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14.5px] font-semibold tracking-tight">
                        {cap.title}
                      </h3>
                      <p className="text-[11.5px] text-muted-foreground">
                        {cap.tool}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {cap.examples.map((ex) => (
                      <li
                        key={ex}
                        className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-muted-foreground"
                      >
                        <span
                          aria-hidden
                          className="mt-[7px] inline-block size-1 shrink-0 rounded-full bg-muted-foreground/40"
                        />
                        <span>“{ex}”</span>
                      </li>
                    ))}
                  </ul>
                </Spotlight>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-[12.5px] text-muted-foreground">
            <span>Don't see it?</span>
            <Link
              href="/login/google"
              className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
            >
              Just ask. ReFile figures it out.
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Features grid ───── */}
      <section className="border-t border-border/70">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-h1-serif text-balance">
              Built like a tool, <em className="text-muted-foreground">not a toy.</em>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Every output is a real shell command on a real file. No hidden state,
              no black-box conversions — just AI that respects what professionals
              already know.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Spotlight
                key={f.title}
                className="group relative bg-card p-7 transition-colors"
              >
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-transform group-hover:-translate-y-0.5">
                    <f.icon className="size-4" />
                  </div>
                  <h3 className="mt-5 text-[15px] font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </motion.div>
              </Spotlight>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How it works ───── */}
      <section className="border-t border-border/70 bg-subtle/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-h1-serif">
              Three steps. <em className="text-muted-foreground">One file later.</em>
            </h2>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Drop in your files",
                body: "Drag and drop one or many — images, video, audio, PDFs, anything reasonable.",
              },
              {
                step: "02",
                title: "Say what you want",
                body: "Plain English (or your own language by voice). “Resize to 1080p, keep aspect, save as WebP.”",
              },
              {
                step: "03",
                title: "Get the command + the result",
                body: "ReFile picks the right tool, generates the command, runs it, hands you the output.",
              },
            ].map((s) => (
              <div key={s.step} className="surface p-7">
                <span className="text-mono text-muted-foreground">{s.step}</span>
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA ───── */}
      {/* Popular conversions — surfaces the SEO landing pages so visitors
          who land on the marketing home can discover them without leaving
          the site or relying on Google. Hand-picked from the data file. */}
      <section className="border-t border-border/70 bg-subtle/30">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-h2 font-serif">Popular conversions</h2>
            <Link
              href="/formats"
              className="text-[13px] font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
            >
              See all →
            </Link>
          </div>
          <div className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { slug: "mp4-to-mp3", label: "MP4 → MP3" },
              { slug: "heic-to-jpg", label: "HEIC → JPG" },
              { slug: "mov-to-mp4", label: "MOV → MP4" },
              { slug: "png-to-pdf", label: "PNG → PDF" },
              { slug: "pdf-to-jpg", label: "PDF → JPG" },
              { slug: "webp-to-png", label: "WebP → PNG" },
              { slug: "compress-pdf", label: "Compress PDF" },
              { slug: "compress-video", label: "Compress video" },
              { slug: "gif-to-mp4", label: "GIF → MP4" },
            ].map((c) => (
              <Link
                key={c.slug}
                href={`/convert/${c.slug}`}
                className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted/60"
              >
                {c.label}
                <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/70">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="text-h1-serif text-balance">
            Stop googling flags. <em className="text-muted-foreground">Start shipping files.</em>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Sign in once. Save your favorite recipes. Build workflows.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/login/google">
                Sign in with Google
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            {!HIDE_LAUNCH_FEATURES && (
              <Button size="lg" variant="outline" asChild>
                <Link href="/presets">See community presets</Link>
              </Button>
            )}
          </div>
        </div>
      </section>


    </AppShell>
  );
}

/* ──────────────────────────────────────────────────────────────── *
 *  Hero showcase — animated chat-style preview of the product
 * ──────────────────────────────────────────────────────────────── */

function ShowcaseCard() {
  return (
    <div className="surface mx-auto w-full max-w-3xl overflow-hidden shadow-[0_30px_120px_-30px_rgba(0,0,0,0.4)]">
      {/* Window chrome */}
      <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-muted/40 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-full bg-border-strong/80" />
          <span className="size-2.5 shrink-0 rounded-full bg-border-strong/60" />
          <span className="size-2.5 shrink-0 rounded-full bg-border-strong/40" />
          <span className="ml-2 truncate text-mono text-muted-foreground sm:ml-3">
            refile · /chat
          </span>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex">
          <span className="inline-flex size-1.5 rounded-full bg-success animate-pulse-soft" />
          live
        </span>
      </div>

      <div className="space-y-5 p-4 sm:space-y-6 sm:p-7">
        {SHOWCASE.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2"
          >
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
                You
              </div>
              <p className="min-w-0 pt-0.5 text-[13.5px] leading-relaxed text-foreground">
                {item.prompt}
              </p>
            </div>
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
                <Sparkles className="size-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                    <Check className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {item.result}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.note}
                    </p>
                  </div>
                  <span className="ml-1 inline-flex items-center gap-1 rounded-lg bg-foreground px-2.5 py-1.5 text-[11.5px] font-medium text-background">
                    <Download className="size-3" />
                    Download
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
