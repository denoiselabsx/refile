import { absoluteUrl } from "@/lib/site";
import {
  DocHeader,
  DocSection,
  DocList,
  DocCallout,
} from "@/components/docs/doc-parts";

export const metadata = {
  title: "Getting started — Docs",
  description:
    "Your first ReFile conversion: sign in, drop a file, describe the outcome, download the result.",
  alternates: { canonical: absoluteUrl("/docs/getting-started") },
};

export default function Page() {
  return (
    <>
      <DocHeader
        eyebrow="Start here"
        title="Your first conversion"
        intro="Sign in, drop a file, say what you want in plain words. ReFile does the rest and hands back the finished file."
      />

      <DocSection title="1. Sign in">
        <p>
          ReFile uses Sign in with Google. We only request your basic
          profile (name, email, avatar) — we can&apos;t see your Drive,
          Gmail, or anything else.
        </p>
      </DocSection>

      <DocSection title="2. Add your file(s)">
        <p>
          Drag a file anywhere on the dashboard, or click the paperclip in
          the prompt box. You can add several files at once — ReFile sees
          all of them.
        </p>
        <DocCallout>
          File-size and batch limits depend on your plan. See{" "}
          <a
            href="/docs/limits-and-plans"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Limits &amp; plans
          </a>
          .
        </DocCallout>
      </DocSection>

      <DocSection title="3. Describe the outcome">
        <p>
          Type what you want in plain language and press{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-mono text-[11px]">
            ↵
          </kbd>
          . You don&apos;t name tools or flags — describe the result:
        </p>
        <DocList
          items={[
            "“Compress this PDF to under 2 MB”",
            "“Convert this MP4 to a 1080p H.264 video”",
            "“Extract the audio as a 192 kbps MP3”",
            "“Remove the background from this photo”",
          ]}
        />
        <p>
          To point at a specific uploaded file, type{" "}
          <code className="text-mono">@</code> and pick it from the list.
        </p>
      </DocSection>

      <DocSection title="4. Download the result">
        <p>
          ReFile shows a short summary of what it did and a{" "}
          <strong>Download</strong> button for each output file. That&apos;s
          it — no terminal, no commands to run yourself.
        </p>
        <DocCallout tone="warn">
          Uploads and outputs are automatically deleted after 24 hours.
          Download what you need; re-run the chat to regenerate.
        </DocCallout>
      </DocSection>

      <DocSection title="If it doesn’t work">
        <p>
          A failed attempt is <strong>never counted</strong> toward your
          usage. Rephrase what you want or adjust the files and try again.
          More in{" "}
          <a
            href="/docs/troubleshooting"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Troubleshooting
          </a>
          .
        </p>
      </DocSection>
    </>
  );
}
