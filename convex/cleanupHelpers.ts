import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Find prompts older than `cutoff` that still have files attached
 * (i.e. not yet marked expired). Capped at `limit` so a single cron
 * tick can't blow up on a huge backlog.
 */
export const findExpirable = internalQuery({
  args: { cutoff: v.number(), limit: v.number() },
  handler: async (ctx, { cutoff, limit }) => {
    const all = await ctx.db
      .query("prompts")
      .withIndex("by_user_recent")
      .collect();
    return all
      .filter(
        (p) =>
          p._creationTime < cutoff &&
          !p.filesExpired &&
          ((p.inputStorageIds?.length ?? 0) > 0 ||
            (p.outputStorageIds?.length ?? 0) > 0)
      )
      .slice(0, limit);
  },
});

export const markExpired = internalMutation({
  args: { promptId: v.id("prompts") },
  handler: async (ctx, { promptId }) => {
    await ctx.db.patch(promptId, {
      filesExpired: true,
      inputStorageIds: [],
      outputStorageIds: [],
    });
  },
});
