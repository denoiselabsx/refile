import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";

import { absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How ReFile collects, uses, and protects your data — files, prompts, account info, and analytics.",
  alternates: { canonical: absoluteUrl("/privacy") },
  openGraph: {
    title: "Privacy Policy — ReFile",
    description: "How ReFile collects, uses, and protects your data.",
    url: absoluteUrl("/privacy"),
  },
};

const SECTIONS = [
  {
    id: "summary",
    title: "Plain-English summary",
    body: [
      "We store the minimum we need to run the Service: your Google account profile (name, email, avatar), the prompts you write, the AI-generated commands, and your uploaded files.",
      "Uploaded files and generated outputs are deleted automatically 24 hours after they're created.",
      "We do not sell your data. We do not train models on your files.",
    ],
  },
  {
    id: "data-we-collect",
    title: "1. Data we collect",
    body: [
      "Account: your name, email, profile picture, and Google account ID (received from Google sign-in).",
      "Content: files you upload, prompts you type or speak, AI-generated commands, output files, and the metadata around each chat turn (status, timestamps, file names).",
      "Voice: when you use voice input, the raw audio is sent to our transcription provider and to ReFile's API only to produce the text. We do not retain the audio.",
      "Usage: standard server logs (IP, user agent, request paths, timing) for security, billing, and debugging.",
      "Cookies: a session cookie to keep you signed in. We do not use third-party advertising trackers.",
    ],
  },
  {
    id: "how-we-use",
    title: "2. How we use it",
    body: [
      "To run the Service — accept uploads, generate commands, execute them in a sandbox, hand back outputs.",
      "To keep you signed in and prevent abuse.",
      "To debug failures and improve quality. Aggregated, non-identifying metrics may be used to understand which tools and prompts are most useful.",
      "We do not use your prompts, files, or outputs to train AI models.",
    ],
  },
  {
    id: "sub-processors",
    title: "3. Sub-processors",
    body: [
      "We rely on a small set of vendors to operate ReFile. Each handles a narrow slice of data:",
      "• Google — sign-in (authentication only).",
      "• Convex — application database and file storage (encrypted at rest).",
      "• Modal / Vercel Sandbox — sandboxed shell execution (transient; no persistence).",
      "• OpenAI / Anthropic / Google AI — generation of commands and chat replies from your prompts.",
      "• Vercel — hosting, edge networking, logging.",
      "Each vendor only sees what's necessary for its function.",
    ],
  },
  {
    id: "retention",
    title: "4. Retention",
    body: [
      "Uploaded files and AI outputs: deleted automatically 24 hours after creation.",
      "Chat metadata (prompt text, command, status, file names): retained until you delete the chat or your account.",
      "Account data: retained while your account is active; deleted within 30 days of an account-deletion request.",
      "Server logs: typically rotated within 30 days.",
    ],
  },
  {
    id: "your-rights",
    title: "5. Your rights",
    body: [
      "You can view your chats and delete any of them from the sidebar. You can request a copy of your account data or full deletion by emailing the address below.",
      "Depending on where you live, you may have additional rights (access, correction, portability, objection) under laws like the GDPR (EU/UK) or CCPA (California). We honor all of them.",
    ],
  },
  {
    id: "security",
    title: "6. Security",
    body: [
      "All connections use TLS. Files are stored encrypted at rest. Shell execution happens inside isolated sandboxes — never on shared infrastructure with other users. See our Security page for more.",
    ],
  },
  {
    id: "transfers",
    title: "7. International transfers",
    body: [
      "Our servers and sub-processors are located in the United States and the European Union. By using the Service you consent to your data being processed in those regions.",
    ],
  },
  {
    id: "children",
    title: "8. Children",
    body: [
      "ReFile is not intended for children under 13 (or the minimum age in your country). We do not knowingly collect data from anyone in that age range.",
    ],
  },
  {
    id: "changes",
    title: "9. Changes to this policy",
    body: [
      "We'll post any updates here with a new “last updated” date. Material changes will be communicated by email or an in-app notice.",
    ],
  },
  {
    id: "contact",
    title: "10. Contact",
    body: [
      "Privacy questions or requests: privacy@denoiselabs.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <AppShell mode="marketing">
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-14 sm:pt-20">
        <header className="border-b border-border pb-8">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Legal
          </p>
          <h1 className="text-h1-serif mt-2 text-balance">Privacy Policy</h1>
          <p className="mt-3 text-[14px] text-muted-foreground">
            Last updated 14 May 2026 · Operated by Denoise Labs
          </p>
        </header>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-[18px] font-semibold tracking-tight">
                {s.title}
              </h2>
              <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-foreground/85">
                {s.body.map((p, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-4 border-t border-border pt-8 text-[13px] text-muted-foreground">
          <Link href="/terms" className="underline-offset-4 hover:text-foreground hover:underline">
            Terms of Service
          </Link>
          <Link href="/security" className="underline-offset-4 hover:text-foreground hover:underline">
            Security
          </Link>
          <Link href="/" className="ml-auto underline-offset-4 hover:text-foreground hover:underline">
            ← Back to ReFile
          </Link>
        </div>
      </article>

    </AppShell>
  );
}
