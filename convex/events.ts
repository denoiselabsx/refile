import { v } from "convex/values";
import {
  mutation,
  internalMutation,
  query,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { EVENT_NAMES, dayKey } from "../lib/analytics-events.js";

/* ──────────────────────────────────────────────────────────────── *
 *  Write path
 *
 *  Two entry points:
 *    - log: public mutation, called from the browser. Trusts the caller
 *      for `name` (validated against EVENT_NAMES) and stamps userId from
 *      the auth session. Anonymous callers pass `anonId` from
 *      localStorage so we can de-dupe a single visitor across events.
 *    - logInternal: internal mutation, called from runJob / other backend
 *      actions for server-truth events (lifecycle, billing pressure).
 *
 *  Both write to the same `events` table. The rollup cron reads from it
 *  daily; ad-hoc explorer reads it directly.
 * ──────────────────────────────────────────────────────────────── */

function assertKnownEvent(name: string) {
  if (!EVENT_NAMES.includes(name)) {
    throw new Error(`Unknown analytics event: ${name}`);
  }
}

export const log = mutation({
  args: {
    name: v.string(),
    anonId: v.optional(v.string()),
    props: v.optional(v.any()),
  },
  handler: async (ctx, { name, anonId, props }) => {
    assertKnownEvent(name);
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    await ctx.db.insert("events", {
      userId: userId ?? undefined,
      anonId: userId ? undefined : anonId,
      name,
      props,
      at: now,
      day: dayKey(new Date(now)),
    });
  },
});

export const logInternal = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    anonId: v.optional(v.string()),
    name: v.string(),
    props: v.optional(v.any()),
  },
  handler: async (ctx, { userId, anonId, name, props }) => {
    assertKnownEvent(name);
    const now = Date.now();
    await ctx.db.insert("events", {
      userId,
      anonId,
      name,
      props,
      at: now,
      day: dayKey(new Date(now)),
    });
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  Rollup cron
 *
 *  Run at ~00:30 UTC. For each event name that has rows in yesterday's
 *  bucket, compute count + uniqueUsers and upsert into eventDailyRollup.
 *  Idempotent: rerunning the same day overwrites the existing row.
 *
 *  Also prunes raw events older than 30 days to keep the table bounded.
 * ──────────────────────────────────────────────────────────────── */

const RAW_RETENTION_DAYS = 30;

export const rollupYesterday = internalMutation({
  args: {},
  handler: async (ctx) => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const day = dayKey(yesterday);

    // One pass over yesterday's rows, group by name.
    const rows = await ctx.db
      .query("events")
      .withIndex("by_day", (q) => q.eq("day", day))
      .collect();

    const byName = new Map<string, { count: number; unique: Set<string> }>();
    for (const r of rows) {
      const slot = byName.get(r.name) ?? { count: 0, unique: new Set() };
      slot.count += 1;
      const id = r.userId ?? r.anonId;
      if (id) slot.unique.add(String(id));
      byName.set(r.name, slot);
    }

    for (const [name, { count, unique }] of byName) {
      const existing = await ctx.db
        .query("eventDailyRollup")
        .withIndex("by_day_name", (q) => q.eq("day", day).eq("name", name))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { count, uniqueUsers: unique.size });
      } else {
        await ctx.db.insert("eventDailyRollup", {
          day,
          name,
          count,
          uniqueUsers: unique.size,
        });
      }
    }

    // Prune raw rows beyond retention. Cheaper than a separate cron and
    // keeps the events table size proportional to the rollup window.
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - RAW_RETENTION_DAYS);
    const cutoffDay = dayKey(cutoff);
    // Take in small batches to stay under the per-mutation document scan
    // budget; the cron runs every day so backlog won't accumulate.
    const stale = await ctx.db
      .query("events")
      .withIndex("by_day", (q) => q.lt("day", cutoffDay))
      .take(500);
    for (const row of stale) await ctx.db.delete(row._id);
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  Read path — admin dashboard only
 * ──────────────────────────────────────────────────────────────── */

async function assertAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  const role = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();
  if (role?.role !== "admin") throw new Error("Forbidden");
}

/** Last N days of rollup data for the dashboard charts. */
export const adminRollup = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    await assertAdmin(ctx);
    const n = Math.min(Math.max(days ?? 30, 1), 90);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - n);
    const startDay = dayKey(start);
    return ctx.db
      .query("eventDailyRollup")
      .withIndex("by_day_name", (q) => q.gte("day", startDay))
      .collect();
  },
});

/** Today's raw events (not yet rolled up), grouped by name. The dashboard
 *  shows today's numbers alongside historical rollup so the chart isn't
 *  blank until 00:30 UTC rolls. */
export const adminToday = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const day = dayKey();
    const rows = await ctx.db
      .query("events")
      .withIndex("by_day", (q) => q.eq("day", day))
      .collect();
    const byName = new Map<string, { count: number; unique: Set<string> }>();
    for (const r of rows) {
      const slot = byName.get(r.name) ?? { count: 0, unique: new Set() };
      slot.count += 1;
      const id = r.userId ?? r.anonId;
      if (id) slot.unique.add(String(id));
      byName.set(r.name, slot);
    }
    return Array.from(byName.entries()).map(([name, v]) => ({
      day,
      name,
      count: v.count,
      uniqueUsers: v.unique.size,
    }));
  },
});

/** Last 100 raw events of a given name — the explorer view. */
export const adminRecentByName = query({
  args: { name: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { name, limit }) => {
    await assertAdmin(ctx);
    const n = Math.min(Math.max(limit ?? 100, 1), 500);
    // by_name_day is keyed (name, day) so it can range-scan a single name
    // across days; we then take the most-recent slice.
    const rows = await ctx.db
      .query("events")
      .withIndex("by_name_day", (q) => q.eq("name", name))
      .order("desc")
      .take(n);
    return rows.map((r) => ({
      _id: r._id,
      at: r.at,
      day: r.day,
      userId: r.userId,
      anonId: r.anonId,
      props: r.props,
    }));
  },
});
