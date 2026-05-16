/**
 * Polar billing glue shared by the Next.js route handlers + Convex.
 *
 * Translates between (ReFile plan id, region) and Polar product ids. The
 * mapping itself lives in lib/plans.js (each plan/region carries a
 * `productEnv` naming the env var that holds its Polar product id) so there
 * is exactly one source of truth.
 *
 * Free has no Polar product — it's the absence of a subscription.
 */

import { PLAN_IDS, REGIONS, getPlan } from "./plans.js";

/**
 * (plan id, region) → Polar product id from env. Missing env / Free →
 * undefined.
 */
export function productIdForPlan(planId, region) {
  const plan = getPlan(planId, region);
  if (!plan.productEnv) return undefined; // free / unknown
  return process.env[plan.productEnv] || undefined;
}

/**
 * Polar product id → { plan, region }. Reverse of productIdForPlan: scans
 * every (plan, region) pair and matches the configured env value. Anything
 * unmapped → Free / global. The webhook relies on this to know WHICH
 * regional product was bought so it can verify the billing country.
 */
export function planAndRegionForProductId(productId) {
  if (productId) {
    for (const planId of PLAN_IDS) {
      for (const region of REGIONS) {
        const plan = getPlan(planId, region);
        if (plan.productEnv && process.env[plan.productEnv] === productId) {
          return { plan: planId, region };
        }
      }
    }
  }
  return { plan: "free", region: "global" };
}

/** "sandbox" | "production" — defaults to sandbox so we never accidentally
 * touch real money without explicitly opting in. */
export function polarServer() {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

/** Event name the conversions meter filters on. Kept in one place so the
 * ingest call (Convex) and the meter filter (dashboard) can't drift. */
export const CONVERSION_EVENT_NAME =
  process.env.POLAR_CONVERSION_EVENT || "conversion";
