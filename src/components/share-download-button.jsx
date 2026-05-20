"use client";

import { Download } from "lucide-react";
import { downloadFile } from "@/lib/download-file";

/**
 * Client wrapper for the share page's Download CTA.
 *
 * The share page itself is server-rendered (we don't want the public
 * /d/{code} page to be a client component for SEO/perf reasons). This
 * tiny island handles the actual download: it hits /api/d/{code}, gets
 * redirected to a signed Convex storage URL, and force-saves the bytes
 * locally via downloadFile() so the browser opens a real save dialog
 * instead of just navigating to the file.
 */
export function ShareDownloadButton({ code, filename }) {
  const handle = async () => {
    // /api/d/{code} 302-redirects to the signed Convex URL; fetch
    // follows redirects by default. We force-download from there.
    await downloadFile(`/api/d/${code}`, filename);
  };
  return (
    <button
      type="button"
      onClick={handle}
      className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-[14px] font-semibold text-background transition-opacity hover:opacity-90"
    >
      <Download className="size-4" />
      Download
    </button>
  );
}
