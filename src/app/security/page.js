import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Server,
  Trash2,
  Eye,
  Bug,
  Github,
  Clock,
  Terminal,
  Database,
  KeyRound,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";

import { absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Security & Trust",
  description:
    "Concrete commitments about your files, prompts, and account: where files run, when they're deleted, what we store, what the AI sees, and what's never sold.",
  alternates: { canonical: absoluteUrl("/security") },
  openGraph: {
    title: "Security & Trust — ReFile",
    description:
      "Concrete commitments about your files, prompts, and account.",
    url: absoluteUrl("/security"),
  },
};

const GITHUB_URL = "https://github.com/denoiselabsx/refile";

/* ──────────────────────────────────────────────────────────────── *
 *  Top-level commitment cards
 *  Six concrete facts a curious user reads in 60 seconds and walks
 *  away with a clear mental model of where their data sits.
 * ──────────────────────────────────────────────────────────────── */
const COMMITMENTS = [
  {
    icon: Server,
    title: "Where your files run",
    body: "Every conversion runs inside an ephemeral Modal sandbox — a per-job Linux container with no persistent disk, no other tenants, and no network access except to fetch your input file and return the output.",
  },
  {
    icon: Clock,
    title: "When files are deleted",
    body: "Inputs and outputs are deleted automatically 24 hours after creation. There is no archive, no backup, no cold tier. This is enforced by a cron, not a promise — once the timer fires, the bytes are gone.",
  },
  {
    icon: Eye,
    title: "What the AI sees",
    body: "The Groq LLM that picks the tool only sees your text prompt and the filenames involved. It never sees the file contents. The sandboxed worker is the only system that touches your actual bytes.",
  },
  {
    icon: Database,
    title: "What we store, what we don't",
    body: "We retain your prompt history and the generated command (so you can re-run it). We do not retain the converted files past 24 hours. We never store your file contents in any analytics, log, or training pipeline.",
  },
  {
    icon: Terminal,
    title: "Commands are visible before execution",
    body: "Every job records the exact command we plan to run on your file. The history page shows it. Nothing executes in a black box — if the AI proposes something you don't expect, you'll see it.",
  },
  {
    icon: ShieldCheck,
    title: "No ads, no resale, no training",
    body: "Your files, prompts, and outputs are never used to train AI models, sold to advertisers, or shared with third parties for any purpose other than running the conversion you asked for.",
  },
];

/* ──────────────────────────────────────────────────────────────── *
 *  Second-tier facts: the operational details a technical reader
 *  asks for after the commitments above.
 * ──────────────────────────────────────────────────────────────── */
const DETAILS = [
  {
    icon: Lock,
    title: "Encryption everywhere",
    body: "All traffic is TLS 1.2+. Files at rest are encrypted by the storage provider. Session cookies are HTTP-only and signed.",
  },
  {
    icon: KeyRound,
    title: "Sign-in scopes are minimal",
    body: "Google sign-in requests basic profile and email only. ReFile cannot read your Drive, Gmail, or anything else on your Google account.",
  },
  {
    icon: Trash2,
    title: "Delete on demand",
    body: "You can delete any chat or your entire account at any time from Settings. Account deletion removes every chat, prompt, and stored command — files are already gone after 24h.",
  },
];

export default function SecurityPage() {
  return (
    <AppShell mode="marketing">
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-14 sm:pt-20">
        <header className="border-b border-border pb-8">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Security &amp; Trust
          </p>
          <h1 className="text-h1-serif mt-2 text-balance">
            What we promise about your files
          </h1>
          <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-muted-foreground">
            ReFile sees a lot of your files. We've kept the system small on
            purpose so we can explain — concretely, not generically — where
            your data goes, what touches it, and when it disappears. The
            source is{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              public on GitHub
            </a>{" "}
            so anything below can be verified, not just trusted.
          </p>
        </header>

        {/* ── Primary commitments ───────────────────────────────── */}
        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          {COMMITMENTS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="surface p-5">
                <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-card">
                  <Icon className="size-4" />
                </div>
                <h2 className="mt-4 text-[15px] font-semibold tracking-tight">
                  {p.title}
                </h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </div>
            );
          })}
        </section>

        {/* ── The exact data flow ───────────────────────────────── */}
        <section className="mt-12 rounded-lg border border-border bg-card/40 p-5">
          <h2 className="text-[15px] font-semibold tracking-tight">
            How one conversion actually flows
          </h2>
          <ol className="mt-4 space-y-2.5 text-[13.5px] leading-relaxed text-foreground/85">
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-medium">
                1
              </span>
              <span>
                You upload a file. It lands in Convex storage encrypted at
                rest, accessible only via a short-lived signed URL we mint
                for you.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-medium">
                2
              </span>
              <span>
                Your text prompt + filenames (not the file bytes) go to a
                Groq-hosted LLM, which proposes a single command to run.
                That command is saved to your history before anything
                executes.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-medium">
                3
              </span>
              <span>
                A fresh Modal sandbox is spun up just for this job. It
                downloads your file via the signed URL, runs the command,
                writes the output back to Convex, and shuts down. No state
                survives the run.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-medium">
                4
              </span>
              <span>
                You download the output. 24 hours later, the cleanup cron
                deletes both your input and the output from storage. The
                history row stays (prompt + command), but the files are
                gone.
              </span>
            </li>
          </ol>
        </section>

        {/* ── Operational details ──────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-[15px] font-semibold tracking-tight">
            Operational details
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {DETAILS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="surface p-4">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-card">
                    <Icon className="size-3.5" />
                  </div>
                  <h3 className="mt-3 text-[13.5px] font-semibold tracking-tight">
                    {p.title}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                    {p.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Reporting / open source ─────────────────────────── */}
        <section id="report" className="mt-12 scroll-mt-24">
          <h2 className="text-[18px] font-semibold tracking-tight">
            Reporting a vulnerability
          </h2>
          <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-foreground/85">
            Please email{" "}
            <a
              href="mailto:security@denoiselabs.com"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              security@denoiselabs.com
            </a>{" "}
            with steps to reproduce. Do not publicly disclose until we've
            had a reasonable window to fix the issue (typically 30 days).
            We do not currently run a paid bounty, but we credit reporters
            of valid issues.
          </p>
          <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-foreground/85">
            ReFile's code is public. If a claim on this page doesn't match
            what the code actually does, that's a bug — please file it.
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted/60"
          >
            <Github className="size-4" />
            View source on GitHub
          </a>
        </section>

        {/* ── Footer nav ────────────────────────────────────────── */}
        <div className="mt-14 flex flex-wrap items-center gap-4 border-t border-border pt-8 text-[13px] text-muted-foreground">
          <Link
            href="/terms"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            href="/"
            className="ml-auto underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Back to ReFile
          </Link>
        </div>
      </article>
    </AppShell>
  );
}
