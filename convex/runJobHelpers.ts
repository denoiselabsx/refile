import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const loadPrompt = internalQuery({
  args: { promptId: v.id("prompts") },
  handler: async (ctx, { promptId }) => {
    return ctx.db.get(promptId);
  },
});
