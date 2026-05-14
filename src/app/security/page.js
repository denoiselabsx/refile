import Link from "next/link";
import { ShieldCheck, Lock, Server, Trash2, Eye, Bug } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";

import { absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Security",
  description:
    "How ReFile keeps your files, prompts, and account safe — encryption, sandboxing, deletion, and how to report issues.",
  alternates: { canonical: absoluteUrl("/security") },
  openGraph: {
    title: "Security — ReFile",
    description:
      "How ReFile keeps your files, prompts, and account safe.",
    url: absoluteUrl("/security"),
  },
};

const PILLARS = [
  {
    icon: Lock,
    title: "Encryption in transit & at rest",
    body: "All traffic is TLS 1.2+. Uploaded files and outputs are encrypted at rest by our storage provider. Session cookies are HTTP-only and signed.",
  },
  {
    icon: Server,
    title: "Isolated sandboxed execution",
    body: "Every generated command runs inside an ephemeral, network-restricted container. Your files never share a process or filesystem with another user.",
  },
  {
    icon: Trash2,
    title: "Aggressive deletion",
    body: "Uploaded files and AI outputs are automatically deleted 24 hours after creation. You can delete chat metadata and your account at any time.",
  },
  {
    icon: Eye,
    title: "No model training on your data",
    body: "We do not use your prompts, files, or outputs to train AI models. Our model vendors operate under zero-retention or short-retention agreements.",
  },
  {
    icon: ShieldCheck,
    title: "Minimal scopes",
    body: "Google sign-in requests only basic profile and email. ReFile cannot read your Drive, Gmail, or anything else.",
  },
  {
    icon: Bug,
    title: "Responsible disclosure",
    body: "Found something? Email security@denoiselabs.com. We respond within 72 hours and publicly thank reporters of valid issues.",
  },
];

export default function SecurityPage() {
  return (
    <AppShell mode="marketing">
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-14 sm:pt-20">
        <header className="border-b border-border pb-8">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Legal
          </p>
          <h1 className="text-h1-serif mt-2 text-balance">Security</h1>
          <p className="mt-3 text-[14px] text-muted-foreground">
            How we keep your files, prompts, and account safe.
          </p>
        </header>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {PILLARS.map((p) => {
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
        </div>

        <section id="report" className="mt-12 scroll-mt-24">
          <h2 className="text-[18px] font-semibold tracking-tight">
            Reporting a vulnerability
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-foreground/85">
            Please email{" "}
            <a
              href="mailto:security@denoiselabs.com"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              security@denoiselabs.com
            </a>{" "}
            with steps to reproduce. Do not publicly disclose until we've had a
            reasonable window to fix the issue (typically 30 days). We do not
            currently run a paid bounty, but we credit reporters of valid issues.
          </p>
        </section>

        <div className="mt-14 flex flex-wrap items-center gap-4 border-t border-border pt-8 text-[13px] text-muted-foreground">
          <Link href="/terms" className="underline-offset-4 hover:text-foreground hover:underline">
            Terms of Service
          </Link>
          <Link href="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
          <Link href="/" className="ml-auto underline-offset-4 hover:text-foreground hover:underline">
            ← Back to ReFile
          </Link>
        </div>
      </article>

    </AppShell>
  );
}
