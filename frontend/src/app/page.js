"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Wand2,
  FileStack,
  Workflow,
  Mic,
  ShieldCheck,
  Terminal,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { useAuth } from "@/contexts/auth-context";

const FEATURES = [
  {
    icon: Wand2,
    title: "Natural language ↔ shell",
    body: "Describe the outcome. We translate it into the exact ImageMagick, FFmpeg, Poppler, or Pandoc command — and run it.",
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
    icon: Terminal,
    title: "Command + output",
    body: "You never lose sight of what ran. Every result ships with the exact command — copy, audit, re-run.",
  },
  {
    icon: ShieldCheck,
    title: "Yours, end to end",
    body: "Your files, your account, your history. Google sign-in, encrypted sessions, downloadable artifacts.",
  },
];

const SHOWCASE = [
  {
    prompt: "Extract audio from this MP4 as a clean 192kbps MP3.",
    command: "ffmpeg -i input.mp4 -vn -ab 192k -ar 44100 -y output.mp3",
    tool: "FFmpeg",
  },
  {
    prompt: "Merge these three PDFs and compress to 1.2 MB.",
    command: "qpdf --empty --pages a.pdf b.pdf c.pdf -- merged.pdf",
    tool: "qpdf",
  },
  {
    prompt: "Resize every image to 1080p, keep aspect, save as webp.",
    command: "magick mogrify -resize 1920x1080 -format webp -quality 82 *.jpg",
    tool: "ImageMagick",
  },
];

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <AppShell mode="marketing">
      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--foreground)_8%,transparent),transparent_70%)]" />

        <div className="relative mx-auto max-w-5xl px-5 pt-20 pb-20 sm:pt-28 sm:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
          >
            <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1">
              <Sparkles className="size-3" />
              <span className="text-[11.5px]">v0.1 — Public preview</span>
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="text-display mt-6 text-center text-balance"
          >
            Describe the file you want.
            <br />
            <span className="text-muted-foreground">We write the command.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-6 max-w-2xl text-center text-[15px] leading-relaxed text-muted-foreground"
          >
            ReFile turns natural language — typed or spoken — into runnable shell
            pipelines for images, video, audio, PDFs, and documents.
            Built for people who want the speed of AI without the opacity of a black box.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Button size="lg" asChild>
              <Link href="/login/google">
                Get started — it's free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/presets">Browse presets</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.32 }}
            className="mt-4 flex items-center justify-center gap-2 text-[11.5px] text-muted-foreground"
          >
            <span>No credit card.</span>
            <span aria-hidden>·</span>
            <span>Sign in with Google.</span>
            <span aria-hidden>·</span>
            <span>
              Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> anywhere
            </span>
          </motion.div>

          {/* ───── Hero showcase card ───── */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 sm:mt-20"
          >
            <ShowcaseCard />
          </motion.div>
        </div>
      </section>

      {/* ───── Features grid ───── */}
      <section className="border-t border-border/70">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-h1 text-balance">
              Built like a tool, not a toy.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Every output is a real shell command on a real file. No hidden state,
              no black-box conversions — just AI that respects what professionals
              already know.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-card p-7 transition-colors hover:bg-muted/40"
              >
                <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-transform group-hover:-translate-y-0.5">
                  <f.icon className="size-4" />
                </div>
                <h3 className="mt-5 text-[15px] font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How it works ───── */}
      <section className="border-t border-border/70 bg-subtle/40">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-h1">Three steps. One file later.</h2>
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
      <section className="border-t border-border/70">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="text-h1 text-balance">Stop googling flags. Start shipping files.</h2>
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
            <Button size="lg" variant="outline" asChild>
              <Link href="/presets">See community presets</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-[12px] text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} ReFile</span>
          <div className="flex items-center gap-5">
            <Link href="#" className="transition-colors hover:text-foreground">Terms</Link>
            <Link href="#" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link href="/presets" className="transition-colors hover:text-foreground">Presets</Link>
          </div>
        </div>
      </footer>
    </AppShell>
  );
}

/* ──────────────────────────────────────────────────────────────── *
 *  Hero showcase — animated chat-style preview of the product
 * ──────────────────────────────────────────────────────────────── */

function ShowcaseCard() {
  return (
    <div className="surface mx-auto max-w-3xl overflow-hidden shadow-[0_30px_120px_-30px_rgba(0,0,0,0.35)]">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 border-b border-border/80 bg-muted/40 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border-strong/80" />
        <span className="size-2.5 rounded-full bg-border-strong/60" />
        <span className="size-2.5 rounded-full bg-border-strong/40" />
        <span className="ml-3 text-mono text-muted-foreground">refile · /chat</span>
      </div>

      <div className="space-y-5 p-6 sm:p-7">
        {SHOWCASE.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
                You
              </div>
              <p className="pt-0.5 text-[13.5px] leading-relaxed text-foreground">
                {item.prompt}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
                <Sparkles className="size-3" />
              </div>
              <div className="flex-1 space-y-2">
                <Badge variant="outline" className="font-mono text-[10.5px]">
                  {item.tool}
                </Badge>
                <pre className="code-block">{item.command}</pre>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
