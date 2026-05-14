import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const loadPrompt = internalQuery({
  args: { promptId: v.id("prompts") },
  handler: async (ctx, { promptId }) => {
    return ctx.db.get(promptId);
  },
});

/**
 * Load up to `limit` prior turns from the same chat (turns earlier than
 * `beforeTurnIndex`), most recent last. Used to give the AI conversation context.
 */
export const loadPriorTurns = internalQuery({
  args: {
    chatId: v.id("chats"),
    beforeTurnIndex: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, { chatId, beforeTurnIndex, limit }) => {
    const all = await ctx.db
      .query("prompts")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .collect();
    return all
      .filter((t) => (t.turnIndex ?? 0) < beforeTurnIndex)
      .sort((a, b) => (a.turnIndex ?? 0) - (b.turnIndex ?? 0))
      .slice(-limit);
  },
});
