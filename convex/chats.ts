import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 40) return trimmed || "New chat";
  return trimmed.slice(0, 40).trimEnd() + "…";
}

/**
 * List the current user's chats, most recently active first.
 */
export const listMine = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("chats")
      .withIndex("by_user_recent", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 50);
  },
});

/**
 * Get one chat plus all its turns in order.
 */
export const get = query({
  args: { id: v.id("chats") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const chat = await ctx.db.get(id);
    if (!chat || chat.userId !== userId) return null;

    const turns = await ctx.db
      .query("prompts")
      .withIndex("by_chat", (q) => q.eq("chatId", id))
      .collect();
    // sort by turnIndex ascending (Convex index already orders, but be safe)
    turns.sort((a, b) => (a.turnIndex ?? 0) - (b.turnIndex ?? 0));

    return { chat, turns };
  },
});

export const create = mutation({
  args: { title: v.optional(v.string()) },
  handler: async (ctx, { title }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    return ctx.db.insert("chats", {
      userId,
      title: title ? titleFromPrompt(title) : "New chat",
      lastActivity: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { id: v.id("chats"), title: v.string() },
  handler: async (ctx, { id, title }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const chat = await ctx.db.get(id);
    if (!chat || chat.userId !== userId) throw new Error("Chat not found");
    await ctx.db.patch(id, { title: titleFromPrompt(title) });
  },
});

export const remove = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const chat = await ctx.db.get(id);
    if (!chat || chat.userId !== userId) throw new Error("Chat not found");

    // Cascade: delete all turns in this chat.
    const turns = await ctx.db
      .query("prompts")
      .withIndex("by_chat", (q) => q.eq("chatId", id))
      .collect();
    for (const t of turns) await ctx.db.delete(t._id);
    await ctx.db.delete(id);
  },
});
