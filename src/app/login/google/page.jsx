"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";

/**
 * Google sign-in handoff. Defaults to /dashboard but honors a `next=`
 * query param so callers (notably the /convert/* SEO landing pages and
 * future paywall walls) can route the user back to where they started.
 *
 * `next` is sanitized to same-origin paths to prevent open-redirect
 * abuse — a query value of "https://evil.example/phish" must NOT cause
 * Convex Auth to send the user there after sign-in.
 */
function safeNext(raw) {
  if (!raw) return "/dashboard";
  try {
    // Reject anything that isn't a root-relative path.
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
    // Strip newlines / control chars defensively.
    if (/[\r\n\t]/.test(raw)) return "/dashboard";
    return raw;
  } catch {
    return "/dashboard";
  }
}

export default function LoginGooglePage() {
  const { signIn } = useAuthActions();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  useEffect(() => {
    void signIn("google", { redirectTo: next });
  }, [signIn, next]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting to Google…</p>
    </div>
  );
}
