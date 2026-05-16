"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";

/**
 * Pricing-card call to action. Behavior depends on auth + plan:
 *  - Free tier            → sign in (or "You're on Free" if already)
 *  - Paid tier, signed out → sign in, then they'll come back and check out
 *  - Paid tier, signed in  → /api/checkout?plan=…&userId=…&email=… (Polar)
 *  - The plan they're on   → "Current plan" (disabled)
 *
 * The Convex user id is passed to the checkout route as the Polar customer
 * external_id (see app/api/checkout/route.js for why that's safe).
 */
// `region` is accepted for API symmetry with the pricing page but is NOT
// forwarded to checkout: the checkout route re-derives region from the
// request IP server-side (a client-supplied region would be untrusted and
// could steal the India discount). See app/api/checkout/route.js.
export function PricingCta({ planId, region, label, variant, featured }) {
  const { user, isAuthenticated } = useAuth();
  // Resolved only when signed in; used by the "Manage plan" button to open
  // the Polar Customer Portal for this exact customer.
  const polarCustomerId = useQuery(
    api.plans.myPolarCustomerId,
    isAuthenticated ? {} : "skip"
  );

  const cls = `w-full ${featured ? "cta-shimmer" : ""}`;

  if (planId === "free") {
    if (isAuthenticated && user?.plan === "free") {
      return (
        <Button variant="outline" className={cls} size="lg" disabled>
          You&apos;re on Free
        </Button>
      );
    }
    return (
      <Button variant={variant} asChild className={cls} size="lg">
        <Link href={isAuthenticated ? "/dashboard" : "/login/google"}>
          {isAuthenticated ? "Go to app" : label}
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    );
  }

  // Paid tier the user is already on → manage via portal instead of re-buying.
  if (isAuthenticated && user?.plan === planId) {
    return (
      <Button
        variant="outline"
        className={cls}
        size="lg"
        disabled={!polarCustomerId}
        onClick={() => {
          if (polarCustomerId) {
            window.location.href = `/api/portal?customerId=${encodeURIComponent(
              polarCustomerId
            )}`;
          }
        }}
      >
        {polarCustomerId ? "Manage plan" : "Current plan"}
      </Button>
    );
  }

  // Paid tier, signed in → go straight to Polar checkout.
  if (isAuthenticated && user?.id) {
    const qs = new URLSearchParams({
      plan: planId,
      userId: user.id,
      ...(user.email ? { email: user.email } : {}),
    });
    return (
      <Button variant={variant} asChild className={cls} size="lg">
        <Link href={`/api/checkout?${qs.toString()}`}>
          {label}
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    );
  }

  // Paid tier, signed out → sign in first; carry intended plan along.
  return (
    <Button variant={variant} asChild className={cls} size="lg">
      <Link href={`/login/google?next=${encodeURIComponent(`/pricing`)}`}>
        {label}
        <ArrowRight className="size-3.5" />
      </Link>
    </Button>
  );
}
