import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { assertCanCreatePreset } from "./plans";

/* ──────────────────────────────────────────────────────────────── *
 *  Queries
 * ──────────────────────────────────────────────────────────────── */

export const list = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    tool: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 40;
    let results;

    if (args.search && args.search.trim().length > 0) {
      results = await ctx.db
        .query("presets")
        .withSearchIndex("by_text", (q) =>
          q
            .search("name", args.search)
            .eq("isPublic", true)
        )
        .take(limit);
    } else if (args.category) {
      results = await ctx.db
        .query("presets")
        .withIndex("by_category", (q) =>
          q.eq("category", args.category).eq("isPublic", true)
        )
        .order("desc")
        .take(limit);
    } else {
      results = await ctx.db
        .query("presets")
        .withIndex("by_public_recent", (q) => q.eq("isPublic", true))
        .order("desc")
        .take(limit);
    }

    if (args.tool) {
      results = results.filter((p) => p.tool === args.tool);
    }
    if (args.tags && args.tags.length > 0) {
      results = results.filter((p) =>
        args.tags.every((t) => p.tags.includes(t))
      );
    }

    if (args.sortBy === "usage_count") {
      results.sort((a, b) =>
        args.sortOrder === "asc"
          ? a.usageCount - b.usageCount
          : b.usageCount - a.usageCount
      );
    } else if (args.sortBy === "likes_count") {
      results.sort((a, b) =>
        args.sortOrder === "asc"
          ? a.likesCount - b.likesCount
          : b.likesCount - a.likesCount
      );
    }

    // Hydrate creator + isLiked
    const me = await getAuthUserId(ctx);
    return Promise.all(
      results.map(async (p) => {
        const creator = await ctx.db.get(p.userId);
        let isLiked = false;
        if (me) {
          const like = await ctx.db
            .query("presetLikes")
            .withIndex("by_user_and_preset", (q) =>
              q.eq("userId", me).eq("presetId", p._id)
            )
            .first();
          isLiked = Boolean(like);
        }
        return {
          ...p,
          isLiked,
          creator: creator
            ? { name: creator.name, image: creator.image }
            : null,
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("presets") },
  handler: async (ctx, { id }) => {
    const preset = await ctx.db.get(id);
    if (!preset) return null;

    const creator = await ctx.db.get(preset.userId);
    const me = await getAuthUserId(ctx);
    let isLiked = false;
    if (me) {
      const like = await ctx.db
        .query("presetLikes")
        .withIndex("by_user_and_preset", (q) =>
          q.eq("userId", me).eq("presetId", id)
        )
        .first();
      isLiked = Boolean(like);
    }
    return {
      ...preset,
      isLiked,
      isOwner: me === preset.userId,
      creator: creator ? { name: creator.name, image: creator.image } : null,
    };
  },
});

export const categories = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("presets")
      .withIndex("by_public_recent", (q) => q.eq("isPublic", true))
      .take(500);
    const counts = new Map();
    for (const p of all) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  },
});

export const popularTags = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const all = await ctx.db
      .query("presets")
      .withIndex("by_public_recent", (q) => q.eq("isPublic", true))
      .take(500);
    const counts = new Map();
    for (const p of all) {
      for (const tag of p.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit ?? 20);
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  Mutations
 * ──────────────────────────────────────────────────────────────── */

const presetFields = {
  name: v.string(),
  description: v.string(),
  category: v.string(),
  tool: v.string(),
  commandTemplate: v.string(),
  inputFilePatterns: v.array(
    v.object({
      name: v.string(),
      extensions: v.array(v.string()),
      description: v.optional(v.string()),
    })
  ),
  outputFilePatterns: v.array(
    v.object({
      name: v.string(),
      template: v.optional(v.string()),
      description: v.optional(v.string()),
    })
  ),
  tags: v.array(v.string()),
  isPublic: v.boolean(),
};

export const create = mutation({
  args: presetFields,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    await assertCanCreatePreset(ctx, userId);
    return ctx.db.insert("presets", {
      ...args,
      userId,
      isVerified: false,
      likesCount: 0,
      usageCount: 0,
    });
  },
});

export const update = mutation({
  args: { id: v.id("presets"), ...presetFields },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const preset = await ctx.db.get(id);
    if (!preset || preset.userId !== userId) {
      throw new Error("Not allowed");
    }
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("presets") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const preset = await ctx.db.get(id);
    if (!preset || preset.userId !== userId) throw new Error("Not allowed");
    // Clean up likes
    const likes = await ctx.db
      .query("presetLikes")
      .withIndex("by_preset", (q) => q.eq("presetId", id))
      .collect();
    for (const like of likes) await ctx.db.delete(like._id);
    await ctx.db.delete(id);
  },
});

export const toggleLike = mutation({
  args: { id: v.id("presets") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const existing = await ctx.db
      .query("presetLikes")
      .withIndex("by_user_and_preset", (q) =>
        q.eq("userId", userId).eq("presetId", id)
      )
      .first();
    const preset = await ctx.db.get(id);
    if (!preset) throw new Error("Preset not found");

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(id, {
        likesCount: Math.max(0, preset.likesCount - 1),
      });
      return { liked: false };
    } else {
      await ctx.db.insert("presetLikes", { userId, presetId: id });
      await ctx.db.patch(id, { likesCount: preset.likesCount + 1 });
      return { liked: true };
    }
  },
});

export const recordUsage = mutation({
  args: { id: v.id("presets") },
  handler: async (ctx, { id }) => {
    const preset = await ctx.db.get(id);
    if (!preset) return;
    await ctx.db.patch(id, { usageCount: preset.usageCount + 1 });
  },
});
