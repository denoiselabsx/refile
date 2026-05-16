import { absoluteUrl } from "@/lib/site";
import {
  DocHeader,
  DocSection,
  DocCallout,
} from "@/components/docs/doc-parts";

export const metadata = {
  title: "Troubleshooting — Docs",
  description:
    "When a ReFile conversion doesn't work: why it happens, what to do, and what's never charged.",
  alternates: { canonical: absoluteUrl("/docs/troubleshooting") },
};

function QA({ q, children }) {
  return (
    <div className="border-b border-border/60 py-4 last:border-0">
      <p className="text-[15px] font-medium text-foreground">{q}</p>
      <div className="mt-1.5 space-y-2 text-[14px] leading-relaxed text-foreground/80">
        {children}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <DocHeader
        eyebrow="Plans & limits"
        title="Troubleshooting"
        intro="Most issues are quick to fix. The golden rule: a failed or refused attempt never counts toward your usage, so it's safe to just try again."
      />

      <DocSection>
        <QA q="“That one didn’t work out”">
          <p>
            The conversion couldn&apos;t complete. Rephrase what you want
            more specifically (target format, size, quality), or check the
            file isn&apos;t corrupt, then run it again. It wasn&apos;t
            counted.
          </p>
        </QA>

        <QA q="It refused and asked me to do file work instead">
          <p>
            ReFile is purpose-built for files only. It won&apos;t write
            code, answer general questions, or do non-file tasks — by
            design. Give it a file and an outcome and it&apos;ll work.
          </p>
        </QA>

        <QA q="It said it can’t do this in one step">
          <p>
            Every request is one operation. For multi-step work (“convert,
            then compress, then watermark”), do it as separate requests — a
            follow-up reuses the previous output automatically.
          </p>
        </QA>

        <QA q="I hit a limit / upgrade prompt appeared">
          <p>
            You reached a plan limit (monthly conversions, file size, batch
            count, or presets). The upgrade prompt links straight to the
            plan that lifts it. See{" "}
            <a
              href="/docs/limits-and-plans"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Limits &amp; plans
            </a>
            .
          </p>
        </QA>

        <QA q="My download link stopped working">
          <p>
            Files are deleted 24 hours after a run. Open the chat and run
            the request again to regenerate the output.
          </p>
        </QA>

        <QA q="Payment was declined">
          <p>
            Some cards — especially Indian cards — block recurring
            international payments by default. Enable international &amp;
            recurring payments in your bank app, or try a different card.
            If it still fails, email us.
          </p>
        </QA>

        <QA q="An archive extracted but I can’t find the files">
          <p>
            Archives produce names ReFile can&apos;t predict. Tell it what
            the archive contains, or extract first and then act on a
            specific file by name.
          </p>
        </QA>
      </DocSection>

      <DocCallout>
        Still stuck? Email{" "}
        <a
          href="mailto:hello@denoiselabs.com"
          className="text-foreground underline-offset-4 hover:underline"
        >
          hello@denoiselabs.com
        </a>{" "}
        with what you tried — a real person reads every message.
      </DocCallout>
    </>
  );
}
