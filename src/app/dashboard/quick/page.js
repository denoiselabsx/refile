/**
 * /dashboard/quick → /convert (permanent redirect).
 *
 * The deterministic Quick Convert experience used to live behind auth
 * here. Once /convert went public it became a duplicate — same recipes,
 * same UI, same backend. The right URL is /convert (it's where
 * search-driven traffic lands and the sidebar already links there), so
 * we redirect old bookmarks instead of keeping two copies of the page
 * in sync.
 *
 * Server-side redirect so it's an HTTP 308 — preserves any analytics
 * referrer chain and Google forwards link equity to the canonical URL.
 */

import { redirect } from "next/navigation";

export default function QuickConvertLegacyRedirect() {
  redirect("/convert");
}
