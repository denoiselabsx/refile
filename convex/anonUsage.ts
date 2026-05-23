/**
 * Convex bindings around the anonymous-quota rollup table.
 *
 * The pure logic — limits, IP hashing, quota verdict — lives in
 * anonQuota.ts. This file is just the I/O: read today's row, bump the
 * counter after a successful conversion, and serve a tiny public query
 * the result-card UI can subscribe to for the "X free left today" pill.
 *
 * Why we roll up instead of counting prompts:
 * counting `prompts.by_anon_ip` would scan every anon row for today's
 * IP on every quota check (a O(N) read in Convex), and would have to
 * be tied to runJob's success path with a re-count. A one-row rollup
 * is O(1), cheap to subscribe to, and the source of truth.
 *
 * Note on identification:
 * the public counter query takes the ipHash directly — the caller (the
 * server-side anon-convert API route) computes it from the request IP
 * and forwards it. The browser never sees its own ipHash; counter
 * subscription happens via promptId after submit (see anonStatus query).
 */

import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import {
  utcDayKey,
  ANON_DAILY_LIMIT,
  ANON_FILE_SIZE_CAP,
} from "./anonQuota";

/* ──────────────────────────────────────────────────────────────── *
 *  Increment the rollup. Called by runJob.runDirectConvert ONLY on
 *  a fully-successful anon conversion (mirror of meterSuccess). A
 *  failed conversion does not count — same fairness rule as Polar.
 * ──────────────────────────────────────────────────────────────── */
export const bumpAnonUsage = internalMutation({
  args: {
    ipHash: v.string(),
    bytesProcessed: v.number(),
  },
  handler: async (ctx, { ipHash, bytesProcessed }) => {
    const day = utcDayKey();
    const existing = await ctx.db
      .query("anonUsage")
      .withIndex("by_ip_day", (q) => q.eq("ipHash", ipHash).eq("day", day))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        count: existing.count + 1,
        bytesProcessed: existing.bytesProcessed + bytesProcessed,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("anonUsage", {
        ipHash,
        day,
        count: 1,
        bytesProcessed,
        updatedAt: Date.now(),
      });
    }
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  Public counter — reactive subscription for the result-card pill.
 *  Returns just { used, limit, remaining } so the client never holds
 *  the ipHash itself.
 * ──────────────────────────────────────────────────────────────── */
export const getAnonCounter = query({
  args: { ipHash: v.string() },
  handler: async (ctx, { ipHash }) => {
    const day = utcDayKey();
    const row = await ctx.db
      .query("anonUsage")
      .withIndex("by_ip_day", (q) => q.eq("ipHash", ipHash).eq("day", day))
      .unique();
    const used = row?.count ?? 0;
    return {
      used,
      limit: ANON_DAILY_LIMIT,
      remaining: Math.max(0, ANON_DAILY_LIMIT - used),
      fileSizeCap: ANON_FILE_SIZE_CAP,
    };
  },
});
