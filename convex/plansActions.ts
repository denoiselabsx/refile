"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Polar } from "@polar-sh/sdk";
import { polarServer } from "../lib/polar.js";

/**
 * Refresh the cached "does this user have a payment method on file?"
 * flag in apiUsage. Reads the user's Polar customer id from userPlans,
 * fetches the Polar customer, and writes the boolean back via
 * _setPaymentMethodCache.
 *
 * Lives in a separate "use node" file because the Polar SDK needs the
 * Node runtime, while plans.ts is the V8 runtime (queries + mutations
 * can't be in node files).
 *
 * Failures are swallowed: if Polar is unreachable, the cache is left
 * as-is rather than incorrectly flipping the user's gate to open/closed.
 * If no POLAR_ACCESS_TOKEN is configured (e.g. local dev without Polar),
 * we still cache `false` so the gate functions deterministically.
 */
export const refreshPaymentMethodStatus = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const customerId = await ctx.runQuery(
      internal.plans._polarCustomerForUser,
      { userId }
    );
    if (!customerId) {
      // No Polar customer yet → no card. Cache the fact so we don't refetch.
      await ctx.runMutation(internal.plans._setPaymentMethodCache, {
        userId,
        hasPaymentMethod: false,
      });
      return;
    }

    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    if (!accessToken) {
      // Polar billing not configured. Treat as "no card" — the existing
      // paid-subscription escape hatch (polarSubscriptionStatus === "active")
      // still works for users on Polar plans.
      await ctx.runMutation(internal.plans._setPaymentMethodCache, {
        userId,
        hasPaymentMethod: false,
      });
      return;
    }

    try {
      const polar = new Polar({
        accessToken,
        server: polarServer(),
      });
      // The Polar Customer model doesn't directly expose `paymentMethods` on
      // the public schema across SDK versions — check both camelCase and
      // snake_case shapes plus the customer-portal-style fields so we don't
      // miss a card. If none of them are populated, fall back to checking
      // the customer-portal "default_payment_method_id" field by re-shaping.
      const customer: any = await polar.customers.get({ id: customerId });
      const hasMethod =
        Boolean(customer?.defaultPaymentMethod) ||
        Boolean(customer?.defaultPaymentMethodId) ||
        Boolean(customer?.default_payment_method_id) ||
        (Array.isArray(customer?.paymentMethods) &&
          customer.paymentMethods.length > 0) ||
        (Array.isArray(customer?.payment_methods) &&
          customer.payment_methods.length > 0);
      await ctx.runMutation(internal.plans._setPaymentMethodCache, {
        userId,
        hasPaymentMethod: hasMethod,
      });
    } catch (err) {
      console.error("[plans] Polar customer fetch failed:", err);
      // Don't fail the action — leave the cache as-is.
    }
  },
});
