"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Github,
  Mail,
  MessageSquare,
  Sparkles,
  Heart,
  ArrowRight,
  GitFork,
  Layers,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Footer } from "@/components/shell/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../convex/_generated/api";

const CHANNELS = [
  {
    icon: Github,
    title: "GitHub",
    body: "Source, issues, roadmap. Stars and PRs welcome.",
    cta: "Open repo",
    href: "https://github.com/denoiselabsx/refile",
    external: true,
  },
  {
    icon: Mail,
    title: "Email",
    body: "A human reads every message. Send bug reports, feature requests, or just say hi.",
    cta: "hello@denoiselabs.com",
    href: "mailto:hello@denoiselabs.com",
  },
  {
    icon: MessageSquare,
    title: "Office hours",
    body: "Want to talk through a tricky pipeline? Book 15 minutes with the team.",
    cta: "Email to book",
    href: "mailto:hello@denoiselabs.com?subject=Office%20hours",
  },
];

const CONTRIBUTE = [
  {
    icon: Layers,
    title: "Publish a preset",
    body: "Share a recipe you keep using. The best presets get pinned and credited.",
    href: "/presets/create",
    cta: "Create one",
  },
  {
    icon: GitFork,
    title: "Fork & improve",
    body: "Most public presets are forkable. Tweak the command, publish your version.",
    href: "/presets",
    cta: "Browse all",
  },
  {
    icon: Sparkles,
    title: "Suggest a tool",
    body: "Want ReFile to support a new tool (yt-dlp, exiftool, sox)? Open an issue.",
    href: "https://github.com/denoiselabsx/refile/issues",
    cta: "Open issue",
    external: true,
  },
];

export default function CommunityPage() {
  const topPresets = useQuery(api.presets.list, {
    limit: 6,
    sortBy: "likes_count",
    sortOrder: "desc",
  });

  return (
    <AppShell mode="marketing">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="relative mx-auto max-w-3xl px-4 pb-12 pt-14 sm:px-5 sm:pt-20">
          <Badge variant="outline" className="gap-1.5 rounded-full">
            <Users className="size-3" />
            Community
          </Badge>
          <h1 className="text-display mt-5 text-balance">
            Built by people who{" "}
            <em className="text-muted-foreground">use it daily.</em>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            ReFile is a small open project from Denoise Labs. The shared
            presets, the bug reports, the weird edge cases — they all come
            from people like you. Here's how to plug in.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <Button size="lg" asChild className="cta-shimmer">
              <a
                href="https://github.com/denoiselabsx/refile"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="size-4" />
                Star on GitHub
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/presets">Browse community presets</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Channels */}
      <section className="border-t border-border/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-h1-serif text-balance">
              Where the conversation happens.
            </h2>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              return (
                <a
                  key={c.title}
                  href={c.href}
                  target={c.external ? "_blank" : undefined}
                  rel={c.external ? "noopener noreferrer" : undefined}
                  className="surface group flex flex-col p-5 transition-colors hover:border-border-strong"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-card">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
                    {c.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">
                    {c.body}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-foreground">
                    {c.cta}
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top presets */}
      <section className="border-t border-border/70 bg-subtle/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Most loved
              </p>
              <h2 className="mt-1 text-h2 tracking-tight">
                Top community presets
              </h2>
            </div>
            <Link
              href="/presets"
              className="inline-flex shrink-0 items-center gap-1 text-[13px] text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
            >
              See all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topPresets === undefined ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))
            ) : topPresets.length === 0 ? (
              <div className="col-span-full surface flex flex-col items-center px-6 py-10 text-center">
                <Heart className="size-5 text-muted-foreground" />
                <p className="mt-3 text-[14px] font-medium">No presets yet</p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Be the first — publish one and it'll show up here.
                </p>
                <Button asChild size="sm" className="mt-4">
                  <Link href="/presets/create">
                    Create a preset
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            ) : (
              topPresets.map((p) => (
                <Link
                  key={p._id}
                  href={`/presets/${p._id}`}
                  className="surface group flex flex-col p-5 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-[14.5px] font-semibold tracking-tight">
                      {p.name || "Untitled preset"}
                    </h3>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground">
                      <Heart className="size-3" />
                      {p.likesCount || 0}
                    </span>
                  </div>
                  {p.description && (
                    <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  {p.tool && (
                    <Badge
                      variant="outline"
                      className="mt-auto self-start font-mono text-[10.5px]"
                    >
                      {p.tool}
                    </Badge>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Contribute */}
      <section className="border-t border-border/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-h1-serif text-balance">
              Three ways to{" "}
              <em className="text-muted-foreground">contribute.</em>
            </h2>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONTRIBUTE.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.title}
                  href={c.href}
                  target={c.external ? "_blank" : undefined}
                  rel={c.external ? "noopener noreferrer" : undefined}
                  className="surface group flex flex-col p-5 transition-colors hover:border-border-strong"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-card">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
                    {c.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">
                    {c.body}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-foreground">
                    {c.cta}
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Code of conduct */}
      <section className="border-t border-border/70 bg-subtle/40">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-5 sm:py-20">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            House rules
          </p>
          <h2 className="mt-1 text-h2 tracking-tight">
            Be the person you'd want to share a preset with.
          </h2>
          <ul className="mt-6 space-y-3 text-[14.5px] leading-relaxed text-foreground/85">
            <li className="flex gap-3">
              <span className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-foreground" />
              <span>
                Be specific in bug reports. Include the prompt, the command,
                and what you expected vs. what happened.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-foreground" />
              <span>
                Don't publish presets that do something destructive without
                naming it clearly in the title.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-foreground" />
              <span>
                No harassment, hate speech, or spam. We remove offending
                content and accounts without warning.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-foreground" />
              <span>
                Security issues go to{" "}
                <a
                  href="mailto:security@denoiselabs.com"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  security@denoiselabs.com
                </a>{" "}
                — not public GitHub issues. See the{" "}
                <Link
                  href="/security"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Security page
                </Link>
                .
              </span>
            </li>
          </ul>
        </div>
      </section>

      <Footer />
    </AppShell>
  );
}
