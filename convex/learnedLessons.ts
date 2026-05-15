import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Throws unless the caller is signed in AND has the admin role. */
async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in.");
  const role = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (role?.role !== "admin") throw new Error("Admin only.");
  return userId;
}

/**
 * Admin review queue: every lesson the cron has distilled, newest first,
 * pending ones surfaced first. Drives the approval UI.
 */
export const listForReview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("learnedLessons").collect();
    const rank = { pending: 0, superseded: 1, approved: 2, rejected: 3 } as const;
    return rows.sort(
      (a, b) =>
        rank[a.status] - rank[b.status] || b._creationTime - a._creationTime
    );
  },
});

export const approve = mutation({
  args: { id: v.id("learnedLessons"), note: v.optional(v.string()) },
  handler: async (ctx, { id, note }) => {
    const userId = await requireAdmin(ctx);
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Lesson not found.");
    await ctx.db.patch(id, {
      status: "approved",
      reviewedBy: userId,
      reviewedAt: Date.now(),
      reviewNote: note,
    });
  },
});

export const reject = mutation({
  args: { id: v.id("learnedLessons"), note: v.optional(v.string()) },
  handler: async (ctx, { id, note }) => {
    const userId = await requireAdmin(ctx);
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Lesson not found.");
    // Rejected stays rejected; upsertLesson respects it and won't re-file
    // the same signature.
    await ctx.db.patch(id, {
      status: "rejected",
      reviewedBy: userId,
      reviewedAt: Date.now(),
      reviewNote: note,
    });
  },
});

/** Let an admin revert an approval (e.g. the lesson turned out wrong). */
export const unapprove = mutation({
  args: { id: v.id("learnedLessons"), note: v.optional(v.string()) },
  handler: async (ctx, { id, note }) => {
    const userId = await requireAdmin(ctx);
    const row = await ctx.db.get(id);
    if (!row) throw new Error("Lesson not found.");
    await ctx.db.patch(id, {
      status: "pending",
      reviewedBy: userId,
      reviewedAt: Date.now(),
      reviewNote: note,
    });
  },
});

/**
 * Internal: the approved lessons runJob injects into the prompt.
 * Capped so a runaway approval list can't blow the context window;
 * highest-occurrence (most impactful) lessons win.
 */
export const approvedForPrompt = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("learnedLessons")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    return rows
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 25)
      .map((r) => ({ title: r.title, lesson: r.lesson, tool: r.tool }));
  },
});
