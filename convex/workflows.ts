import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("workflows")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const get = query({
  args: { id: v.id("workflows") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const wf = await ctx.db.get(id);
    if (!wf || wf.userId !== userId) return null;
    return wf;
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("workflows")),
    name: v.string(),
    nodes: v.any(),
    edges: v.any(),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    if (id) {
      const wf = await ctx.db.get(id);
      if (!wf || wf.userId !== userId) throw new Error("Not allowed");
      await ctx.db.patch(id, patch);
      return id;
    }
    return ctx.db.insert("workflows", { ...patch, userId });
  },
});

export const remove = mutation({
  args: { id: v.id("workflows") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const wf = await ctx.db.get(id);
    if (!wf || wf.userId !== userId) throw new Error("Not allowed");
    await ctx.db.delete(id);
  },
});
