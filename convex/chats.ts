import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 40) return trimmed || "New chat";
  return trimmed.slice(0, 40).trimEnd() + "…";
}

/**
 * List the current user's chats. Favorites first (sorted by recency
 * within favorites), then everything else by recency. We pull a single
 * page of `limit` rows and sort in memory — the by_user_recent index
 * already returns them in recency order so the in-memory cost is
 * O(limit) and bounded.
 */
export const listMine = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("chats")
      .withIndex("by_user_recent", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 50);
    // Stable partition: favorites first, recency within each side preserved.
    const favs = rows.filter((c) => c.favorite === true);
    const rest = rows.filter((c) => c.favorite !== true);
    return [...favs, ...rest];
  },
});

/**
 * Search the user's chats by title. Uses the full-text searchIndex on
 * chats.by_title; the filterFields constraint scopes results to the
 * caller so a search across all users never leaks rows.
 *
 * Returns the same shape as listMine so the history panel can swap
 * datasets without a structural change.
 */
export const searchMine = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { query, limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const trimmed = query.trim();
    if (!trimmed) return [];
    return ctx.db
      .query("chats")
      .withSearchIndex("by_title", (q) =>
        q.search("title", trimmed).eq("userId", userId)
      )
      .take(limit ?? 30);
  },
});

/** Toggle the favorite flag on one of the user's chats. */
export const toggleFavorite = mutation({
  args: { id: v.id("chats") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const chat = await ctx.db.get(id);
    if (!chat || chat.userId !== userId) throw new Error("Chat not found");
    await ctx.db.patch(id, { favorite: !chat.favorite });
    return !chat.favorite;
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

    const rawTurns = await ctx.db
      .query("prompts")
      .withIndex("by_chat", (q) => q.eq("chatId", id))
      .collect();
    rawTurns.sort((a, b) => (a.turnIndex ?? 0) - (b.turnIndex ?? 0));

    // Index turns by id so we can resolve chainedFromPromptId → its
    // output filename in a single pass without an extra DB roundtrip.
    const byId = new Map(rawTurns.map((t) => [t._id, t]));

    // Attach signed download URLs for any outputs.
    const turns = await Promise.all(
      rawTurns.map(async (t) => {
        const outputUrls = t.outputStorageIds
          ? await Promise.all(
              t.outputStorageIds.map(async (sid, i) => ({
                storageId: sid,
                filename: t.outputFilenames?.[i] ?? "output",
                url: await ctx.storage.getUrl(sid),
              }))
            )
          : [];
        const inputUrls = t.inputStorageIds
          ? await Promise.all(
              t.inputStorageIds.map(async (sid, i) => ({
                storageId: sid,
                filename: t.inputFilenames?.[i] ?? "input",
                url: await ctx.storage.getUrl(sid),
              }))
            )
          : [];
        // If this turn auto-chained, surface the prior turn's first
        // output filename so the UI can render "Following up on X".
        // Falls back to null when the chain points at a deleted turn.
        let chainedFromFilename = null;
        if (t.chainedFromPromptId) {
          const prev = byId.get(t.chainedFromPromptId);
          chainedFromFilename = prev?.outputFilenames?.[0] ?? null;
        }
        return { ...t, outputUrls, inputUrls, chainedFromFilename };
      })
    );

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
