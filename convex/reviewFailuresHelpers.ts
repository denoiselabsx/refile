import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Recent failed command-mode prompts, newest first, capped at `limit`.
 * Only rows that actually ran a command are useful for learning — chat-mode
 * failures and config errors (no aiCommand) are noise.
 */
export const recentFailures = internalQuery({
  args: { sinceMs: v.number(), limit: v.number() },
  handler: async (ctx, { sinceMs, limit }) => {
    const failed = await ctx.db
      .query("prompts")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();
    return failed
      .filter(
        (p) =>
          p._creationTime >= sinceMs &&
          p.aiKind === "command" &&
          !!p.aiCommand &&
          !!p.errorMessage
      )
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, limit)
      .map((p) => ({
        prompt: p.prompt,
        aiCommand: p.aiCommand as string,
        aiTool: p.aiTool ?? "other",
        errorMessage: p.errorMessage as string,
        // Trim logs hard — they can be 8k and we batch many of these into
        // one LLM call.
        sandboxLogs: (p.sandboxLogs ?? "").slice(-600),
      }));
  },
});

/** All non-rejected lesson signatures, so the cron can dedupe. */
export const existingSignatures = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("learnedLessons").collect();
    return rows
      .filter((r) => r.status !== "rejected")
      .map((r) => ({
        _id: r._id,
        signature: r.signature,
        status: r.status,
        occurrences: r.occurrences,
      }));
  },
});

/**
 * Upsert a distilled lesson by signature.
 * - New signature → insert as "pending".
 * - Existing pending/superseded → refresh evidence + bump occurrences.
 * - Existing approved → leave the live text alone (don't silently change
 *   what's already trusted) but bump the occurrence counter so humans see
 *   it's still happening.
 * Returns what happened, for cron logging.
 */
export const upsertLesson = internalMutation({
  args: {
    title: v.string(),
    lesson: v.string(),
    signature: v.string(),
    tool: v.string(),
    occurrences: v.number(),
    examplePrompt: v.string(),
    exampleCommand: v.string(),
    exampleError: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("learnedLessons")
      .withIndex("by_signature", (q) => q.eq("signature", args.signature))
      .first();

    if (!existing) {
      await ctx.db.insert("learnedLessons", {
        ...args,
        status: "pending",
      });
      return "inserted";
    }

    if (existing.status === "rejected") {
      // A human said no. Respect it — don't re-file the same lesson.
      return "skipped-rejected";
    }

    if (existing.status === "approved") {
      await ctx.db.patch(existing._id, {
        occurrences: existing.occurrences + args.occurrences,
      });
      return "bumped-approved";
    }

    // pending or superseded → refresh with the latest distillation.
    await ctx.db.patch(existing._id, {
      title: args.title,
      lesson: args.lesson,
      tool: args.tool,
      occurrences: existing.occurrences + args.occurrences,
      examplePrompt: args.examplePrompt,
      exampleCommand: args.exampleCommand,
      exampleError: args.exampleError,
      status: "pending",
    });
    return "refreshed";
  },
});
