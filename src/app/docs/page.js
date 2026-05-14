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
import { Footer } from "@/components/shell/footer";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Docs",
  description:
    "Learn how to use ReFile — composing prompts, building presets, chaining workflows, and getting the most out of voice input.",
  openGraph: {
    title: "Docs — ReFile",
    description:
      "Learn how to use ReFile — prompts, presets, workflows, voice input.",
  },
};

const SECTIONS = [
  {
    title: "Getting started",
    description: "Sign in, drop a file, get a command.",
    icon: Sparkles,
    links: [
      { label: "Your first conversion", href: "#first-conversion" },
      { label: "Reading the AI's response", href: "#reading-response" },
      { label: "Downloading the output", href: "#downloads" },
    ],
  },
  {
    title: "Writing good prompts",
    description: "Specifics that meaningfully change the output.",
    icon: Terminal,
    links: [
      { label: "Specifying format + quality", href: "#format-quality" },
      { label: "Working with multiple files", href: "#multi-file" },
      { label: "When to mention the tool", href: "#mention-tool" },
    ],
  },
  {
    title: "Voice input",
    description: "Use your voice. Multilingual support included.",
    icon: Mic,
    links: [
      { label: "Languages supported", href: "#languages" },
      { label: "Tips for clean transcription", href: "#transcription-tips" },
    ],
  },
  {
    title: "Presets",
    description: "Reusable shell-command recipes you can share.",
    icon: Layers,
    links: [
      { label: "What a good preset looks like", href: "#good-preset" },
      { label: "Variable substitution", href: "#variables" },
      { label: "Publishing to the community", href: "#publishing" },
    ],
  },
  {
    title: "Workflows",
    description: "Chain presets on the canvas.",
    icon: Workflow,
    links: [
      { label: "Anatomy of a workflow", href: "#workflow-anatomy" },
      { label: "Connecting nodes", href: "#connecting" },
      { label: "Running and re-running", href: "#running" },
    ],
  },
  {
    title: "Account & access",
    description: "Sign-in, sessions, and security.",
    icon: KeyRound,
    links: [
      { label: "Google sign-in", href: "#sign-in" },
      { label: "How sessions work", href: "#sessions" },
      { label: "Deleting your data", href: "#delete-data" },
    ],
  },
];

export default function DocsPage() {
  return (
    <AppShell mode="marketing">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl px-5 pt-20 pb-12">
          <Badge variant="outline" className="gap-1.5 rounded-full">
            <BookOpen className="size-3" />
            Docs
          </Badge>
          <h1 className="text-display mt-5">
            Learn ReFile in <em className="text-muted-foreground">an afternoon.</em>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Short pages, no fluff. Every section ends with a runnable example.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className="surface group flex flex-col p-6 transition-colors hover:border-border-strong"
              >
                <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                  <Icon className="size-4" />
                </div>
                <h2 className="mt-4 text-[15px] font-semibold tracking-tight">
                  {section.title}
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {section.description}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="group/link inline-flex items-center gap-1 text-[12.5px] text-foreground/80 transition-colors hover:text-foreground"
                      >
                        <span className="underline-offset-2 group-hover/link:underline">
                          {link.label}
                        </span>
                        <ArrowRight className="size-3 opacity-0 transition-opacity group-hover/link:opacity-60" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 surface bg-muted/30 px-7 py-9 text-center">
          <h2 className="text-h1-serif">
            Still stuck? <em className="text-muted-foreground">We'll help.</em>
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
      </div>

      <Footer />
    </AppShell>
  );
}
