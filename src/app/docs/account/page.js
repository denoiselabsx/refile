import Link from "next/link";
import { absoluteUrl } from "@/lib/site";
import {
  DocHeader,
  DocSection,
  DocCallout,
} from "@/components/docs/doc-parts";

export const metadata = {
  title: "Account & data — Docs",
  description:
    "How ReFile sign-in, sessions, and data deletion work. Google sign-in, scoped permissions, 24-hour file retention.",
  alternates: { canonical: absoluteUrl("/docs/account") },
};

export default function Page() {
  return (
    <>
      <DocHeader
        eyebrow="Account"
        title="Account & data"
        intro="What we access, how sessions work, and how to delete everything."
      />

      <DocSection title="Google sign-in">
        <p>
          ReFile uses Sign in with Google and requests only your basic
          profile — name, email, avatar. We <strong>cannot</strong> read
          your Drive, Gmail, or any other Google data.
        </p>
      </DocSection>

      <DocSection title="Sessions">
        <p>
          Your session is a signed, HTTP-only cookie. It persists from your
          last activity and clears when you sign out.
        </p>
      </DocSection>

      <DocSection title="What we store">
        <p>
          Your chat history (requests and result summaries) and your plan /
          usage. Uploaded and generated <strong>files</strong> are deleted
          automatically <strong>24 hours</strong> after a run — only the
          history text remains so you can re-run.
        </p>
      </DocSection>

      <DocSection title="Deleting your data">
        <p>
          Delete individual chats from the history sidebar. For full account
          deletion, email{" "}
          <a
            href="mailto:privacy@denoiselabs.com"
            className="text-foreground underline-offset-4 hover:underline"
          >
            privacy@denoiselabs.com
          </a>{" "}
          — everything is wiped within 30 days.
        </p>
      </DocSection>

      <DocCallout>
        Full details are in the{" "}
        <Link
          href="/privacy"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link
          href="/terms"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Terms
        </Link>
        .
      </DocCallout>
    </>
  );
}
