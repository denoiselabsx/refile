"use client";

/**
 * Client-side analytics helper. Wraps Convex's events.log mutation behind a
 * fire-and-forget `track(name, props)` so component code doesn't have to
 * import the Convex client or know about auth.
 *
 * Anonymous tracking: a UUID is generated once per browser and kept in
 * localStorage so a single visitor's pre-signup events stitch together.
 * After login, `userId` is stamped server-side by events.log and the
 * `anonId` is ignored — they share a single visitor identity from then on.
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const ANON_KEY = "refile_anon_id";

function anonId() {
  if (typeof window === "undefined") return undefined;
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id =
        globalThis.crypto?.randomUUID?.() ??
        `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

let httpClient = null;
function client() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  if (!httpClient) httpClient = new ConvexHttpClient(url);
  return httpClient;
}

/**
 * Fire-and-forget. Never throws — analytics must never break the page.
 * For authenticated users we still call the HTTP client unauthenticated;
 * the server stamps userId from the request session when present, and
 * otherwise records anonId. This keeps the call cheap (no React hook
 * needed at every call site).
 */
export function track(name, props) {
  try {
    const c = client();
    if (!c) return;
    c.mutation(api.events.log, {
      name,
      anonId: anonId(),
      props: props ?? undefined,
    }).catch(() => {});
  } catch {
    /* no-op */
  }
}
