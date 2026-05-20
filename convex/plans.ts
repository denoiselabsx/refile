import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import {
  DEFAULT_PLAN,
  getPlan,
  plansForRegion,
  normalizeRegion,
  groqCost,
  modalCost,
  computeOverage,
} from "../lib/plans.js";

// API free-tier caps. Smaller than the web Free plan so heavy users
// don't ride the API trial indefinitely. Once a payment method is on
// file, plan-level limits (assertWithinQuota) take over.
export const API_FREE_TRIAL_JOBS = 20;
export const API_FREE_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const API_FREE_MAX_FILES = 1;

/** Current month bucket key, UTC, e.g. "2026-05". Must match metering. */
export function monthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

/** Resolve a user's plan id; absence of a row = Free. */
export async function planIdForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<string> {
  const row = await ctx.db
    .query("userPlans")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return row?.plan ?? DEFAULT_PLAN;
}

/** The user's billing region ("global" | "IN"). Absent row/field → global.
 * Quotas don't depend on this — only the displayed/charged price does. */
export async function regionForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<string> {
  const row = await ctx.db
    .query("userPlans")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return row?.region ?? "global";
}

/** This month's usage row for a user, or a zeroed shape if none yet. */
export async function usageForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  month = monthKey()
) {
  const row = await ctx.db
    .query("userUsage")
    .withIndex("by_user_month", (q) =>
      q.eq("userId", userId).eq("month", month)
    )
    .unique();
  return (
    row ?? {
      userId,
      month,
      conversions: 0,
      groqInputTokens: 0,
      groqOutputTokens: 0,
      modalMs: 0,
      bytesProcessed: 0,
    }
  );
}

/**
 * Quota gate. Throws a user-facing Error if the request would exceed the
 * user's plan. Called from prompts.submit BEFORE a job is created so we never
 * count or charge for a rejected request.
 */
export async function assertWithinQuota(
  ctx: MutationCtx,
  userId: Id<"users">,
  fileCount: number,
  totalBytes: number
) {
  const planId = await planIdForUser(ctx, userId);
  const plan = getPlan(planId);
  const usage = await usageForUser(ctx, userId);

  // File count per conversion.
  if (fileCount > plan.maxFilesPerConversion) {
    throw new Error(
      `[[UPGRADE:batch:${planId}]] Your ${plan.name} plan allows ` +
        `${plan.maxFilesPerConversion} file(s) per conversion. This request ` +
        `has ${fileCount}. Upgrade for bigger batch conversions.`
    );
  }

  // File size cap (largest single file; totalBytes is the sum, but we cap the
  // per-file max — caller passes the max single-file size as totalBytes when
  // fileCount === 1; for batches we cap the sum to keep it simple and safe).
  if (totalBytes > plan.maxFileBytes) {
    const cap =
      plan.maxFileBytes >= 1024 * 1024 * 1024
        ? `${Math.round(plan.maxFileBytes / (1024 * 1024 * 1024))} GB`
        : `${Math.round(plan.maxFileBytes / (1024 * 1024))} MB`;
    throw new Error(
      `[[UPGRADE:filesize:${planId}]] Your ${plan.name} plan caps files at ` +
        `${cap}. Upgrade to convert larger files.`
    );
  }

  // Monthly conversion quota. Hard stop for Free; paid plans flow into
  // metered overage (allowed here, billed at payout).
  if (usage.conversions >= plan.includedConversions) {
    if (plan.overagePerConversion == null) {
      throw new Error(
        `[[UPGRADE:conversions:${planId}]] You've used all ` +
          `${plan.includedConversions} free conversions this month. ` +
          `Upgrade for more — and pay-as-you-go after that.`
      );
    }
    // Paid plan over quota → allowed, will accrue overage. No throw.
  }
}

/** Enforce the per-plan saved-preset cap. Used by presets.create. */
export async function assertCanCreatePreset(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  const planId = await planIdForUser(ctx, userId);
  const plan = getPlan(planId);
  if (plan.maxPresets == null) return; // unlimited

  const mine = await ctx.db
    .query("presets")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  if (mine.length >= plan.maxPresets) {
    throw new Error(
      `[[UPGRADE:presets:${planId}]] Your ${plan.name} plan allows ` +
        `${plan.maxPresets} saved presets. Upgrade for unlimited presets.`
    );
  }
}

/**
 * Internal metering. Called from runJob ONLY after a conversion completes
 * successfully. Upserts the (user, month) row, incrementing every counter.
 */
export const recordConversion = internalMutation({
  args: {
    userId: v.id("users"),
    groqInputTokens: v.number(),
    groqOutputTokens: v.number(),
    modalMs: v.number(),
    bytesProcessed: v.number(),
    // How many conversions this run consumes. 1 for a single command; for a
    // multi-step pipeline it's the step count (each step = 1 conversion).
    // Token/modal/byte totals are passed already-summed and counted once.
    conversions: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const month = monthKey();
    const inc = args.conversions ?? 1;
    const existing = await ctx.db
      .query("userUsage")
      .withIndex("by_user_month", (q) =>
        q.eq("userId", args.userId).eq("month", month)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        conversions: existing.conversions + inc,
        groqInputTokens: existing.groqInputTokens + args.groqInputTokens,
        groqOutputTokens: existing.groqOutputTokens + args.groqOutputTokens,
        modalMs: existing.modalMs + args.modalMs,
        bytesProcessed: existing.bytesProcessed + args.bytesProcessed,
      });
    } else {
      await ctx.db.insert("userUsage", {
        userId: args.userId,
        month,
        conversions: inc,
        groqInputTokens: args.groqInputTokens,
        groqOutputTokens: args.groqOutputTokens,
        modalMs: args.modalMs,
        bytesProcessed: args.bytesProcessed,
      });
    }
  },
});

/** Internal: the user's plan id, pipeline step cap, and remaining monthly
 * quota. runJob uses this to gate multi-step pipelines per plan AND to stop
 * a hard-stop plan (Free) overshooting its cap via a pipeline — the submit
 * quota gate runs before the step count is known, so it's re-checked here. */
export const pipelineLimitForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const planId = await planIdForUser(ctx, userId);
    const plan = getPlan(planId);
    const usage = await usageForUser(ctx, userId);
    return {
      planId,
      maxPipelineSteps: plan.maxPipelineSteps ?? 1,
      // Hard-stop = no pay-as-you-go (Free). Paid plans flow into overage,
      // so they're allowed to exceed remaining quota.
      hardStop: plan.overagePerConversion == null,
      remaining: Math.max(0, plan.includedConversions - usage.conversions),
    };
  },
});

/**
 * Public: the signed-in user's plan + this month's usage with a full cost
 * breakdown for the dashboard meter. Mirrors lib/plans.js math so the UI and
 * billing never disagree.
 */
export const myUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const planId = await planIdForUser(ctx, userId);
    const region = await regionForUser(ctx, userId);
    const plan = getPlan(planId, region);
    const usage = await usageForUser(ctx, userId);

    const gCost = groqCost(usage.groqInputTokens, usage.groqOutputTokens);
    const mCost = modalCost(usage.modalMs);
    const overage = computeOverage(planId, usage, region);

    return {
      planId,
      planName: plan.name,
      month: usage.month,
      includedConversions: plan.includedConversions,
      conversions: usage.conversions,
      remaining: Math.max(0, plan.includedConversions - usage.conversions),
      // Real provider cost breakdown — shown so usage is transparent.
      groqInputTokens: usage.groqInputTokens,
      groqOutputTokens: usage.groqOutputTokens,
      groqCostUsd: gCost,
      modalMs: usage.modalMs,
      modalCostUsd: mCost,
      providerCostUsd: gCost + mCost,
      bytesProcessed: usage.bytesProcessed,
      // What they'll owe beyond the base subscription at payout.
      extraConversions: overage.extraConversions,
      overageDueUsd: overage.amountDue,
      basePriceUsd: plan.priceMonthly,
      projectedBillUsd: plan.priceMonthly + overage.amountDue,
    };
  },
});

/** Public: list available plans for a region (kept server-truthful). */
export const listPlans = query({
  args: { region: v.optional(v.string()) },
  handler: async (_ctx, { region }) => plansForRegion(region),
});

/**
 * Mark the signed-in user's onboarding as complete. Idempotent — safe to call
 * again (just refreshes the timestamp). Creates the userPlans row on the Free
 * plan if the user doesn't have one yet.
 */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("userPlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { onboardedAt: now });
    } else {
      await ctx.db.insert("userPlans", {
        userId,
        plan: DEFAULT_PLAN as "free",
        updatedAt: now,
        onboardedAt: now,
      });
    }
    return { ok: true };
  },
});

/**
 * Manual plan assignment (no Stripe yet). Admin-only: checks the caller has
 * the admin role before changing anyone's plan.
 */
export const setPlan = mutation({
  args: {
    targetUserId: v.id("users"),
    plan: v.union(
      v.literal("free"),
      v.literal("student"),
      v.literal("pro"),
      v.literal("power")
    ),
  },
  handler: async (ctx, { targetUserId, plan }) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not signed in");
    const role = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", callerId))
      .unique();
    if (role?.role !== "admin") {
      throw new Error("Admin only");
    }

    const existing = await ctx.db
      .query("userPlans")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { plan, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("userPlans", {
        userId: targetUserId,
        plan,
        updatedAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  Polar billing bridge
 *
 *  The Polar webhook arrives at a Next.js route (app/api/webhook/polar)
 *  where the @polar-sh/nextjs adapter verifies the Polar signature. That
 *  route then calls applyPolarSubscription here over the Convex HTTP API.
 *
 *  Because the Convex client API is public, this mutation is additionally
 *  guarded by a shared secret (POLAR_WEBHOOK_BRIDGE_SECRET, set on both the
 *  Convex deployment and the Next.js env). Defense-in-depth: the real
 *  authenticity check is Polar's signature in the route; this just makes
 *  the bridge mutation un-callable by anyone who doesn't hold the secret.
 * ──────────────────────────────────────────────────────────────── */

function assertBridgeSecret(provided: string) {
  const expected = process.env.POLAR_WEBHOOK_BRIDGE_SECRET;
  if (!expected) {
    throw new Error(
      "POLAR_WEBHOOK_BRIDGE_SECRET is not set on the Convex deployment."
    );
  }
  if (provided !== expected) {
    throw new Error("Invalid bridge secret.");
  }
}

/**
 * Upsert a user's plan from a Polar subscription webhook. The user is
 * resolved from `userId` (which we set as the Polar customer's external_id
 * at checkout, so Polar echoes it back on every subscription event).
 *
 * `plan` is already translated from the Polar product id by the route
 * (via lib/polar.js planForProductId) so this stays Polar-shape-agnostic.
 */
export const applyPolarSubscription = mutation({
  args: {
    secret: v.string(),
    // Plain string, not v.id(): it arrives from Polar's external_id echo and
    // must be validated against the users table before use (a forged or
    // stale id must not create a dangling userPlans row).
    externalUserId: v.string(),
    plan: v.union(
      v.literal("free"),
      v.literal("student"),
      v.literal("pro"),
      v.literal("power")
    ),
    region: v.optional(v.string()),
    regionMismatch: v.optional(v.boolean()),
    polarCustomerId: v.optional(v.string()),
    polarSubscriptionId: v.optional(v.string()),
    polarSubscriptionStatus: v.optional(v.string()),
    polarCurrentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, { secret, externalUserId, plan, ...polar }) => {
    assertBridgeSecret(secret);

    // Coerce + verify the external id is a real user before touching state.
    const userId = ctx.db.normalizeId("users", externalUserId);
    if (!userId) {
      throw new Error(
        `Polar external_id "${externalUserId}" is not a valid user id.`
      );
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error(`No user for Polar external_id "${externalUserId}".`);
    }

    // Normalize region defensively (webhook should already send a valid one,
    // but never persist garbage that would mis-price the user).
    const region = normalizeRegion(polar.region);

    const existing = await ctx.db
      .query("userPlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const patch = {
      plan,
      updatedAt: Date.now(),
      ...polar,
      region,
      regionMismatch: polar.regionMismatch ?? false,
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("userPlans", { userId, ...patch });
    }
    return { ok: true };
  },
});

/** The signed-in user's Polar customer id, for the Customer Portal route. */
export const myPolarCustomerId = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("userPlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return row?.polarCustomerId ?? null;
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  Usage-event idempotency (used by runJob's Polar ingestion)
 * ──────────────────────────────────────────────────────────────── */

/** Has this conversion already been billed to Polar? Plus the data needed
 * to ingest it (the user it belongs to). Internal — runJob only. */
export const billingTargetForPrompt = internalQuery({
  args: { promptId: v.id("prompts") },
  handler: async (ctx, { promptId }) => {
    const p = await ctx.db.get(promptId);
    if (!p) return null;
    return { userId: p.userId, alreadyBilled: p.billedToPolar === true };
  },
});

/** Mark a conversion as billed so a runJob retry can't double-ingest it. */
export const markPromptBilled = internalMutation({
  args: { promptId: v.id("prompts") },
  handler: async (ctx, { promptId }) => {
    await ctx.db.patch(promptId, { billedToPolar: true });
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  API gate (lifetime free trial + payment-method check)
 *
 *  Gates apply ONLY to `source: "api"` submissions. The browser/UI is
 *  unaffected — its quota path remains assertWithinQuota.
 *
 *  Flow:
 *    1. submitForUser  → assertApiAllowed → assertWithinQuota
 *    2. runJob success → recordApiJobSuccess (increments lifetime counter)
 *    3. Polar webhook  → refreshPaymentMethodForUser → scheduler runs
 *                        the internalAction in plansActions.ts which
 *                        writes back via _setPaymentMethodCache.
 * ──────────────────────────────────────────────────────────────── */

async function getApiUsage(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">
): Promise<{
  totalJobs: number;
  hasPaymentMethod: boolean;
  paymentMethodCheckedAt: number;
}> {
  const row = await ctx.db
    .query("apiUsage")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return row
    ? {
        totalJobs: row.totalJobs,
        hasPaymentMethod: row.hasPaymentMethod,
        paymentMethodCheckedAt: row.paymentMethodCheckedAt,
      }
    : { totalJobs: 0, hasPaymentMethod: false, paymentMethodCheckedAt: 0 };
}

async function hasPaymentMethodOnFile(
  ctx: MutationCtx | QueryCtx,
  userId: Id<"users">
): Promise<boolean> {
  // Existing paid users always pass — having an active Polar subscription
  // means a card is on file by definition.
  const planRow = await ctx.db
    .query("userPlans")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (planRow?.polarSubscriptionStatus === "active") return true;
  // Otherwise read the cached apiUsage flag, refreshed by the Polar webhook
  // and the periodic refresh action.
  const usage = await getApiUsage(ctx, userId);
  return usage.hasPaymentMethod;
}

/**
 * API gate. Runs BEFORE assertWithinQuota for source="api" submissions.
 * Throws with a [[PAYMENT:...]] tag so the route layer can map it to a
 * 402 payment_required response. Plan-level limits still apply after
 * this passes (assertWithinQuota is called separately).
 */
export async function assertApiAllowed(
  ctx: MutationCtx,
  userId: Id<"users">,
  fileCount: number,
  totalBytes: number
) {
  const hasCard = await hasPaymentMethodOnFile(ctx, userId);

  if (!hasCard) {
    if (fileCount > API_FREE_MAX_FILES) {
      throw new Error(
        `[[PAYMENT:free_limit:filecount]] API free trial allows ` +
          `${API_FREE_MAX_FILES} file per job. Add a payment method at ` +
          `/settings/api to send multi-file jobs.`
      );
    }
    if (totalBytes > API_FREE_MAX_FILE_BYTES) {
      const capMb = Math.round(API_FREE_MAX_FILE_BYTES / (1024 * 1024));
      throw new Error(
        `[[PAYMENT:free_limit:filesize]] API free trial caps files at ` +
          `${capMb} MB. Add a payment method at /settings/api for larger files.`
      );
    }
    const usage = await getApiUsage(ctx, userId);
    if (usage.totalJobs >= API_FREE_TRIAL_JOBS) {
      throw new Error(
        `[[PAYMENT:trial:exhausted]] API free trial used ` +
          `(${API_FREE_TRIAL_JOBS} jobs). Add a payment method at ` +
          `/settings/api to continue.`
      );
    }
  }
}

/** Internal metering for API jobs. Lifetime counter, monotonically
 * increasing. Same conversions dimension as billing — a 3-step pipeline
 * burns 3 trial slots. */
export const recordApiJobSuccess = internalMutation({
  args: {
    userId: v.id("users"),
    conversions: v.number(),
  },
  handler: async (ctx, { userId, conversions }) => {
    const existing = await ctx.db
      .query("apiUsage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        totalJobs: existing.totalJobs + conversions,
      });
    } else {
      await ctx.db.insert("apiUsage", {
        userId,
        totalJobs: conversions,
        hasPaymentMethod: false,
        paymentMethodCheckedAt: 0,
      });
    }
  },
});

/** Dashboard data source: lifetime API job count + free limit + whether
 * a payment method is on file. */
export const myApiUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const usage = await getApiUsage(ctx, userId);
    const hasCard = await hasPaymentMethodOnFile(ctx, userId);
    return {
      totalJobs: usage.totalJobs,
      freeLimit: API_FREE_TRIAL_JOBS,
      hasPaymentMethod: hasCard,
      paymentMethodCheckedAt: usage.paymentMethodCheckedAt,
    };
  },
});

/** Resolve the user's Polar customer id (or null). Used by the refresh
 * action in plansActions.ts. Internal-only. */
export const _polarCustomerForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("userPlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return row?.polarCustomerId ?? null;
  },
});

/** Write the payment-method cache. Called by the refresh action after a
 * Polar customer lookup. Upserts the apiUsage row so the cached flag is
 * available to assertApiAllowed without a fresh SDK call on every submit. */
export const _setPaymentMethodCache = internalMutation({
  args: {
    userId: v.id("users"),
    hasPaymentMethod: v.boolean(),
  },
  handler: async (ctx, { userId, hasPaymentMethod }) => {
    const existing = await ctx.db
      .query("apiUsage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        hasPaymentMethod,
        paymentMethodCheckedAt: now,
      });
    } else {
      await ctx.db.insert("apiUsage", {
        userId,
        totalJobs: 0,
        hasPaymentMethod,
        paymentMethodCheckedAt: now,
      });
    }
  },
});

/** Dashboard-triggered refresh. Throttled to once per 60s to keep the
 * Polar SDK from being hammered if the UI polls. */
export const refreshMyPaymentMethod = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const usage = await getApiUsage(ctx, userId);
    if (Date.now() - usage.paymentMethodCheckedAt < 60_000) return;
    await ctx.scheduler.runAfter(
      0,
      internal.plansActions.refreshPaymentMethodStatus,
      { userId }
    );
  },
});

/** Webhook-triggered refresh. Bridge-secret-guarded so only the Next.js
 * Polar webhook (which holds the secret) can call it. */
export const refreshPaymentMethodForUser = mutation({
  args: {
    secret: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { secret, userId }) => {
    assertBridgeSecret(secret);
    await ctx.scheduler.runAfter(
      0,
      internal.plansActions.refreshPaymentMethodStatus,
      { userId }
    );
  },
});
