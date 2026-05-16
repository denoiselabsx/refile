/**
 * Single source of truth for ReFile pricing tiers, quotas, and the cost
 * model used to meter real usage.
 *
 * This file is imported by BOTH the Next.js frontend (pricing page, dashboard
 * usage meter) and the Convex backend (quota gate, metering). Keep it free of
 * framework-specific imports so it stays portable.
 *
 * Numbers locked with the product owner on 2026-05-16:
 *   Free 15 / Student 100 / Pro 750 / Power 3000 conversions per month.
 *   $0.02 per conversion over the included amount (paid tiers only).
 *   File-size caps: 25 MB / 250 MB / 500 MB / 2 GB.
 */

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** Order matters: used to render the pricing grid left→right and to rank tiers. */
export const PLAN_IDS = ["free", "student", "pro", "power"];

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
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
    priceMonthly: 2,
    cadence: "per month + pay-as-you-go",
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
    priceMonthly: 5,
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
    priceMonthly: 15,
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

/** Resolve a plan object from an id, falling back to Free for unknown/null. */
export function getPlan(planId) {
  return PLANS[planId] || PLANS[DEFAULT_PLAN];
}

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
 */
export function computeOverage(planId, usage) {
  const plan = getPlan(planId);
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
