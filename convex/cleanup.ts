"use node";

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Find prompts older than `cutoff` that still have files attached
 * (i.e. not yet marked expired). Returns up to `limit` rows per run
 * so a single cron tick can't blow up.
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

/**
 * Run hourly via cron. Deletes blobs older than 24h from storage and marks
 * the prompt row `filesExpired: true`. History (prompt, chat, command) is
 * preserved so users can still see what they ran.
 */
export const expireOldFiles = internalAction({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - TTL_MS;
    const rows = await ctx.runQuery(internal.cleanup.findExpirable, {
      cutoff,
      limit: 500,
    });

    let blobsDeleted = 0;
    let rowsTouched = 0;

    for (const row of rows) {
      const ids = [
        ...(row.inputStorageIds ?? []),
        ...(row.outputStorageIds ?? []),
      ];
      for (const sid of ids) {
        try {
          await ctx.storage.delete(sid);
          blobsDeleted++;
        } catch {
          // Already gone, or unknown id — ignore.
        }
      }
      await ctx.runMutation(internal.cleanup.markExpired, {
        promptId: row._id,
      });
      rowsTouched++;
    }

    console.log(
      `[cleanup] Expired ${rowsTouched} prompts, deleted ${blobsDeleted} blobs (cutoff ${new Date(cutoff).toISOString()})`
    );
  },
});
