import { NextResponse } from "next/server";
import { Checkout } from "@polar-sh/nextjs";
import { productIdForPlan, polarServer } from "../../../../lib/polar.js";
import { regionFromHeaders } from "../../../../lib/region.js";

export const runtime = "nodejs";

/**
 * Starts a Polar checkout for a paid plan.
 *
 * Called as a redirect from the pricing page / usage meter:
 *   /api/checkout?plan=pro&userId=<convexUserId>&email=<email>
 *
 * Two trust boundaries to keep straight:
 *
 *  1. Identity — the app uses Convex Auth's CLIENT provider, so this route
 *     can't read the session. The client passes its own Convex user id; it
 *     becomes the Polar customer external_id so the signature-verified
 *     webhook can map the subscription back. A forged userId still has to
 *     pay, so no unpaid upgrade is possible.
 *
 *  2. REGION — deliberately NOT taken from the query string. A client could
 *     pass region=IN to steal the India discount. We re-derive region from
 *     the request IP (Vercel x-vercel-ip-country) server-side here, and the
 *     webhook independently verifies it against Polar's collected billing
 *     country (mismatch → downgraded to the global plan). IP + billing
 *     country must agree for the India price to stick.
 */
export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const plan = searchParams.get("plan");
  const userId = searchParams.get("userId");
  const email = searchParams.get("email") || undefined;

  // Region from IP — never from the caller.
  const region = regionFromHeaders(req.headers);

  const productId = productIdForPlan(plan, region);
  if (!productId) {
    // Free has no product; unknown plan or unconfigured product env.
    return NextResponse.redirect(`${origin}/pricing?error=invalid_plan`);
  }
  if (!userId) {
    return NextResponse.redirect(`${origin}/login/google`);
  }

  const handler = Checkout({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server: polarServer(),
    successUrl: `${origin}/dashboard?upgraded=1`,
  });

  // Build the URL the @polar-sh/nextjs Checkout() handler expects. We strip
  // our own params (plan/userId/email) and set the ones the adapter reads.
  const url = new URL(req.url);
  url.search = ""; // start clean — our inbound params aren't what Polar wants
  url.searchParams.set("products", productId);
  url.searchParams.set("customerExternalId", userId);
  if (email) url.searchParams.set("customerEmail", email);
  // Force Polar to collect a billing address so the webhook can verify the
  // billing country against the region this product is priced for.
  url.searchParams.set("requireBillingAddress", "true");
  // Carry plan + region + userId so the webhook can cross-check intent.
  // Pass raw JSON: URLSearchParams serialization URL-encodes it exactly
  // once, which is the "URL-encoded JSON string" the adapter expects. A
  // manual encodeURIComponent here would double-encode and the adapter's
  // JSON.parse would fail on the leading '%'.
  url.searchParams.set("metadata", JSON.stringify({ plan, region, userId }));

  // Hand a clean GET Request to the adapter. Re-wrapping the original
  // `req` (new Request(url, req)) can carry over state that makes the
  // adapter emit an invalid response (RangeError: Invalid status code: 0).
  return handler(new Request(url, { method: "GET", headers: req.headers }));
}
