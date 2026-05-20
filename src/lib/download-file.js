"use client";

/**
 * Force-download a file from a (typically cross-origin) URL.
 *
 * The native `<a download>` attribute is silently ignored when the href
 * is cross-origin (Convex storage runs on a different host), which is
 * why "Download" buttons end up opening the file in a new tab instead
 * of saving it. To force a real save dialog we fetch the URL into a
 * Blob and trigger an anchor click against an object-URL — same origin
 * as the page, so the download attribute is honored.
 *
 * The fetch will succeed across origins as long as the storage host
 * sends permissive CORS headers (Convex does). If anything goes wrong
 * we fall back to opening the URL in a new tab so the user can save it
 * manually — better than a silent failure.
 *
 * Returns a Promise that resolves to true on success, false if we hit
 * the fallback path.
 */
export async function downloadFile(url, filename) {
  if (!url) return false;
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || "download";
    // Required for the click to register reliably in some browsers.
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after a short delay so the click has time to start the
    // save. 1s is plenty in every browser I know of.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return true;
  } catch {
    // Fallback: navigate the current tab to the URL. Most browsers
    // will then either render it (for previewable types) or trigger a
    // download (for everything else). Either way the user isn't left
    // with nothing.
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      /* ignore */
    }
    return false;
  }
}
