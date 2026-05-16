import { Webhooks } from "@polar-sh/nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { planAndRegionForProductId } from "../../../../../lib/polar.js";
import { regionFromCountry } from "../../../../../lib/region.js";

export const runtime = "nodejs";

/**
 * Polar webhook → Convex. THE source of truth for plan AND region.
 *
 * @polar-sh/nextjs Webhooks() verifies the Polar signature before any
 * handler runs, so payloads here are authentic. We then:
 *
 *   1. product id → { plan, region }   (planAndRegionForProductId)
 *   2. customer external_id → Convex user id  (set at checkout)
 *   3. Polar's collected BILLING COUNTRY → expected region
 *   4. region-abuse check: if the user bought an India-priced product but
 *      their billing country isn't India, that's the IP-spoof case the
 *      design calls out. Polar already charged the India price (we can't
 *      undo that), so the enforcement is: set their stored region to
 *      "global" + flag it, so renewals/overage bill at the global rate and
 *      it's visible for review. (Quotas are identical, so this is purely a
 *      pricing-integrity action, not a feature downgrade.)
 *   5. call the secret-guarded Convex bridge mutation.
 *
 * Field access is defensive — the exact Polar TS subscription schema isn't
 * pinned, so readSubscription tolerates camelCase/snake_case drift.
 */

function convexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  return new ConvexHttpClient(url);
}

function readSubscription(sub) {
  if (!sub) return null;
  const customer = sub.customer ?? {};
  const billing =
    customer.billingAddress ??
    customer.billing_address ??
    sub.customerBillingAddress ??
    sub.billingAddress ??
    {};
  const externalId =
    customer.externalId ?? sub.customerExternalId ?? sub.externalCustomerId;
  const productId = sub.productId ?? sub.product?.id;
  const periodEndRaw = sub.currentPeriodEnd ?? sub.current_period_end;
  return {
    externalId: externalId ? String(externalId) : null,
    productId: productId ? String(productId) : null,
    subscriptionId: sub.id ? String(sub.id) : undefined,
    customerId: customer.id ? String(customer.id) : undefined,
    status: sub.status ? String(sub.status) : undefined,
    periodEnd: periodEndRaw ? new Date(periodEndRaw).getTime() : undefined,
    billingCountry: billing.country ? String(billing.country) : null,
  };
}

async function syncSubscription(sub, { downgrade = false } = {}) {
  const s = readSubscription(sub);
  if (!s || !s.externalId) {
    console.error(
      "[polar webhook] subscription with no external customer id; cannot map to a user",
      { subscriptionId: s?.subscriptionId }
    );
    return;
  }

  if (downgrade) {
    // Access ended → Free, region irrelevant.
    await convexClient().mutation(api.plans.applyPolarSubscription, {
      secret: process.env.POLAR_WEBHOOK_BRIDGE_SECRET,
      externalUserId: s.externalId,
      plan: "free",
      region: "global",
      regionMismatch: false,
      polarCustomerId: s.customerId,
      polarSubscriptionId: s.subscriptionId,
      polarSubscriptionStatus: "canceled",
      polarCurrentPeriodEnd: s.periodEnd,
    });
    return;
  }

  const { plan, region: productRegion } = planAndRegionForProductId(
    s.productId
  );

  // What region does Polar's collected billing country imply?
  const billingRegion = regionFromCountry(s.billingCountry);

  // Abuse case: bought an India-priced product from a non-India billing
  // country. Bill them as global going forward + flag.
  const regionMismatch =
    productRegion === "IN" && billingRegion !== "IN";
  const effectiveRegion = regionMismatch ? "global" : productRegion;

  if (regionMismatch) {
    console.warn(
      "[polar webhook] region mismatch: India-priced product bought with " +
        `billing country "${s.billingCountry}". Billing region forced to ` +
        "global.",
      { subscriptionId: s.subscriptionId, externalId: s.externalId }
    );
  }

  await convexClient().mutation(api.plans.applyPolarSubscription, {
    secret: process.env.POLAR_WEBHOOK_BRIDGE_SECRET,
    externalUserId: s.externalId,
    plan,
    region: effectiveRegion,
    regionMismatch,
    polarCustomerId: s.customerId,
    polarSubscriptionId: s.subscriptionId,
    polarSubscriptionStatus: s.status,
    polarCurrentPeriodEnd: s.periodEnd,
  });
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET,

  onSubscriptionActive: async (payload) => {
    await syncSubscription(payload.data);
  },
  onSubscriptionUpdated: async (payload) => {
    await syncSubscription(payload.data);
  },
  onSubscriptionCanceled: async (payload) => {
    // Canceled but active until period end — keep plan, record status.
    await syncSubscription(payload.data);
  },
  onSubscriptionRevoked: async (payload) => {
    await syncSubscription(payload.data, { downgrade: true });
  },
});
