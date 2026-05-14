"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Run hourly via cron. Deletes blobs older than 24h from storage and marks
 * the prompt row `filesExpired: true`. History (prompt, chat, command) is
 * preserved so users can still see what they ran.
 */
export const expireOldFiles = internalAction({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - TTL_MS;
    const rows = await ctx.runQuery(internal.cleanupHelpers.findExpirable, {
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
      await ctx.runMutation(internal.cleanupHelpers.markExpired, {
        promptId: row._id,
      });
      rowsTouched++;
    }

    console.log(
      `[cleanup] Expired ${rowsTouched} prompts, deleted ${blobsDeleted} blobs (cutoff ${new Date(cutoff).toISOString()})`
    );
  },
});
