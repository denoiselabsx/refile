import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

/**
 * Public download endpoint for share links.
 *
 *   - Resolves the share row server-side (so the raw Convex storage URL
 *     never leaves our domain — clients only see /api/d/{code}).
 *   - Re-signs on every hit so the link survives the underlying storage
 *     URL's short TTL.
 *   - Bumps view count + fires `share_link_viewed` analytics via a
 *     fire-and-forget mutation.
 *   - 30x redirects to the signed Convex URL; the browser's default
 *     download UI (with the original filename via Content-Disposition
 *     on the storage side) takes over from there.
 */

export const runtime = "nodejs";
// Don't cache — each visit gets a fresh signed URL and a view bump.
export const dynamic = "force-dynamic";

export async function GET(_req, ctx) {
  const { code } = await ctx.params;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const client = new ConvexHttpClient(convexUrl);

  let resolved;
  try {
    resolved = await client.query(api.shareLinks.resolveForDownload, {
      shortCode: code,
    });
  } catch {
    resolved = { ok: false, reason: "error" };
  }

  if (!resolved?.ok) {
    // Redirect to the share page so the visitor sees the explanation
    // (expired / revoked / deleted) rather than a JSON error.
    return NextResponse.redirect(new URL(`/d/${code}`, _req.url));
  }

  // Fire-and-forget view bump — we don't wait for it.
  client
    .mutation(api.shareLinks.bumpView, { shortCode: code })
    .catch(() => {});

  return NextResponse.redirect(resolved.url, { status: 302 });
}
