import Link from "next/link";
import { Download, AlertTriangle, Clock, FileText } from "lucide-react";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic"; // share state changes per visit
export const runtime = "nodejs";

export async function generateMetadata({ params }) {
  const { code } = await params;
  // We don't fetch the meta for OG/Twitter cards because the share
  // link might be expired or revoked; show a generic title and let the
  // page itself say what's going on.
  return {
    title: "Shared file — ReFile",
    description: "A file shared from ReFile. Available for 24 hours.",
    robots: { index: false, follow: false }, // share links are not for indexing
    alternates: { canonical: absoluteUrl(`/d/${code}`) },
  };
}

async function fetchShare(code) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  try {
    const client = new ConvexHttpClient(url);
    return await client.query(api.shareLinks.getPublic, { shortCode: code });
  } catch {
    return null;
  }
}

function fmtBytes(b) {
  if (!b) return "—";
  if (b >= 1024 * 1024 * 1024) return `${(b / 1024 ** 3).toFixed(2)} GB`;
  if (b >= 1024 * 1024) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

function fmtRemaining(expiresAt) {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h <= 0) return `${m} minute${m === 1 ? "" : "s"}`;
  return `${h}h ${m}m`;
}

export default async function SharePage({ params }) {
  const { code } = await params;
  const share = await fetchShare(code);

  // Common chrome — top brand link, footer.
  const Frame = ({ children }) => (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="font-serif text-[20px] tracking-tight text-foreground"
          >
            ReFile
          </Link>
          <Link
            href="/?ref=share"
            className="text-[12.5px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            What is ReFile? →
          </Link>
        </div>
      </header>
      <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-16">
        {children}
      </section>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3 text-[11.5px] text-muted-foreground">
          <span>Converted with ReFile · files auto-delete after 24h</span>
          <Link
            href="/security"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            How this works
          </Link>
        </div>
      </footer>
    </main>
  );

  if (!share) {
    return (
      <Frame>
        <AlertTriangle className="size-8 text-muted-foreground" />
        <h1 className="mt-4 text-balance text-center font-serif text-2xl">
          This link isn't valid
        </h1>
        <p className="mt-3 max-w-prose text-center text-[14px] text-muted-foreground">
          The link may have been mistyped, or the file has already been
          deleted. Files on ReFile are removed automatically 24 hours
          after creation.
        </p>
        <Link
          href="/?ref=share-broken"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-[13.5px] font-medium text-background hover:opacity-90"
        >
          Try ReFile yourself
        </Link>
      </Frame>
    );
  }

  if (share.revoked || share.expired || !share.filePresent) {
    const reason = share.revoked
      ? "The sender revoked this link."
      : "This link has expired. Files are kept for 24 hours after creation, then deleted.";
    return (
      <Frame>
        <Clock className="size-8 text-muted-foreground" />
        <h1 className="mt-4 text-balance text-center font-serif text-2xl">
          File no longer available
        </h1>
        <p className="mt-3 max-w-prose text-center text-[14px] text-muted-foreground">
          {reason}
        </p>
        <Link
          href="/?ref=share-expired"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-[13.5px] font-medium text-background hover:opacity-90"
        >
          Try ReFile yourself
        </Link>
      </Frame>
    );
  }

  // Live link: render the download card.
  const remaining = fmtRemaining(share.expiresAt);
  return (
    <Frame>
      <div className="flex w-full flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <FileText className="size-8 text-muted-foreground" />
        <h1 className="mt-4 max-w-full truncate text-balance font-serif text-2xl">
          {share.filename}
        </h1>
        <p className="mt-2 text-[12.5px] text-muted-foreground">
          {fmtBytes(share.sizeBytes)} · expires in {remaining}
        </p>

        {/* Download — server route re-signs the storage URL on each
            click so the download keeps working for the full 24h. */}
        <a
          href={`/api/d/${share.shortCode}`}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-[14px] font-semibold text-background transition-opacity hover:opacity-90"
        >
          <Download className="size-4" />
          Download
        </a>

        <p className="mt-4 max-w-prose text-[11.5px] leading-relaxed text-muted-foreground">
          This file was generated by ReFile, an AI that turns
          natural-language file requests into safe sandboxed commands.
          Files are deleted automatically after 24 hours.
        </p>
      </div>
    </Frame>
  );
}
