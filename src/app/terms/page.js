import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { Footer } from "@/components/shell/footer";
import { absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "Terms of Service",
  description:
    "The agreement that governs your use of ReFile — what you can do, what we promise, and the limits of our service.",
  alternates: { canonical: absoluteUrl("/terms") },
  openGraph: {
    title: "Terms of Service — ReFile",
    description:
      "Read the terms governing your use of ReFile, by Denoise Labs.",
    url: absoluteUrl("/terms"),
  },
};

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance",
    body: [
      "By signing in or using ReFile (the “Service”) you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the Service.",
      "The Service is operated by Denoise Labs (“we”, “us”). These terms form a binding agreement between you and Denoise Labs.",
    ],
  },
  {
    id: "account",
    title: "2. Your account",
    body: [
      "You sign in with Google. You're responsible for keeping that Google account secure. You may not share your account or use someone else's account without permission.",
      "You must be at least 13 years old (or the minimum age in your country) to use ReFile.",
    ],
  },
  {
    id: "use",
    title: "3. Acceptable use",
    body: [
      "You agree not to use ReFile to: (a) process files you don't have the legal right to process; (b) generate, distribute, or store unlawful, infringing, or harmful content; (c) attempt to break, abuse, reverse-engineer, or interfere with the sandbox, rate limits, or other users' access; (d) use the Service to build a competing product by scraping our outputs at scale.",
      "We may suspend or terminate accounts that violate these rules.",
    ],
  },
  {
    id: "content",
    title: "4. Your content",
    body: [
      "You retain ownership of the files you upload and the outputs ReFile produces from them. You grant us a limited license to store, process, and transform those files solely to provide the Service to you.",
      "Uploads and outputs are automatically deleted after 24 hours. Chat metadata (the prompt you typed, the command generated, file names) is retained with your account until you delete the chat.",
    ],
  },
  {
    id: "ai",
    title: "5. AI-generated commands",
    body: [
      "ReFile uses large language models to generate shell commands which are executed in an isolated sandbox. We show you every command that runs. The Service is provided “as is”; commands can be wrong, lossy, or fail. You are responsible for reviewing outputs before relying on them.",
      "Do not upload anything you cannot afford to lose.",
    ],
  },
  {
    id: "fees",
    title: "6. Fees & free tier",
    body: [
      "While in public preview, the core service is free with reasonable usage limits. We may introduce paid plans; we will give existing users notice before applying new charges.",
    ],
  },
  {
    id: "termination",
    title: "7. Termination",
    body: [
      "You can stop using ReFile at any time. You can request account deletion by emailing the address below. We can suspend or terminate access for violations of these terms, or to comply with the law.",
    ],
  },
  {
    id: "disclaimer",
    title: "8. Disclaimer & limitation of liability",
    body: [
      "TO THE FULLEST EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS WITHOUT WARRANTIES OF ANY KIND. WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, OR LOST DATA, PROFITS, OR REVENUE.",
      "Our aggregate liability for any claim arising out of the Service is limited to the amount you have paid us in the 12 months preceding the claim, or USD 50, whichever is greater.",
    ],
  },
  {
    id: "changes",
    title: "9. Changes",
    body: [
      "We may update these terms occasionally. We'll post the new version at this URL with an updated date. Continued use after a change means you accept the revised terms.",
    ],
  },
  {
    id: "contact",
    title: "10. Contact",
    body: [
      "Questions about these terms: hello@denoiselabs.com.",
    ],
  },
];

export default function TermsPage() {
  return (
    <AppShell mode="marketing">
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-14 sm:pt-20">
        <header className="border-b border-border pb-8">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Legal
          </p>
          <h1 className="text-h1-serif mt-2 text-balance">Terms of Service</h1>
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
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-4 border-t border-border pt-8 text-[13px] text-muted-foreground">
          <Link href="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
          <Link href="/security" className="underline-offset-4 hover:text-foreground hover:underline">
            Security
          </Link>
          <Link href="/" className="ml-auto underline-offset-4 hover:text-foreground hover:underline">
            ← Back to ReFile
          </Link>
        </div>
      </article>
      <Footer />
    </AppShell>
  );
}
