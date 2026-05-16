/**
 * Single source of truth for ReFile pricing tiers, quotas, and the cost
 * model used to meter real usage.
 *
 * This file is imported by BOTH the Next.js frontend (pricing page, dashboard
 * usage meter) and the Convex backend (quota gate, metering). Keep it free of
 * framework-specific imports so it stays portable.
 *
 * Regional pricing (locked 2026-05-16):
 *   - Two regions: "global" and "IN" (India PPP).
 *   - Quotas/limits are IDENTICAL across regions — only PRICE differs.
 *     India pays less for the same product.
 *   - Global:  Free $0 / Student $4 / Pro $7 / Power $20
 *   - India:   Free $0 / Student $2 / Pro $5 / Power $15
 *   - Quotas (both): Free 15 / Student 100 / Pro 750 / Power 3000 conv/mo
 *   - $0.02 per conversion over the included amount (paid tiers only),
 *     protected by a real-provider-cost floor (see computeOverage).
 *   - File-size caps: 25 MB / 250 MB / 500 MB / 2 GB.
 *
 * Region detection is IP-based (Vercel x-vercel-ip-country) and VERIFIED
 * against Polar's collected billing country in the webhook — a user who
 * buys the India price with a non-IN billing country is downgraded to the
 * global-priced plan. Unknown region → "global" (the higher price).
 */

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** Order matters: used to render the pricing grid left→right and to rank tiers. */
export const PLAN_IDS = ["free", "student", "pro", "power"];

export const REGIONS = ["global", "IN"];
export const DEFAULT_REGION = "global";

/**
 * Per-plan, per-region pricing. `productEnv` names the env var holding the
 * Polar product id for that (plan, region) pair — resolved in lib/polar.js.
 * Free has no product (absence of a subscription).
 */
const PRICING = {
  free: {
    global: { priceMonthly: 0, productEnv: null },
    IN: { priceMonthly: 0, productEnv: null },
  },
  student: {
    global: { priceMonthly: 4, productEnv: "POLAR_PRODUCT_STUDENT" },
    IN: { priceMonthly: 2, productEnv: "POLAR_PRODUCT_STUDENT_IN" },
  },
  pro: {
    global: { priceMonthly: 7, productEnv: "POLAR_PRODUCT_PRO" },
    IN: { priceMonthly: 5, productEnv: "POLAR_PRODUCT_PRO_IN" },
  },
  power: {
    global: { priceMonthly: 20, productEnv: "POLAR_PRODUCT_POWER" },
    IN: { priceMonthly: 15, productEnv: "POLAR_PRODUCT_POWER_IN" },
  },
};

/**
 * Region-independent plan definition: quotas, limits, copy. Price is NOT
 * here — call getPlan(planId, region) to get a plan object with the
 * region-correct `priceMonthly` and `productEnv` merged in.
 */
const PLAN_BASE = {
  free: {
    id: "free",
    name: "Free",
    cadence: "forever",
    tagline: "Trying it out, occasional use.",
    // Hard limits — enforced in convex/prompts.ts + convex/presets.ts.
    includedConversions: 15,
    overagePerConversion: null, // null = hard stop, no pay-as-you-go
    maxFileBytes: 25 * MB,
    maxFilesPerConversion: 1,
    maxPresets: 3,
    historyLimit: 30,
    support: "Community",
  },
  student: {
    id: "student",
    name: "Student",
    cadence: "/mo + pay as you go",
    tagline: "Students and budget users who go over sometimes.",
    includedConversions: 100,
    overagePerConversion: 0.02,
    maxFileBytes: 250 * MB,
    maxFilesPerConversion: 10,
    maxPresets: 25,
    historyLimit: null, // null = unlimited
    support: "Email",
  },
  pro: {
    id: "pro",
    name: "Pro",
    cadence: "per month",
    tagline: "Regular daily users.",
    includedConversions: 750,
    overagePerConversion: 0.02,
    maxFileBytes: 500 * MB,
    maxFilesPerConversion: 25,
    maxPresets: null, // unlimited
    historyLimit: null,
    support: "Email",
  },
  power: {
    id: "power",
    name: "Power",
    cadence: "per month",
    tagline: "Heavy users, large files.",
    includedConversions: 3000,
    overagePerConversion: 0.02,
    maxFileBytes: 2 * GB,
    maxFilesPerConversion: 50,
    maxPresets: null,
    historyLimit: null,
    support: "Priority email",
  },
};

export const DEFAULT_PLAN = "free";

/** Normalize an arbitrary region string to a supported one ("global" fallback). */
export function normalizeRegion(region) {
  return REGIONS.includes(region) ? region : DEFAULT_REGION;
}

/**
 * Resolve a plan for a region. Returns the base definition (quotas/limits)
 * merged with the region-correct price + Polar product env name. Unknown
 * plan → Free; unknown region → global.
 */
export function getPlan(planId, region = DEFAULT_REGION) {
  const id = PLAN_BASE[planId] ? planId : DEFAULT_PLAN;
  const reg = normalizeRegion(region);
  const base = PLAN_BASE[id];
  const price = PRICING[id][reg];
  return { ...base, region: reg, priceMonthly: price.priceMonthly, productEnv: price.productEnv };
}

/** All plans for a region, in display order. For the pricing page. */
export function plansForRegion(region = DEFAULT_REGION) {
  const out = {};
  for (const id of PLAN_IDS) out[id] = getPlan(id, region);
  return out;
}

/**
 * Real cost model. These rates drive the usage breakdown shown in the UI and
 * the "estimated provider cost" used to add a markup at monthly payout.
 *
 * Sources (verify against real invoices before launch — these are public list
 * prices as of 2026-05 and intentionally conservative):
 *   - Groq llama-4-scout-17b: ~$0.11 / 1M input tokens, ~$0.34 / 1M output.
 *   - Modal CPU: ~$0.0000131 per CPU-core-second (we bill wall-clock proxy).
 * The markup is what ReFile adds on top of raw provider cost at payout time.
 */
export const COST = {
  groqInputPerMillionTokens: 0.11,
  groqOutputPerMillionTokens: 0.34,
  modalPerSecond: 0.0000131,
  // Multiplier applied to (groq + modal) provider cost when computing the
  // amount we actually charge for metered/overage usage. 1.30 = 30% markup.
  payoutMarkup: 1.3,
};

/** Groq spend in USD for a given token count. */
export function groqCost(inputTokens, outputTokens) {
  return (
    ((inputTokens || 0) / 1_000_000) * COST.groqInputPerMillionTokens +
    ((outputTokens || 0) / 1_000_000) * COST.groqOutputPerMillionTokens
  );
}

/** Modal spend in USD for a given wall-clock duration in milliseconds. */
export function modalCost(durationMs) {
  return ((durationMs || 0) / 1000) * COST.modalPerSecond;
}

/**
 * Given a plan and a month's metered usage, compute what the user owes beyond
 * their base subscription: overage conversions priced at the plan rate, with a
 * floor of the real provider cost + markup so we never lose money on a heavy
 * conversion even if the per-conversion rate undershoots.
 *
 * Quotas are region-independent, so region only affects the base price, not
 * this calculation — region defaults to global here.
 */
export function computeOverage(planId, usage, region = DEFAULT_REGION) {
  const plan = getPlan(planId, region);
  const conversions = usage?.conversions || 0;
  const extra = Math.max(0, conversions - plan.includedConversions);

  if (extra === 0) return { extraConversions: 0, amountDue: 0 };

  // Hard-stop plans (Free) should never reach here — the quota gate blocks
  // them at submit — but guard anyway.
  if (plan.overagePerConversion == null) {
    return { extraConversions: extra, amountDue: 0 };
  }

  const flatOverage = extra * plan.overagePerConversion;
  const providerCost =
    groqCost(usage?.groqInputTokens, usage?.groqOutputTokens) +
    modalCost(usage?.modalMs);
  const costFloor = providerCost * COST.payoutMarkup;

  return {
    extraConversions: extra,
    amountDue: Math.max(flatOverage, costFloor),
  };
}

export const BYTES = { MB, GB };
