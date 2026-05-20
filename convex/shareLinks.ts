import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/* ──────────────────────────────────────────────────────────────── *
 *  Share links — create / view / revoke
 *
 *  A share link is a stable 8-character code anyone with the URL can
 *  use to download one of your conversion outputs for 24 hours. The
 *  matching /d/{code} page re-signs the underlying Convex storage URL
 *  on each visit so the link survives Convex's short-lived signed-URL
 *  TTLs.
 *
 *  Public read uses `getPublic`, which deliberately returns only the
 *  display fields (filename, size, expiresAt) — never the storageId or
 *  the userId. The actual file is fetched via the /api/d/{code} route
 *  which calls `resolveOutputForDownload` server-side.
 * ──────────────────────────────────────────────────────────────── */

const SHORT_CODE_LEN = 10;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// Base62 alphabet, no look-alike chars (0/O, 1/I/l) for tidy URLs.
const SHORT_ALPHABET =
  "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeShortCode(): string {
  let out = "";
  for (let i = 0; i < SHORT_CODE_LEN; i++) {
    out += SHORT_ALPHABET[Math.floor(Math.random() * SHORT_ALPHABET.length)];
  }
  return out;
}

/**
 * Create (or return existing) share link for a specific output of one
 * of the user's prompts. Idempotent on (promptId, storageId): if the
 * caller already has a non-revoked, non-expired link for that exact
 * output, return it instead of minting a second one — copy-link buttons
 * should always produce the same URL on repeated clicks.
 */
export const createForOutput = mutation({
  args: {
    promptId: v.id("prompts"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { promptId, storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    const prompt = await ctx.db.get(promptId);
    if (!prompt || prompt.userId !== userId) {
      throw new Error("Prompt not found");
    }
    if (!(prompt.outputStorageIds ?? []).some((s) => s === storageId)) {
      throw new Error("Output not found on this prompt");
    }

    // Look for an existing live link for this exact output.
    const now = Date.now();
    const existingForPrompt = await ctx.db
      .query("shareLinks")
      .withIndex("by_prompt", (q) => q.eq("promptId", promptId))
      .collect();
    const reusable = existingForPrompt.find(
      (l) =>
        l.storageId === storageId &&
        !l.revoked &&
        l.expiresAt > now
    );
    if (reusable) return { shortCode: reusable.shortCode };

    // Figure out the filename + size to show on the public page.
    const outputs = prompt.outputStorageIds ?? [];
    const filenames = prompt.outputFilenames ?? [];
    const idx = outputs.indexOf(storageId);
    const filename = filenames[idx] ?? "output";

    const meta = await ctx.db.system.get(storageId);
    const sizeBytes = meta?.size ?? 0;

    // Mint a short code that isn't already taken. Collisions are
    // astronomically unlikely (56^10) but we still retry defensively
    // — bad to ever overwrite an existing link.
    let shortCode = makeShortCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query("shareLinks")
        .withIndex("by_short", (q) => q.eq("shortCode", shortCode))
        .unique();
      if (!clash) break;
      shortCode = makeShortCode();
    }

    await ctx.db.insert("shareLinks", {
      userId,
      promptId,
      storageId,
      filename,
      sizeBytes,
      shortCode,
      createdAt: now,
      expiresAt: now + TWENTY_FOUR_HOURS_MS,
      revoked: false,
      viewCount: 0,
    });

    await ctx.runMutation(internal.events.logInternal, {
      userId,
      name: "share_link_created",
      props: { shortCode, promptId, filename, sizeBytes },
    });

    return { shortCode };
  },
});

/** Public read for the /d/{code} page. Returns only display fields —
 *  never the storageId, the userId, or any other internal handle. The
 *  download happens through the matching API route, not via the URL
 *  this returns. */
export const getPublic = query({
  args: { shortCode: v.string() },
  handler: async (ctx, { shortCode }) => {
    const row = await ctx.db
      .query("shareLinks")
      .withIndex("by_short", (q) => q.eq("shortCode", shortCode))
      .unique();
    if (!row) return null;

    const now = Date.now();
    const expired = row.expiresAt <= now;

    // If the underlying blob has already been cleaned up by the
    // expireOldFiles cron, the storage system.get will be missing.
    // We treat that the same as expired in the UI.
    const meta = await ctx.db.system.get(row.storageId);
    const filePresent = Boolean(meta);

    return {
      shortCode: row.shortCode,
      filename: row.filename,
      sizeBytes: row.sizeBytes,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      revoked: row.revoked,
      expired,
      filePresent,
      viewCount: row.viewCount,
    };
  },
});

/** Server-side resolver used by the /api/d/{code} download route. Returns
 *  a fresh signed storage URL on every call so the share survives the
 *  underlying URL's short TTL. Returns null on revoked / expired / blob-
 *  gone, with the reason; the route turns that into a friendly redirect.
 *  Auth is not required — share links are public by design. */
export const resolveForDownload = query({
  args: { shortCode: v.string() },
  handler: async (ctx, { shortCode }) => {
    const row = await ctx.db
      .query("shareLinks")
      .withIndex("by_short", (q) => q.eq("shortCode", shortCode))
      .unique();
    if (!row) return { ok: false, reason: "not_found" };
    if (row.revoked) return { ok: false, reason: "revoked" };
    if (row.expiresAt <= Date.now()) return { ok: false, reason: "expired" };

    const url = await ctx.storage.getUrl(row.storageId);
    if (!url) return { ok: false, reason: "deleted" };

    return {
      ok: true,
      url,
      filename: row.filename,
    };
  },
});

/** Bump the view counter — fire-and-forget from the public download
 *  route. Separate mutation so the public query above stays read-only. */
export const bumpView = mutation({
  args: { shortCode: v.string() },
  handler: async (ctx, { shortCode }) => {
    const row = await ctx.db
      .query("shareLinks")
      .withIndex("by_short", (q) => q.eq("shortCode", shortCode))
      .unique();
    if (!row) return;
    await ctx.db.patch(row._id, { viewCount: row.viewCount + 1 });
    await ctx.runMutation(internal.events.logInternal, {
      userId: row.userId,
      name: "share_link_viewed",
      props: { shortCode },
    });
  },
});

/** Revoke a link before its 24h expiry. Owner only. */
export const revoke = mutation({
  args: { shortCode: v.string() },
  handler: async (ctx, { shortCode }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const row = await ctx.db
      .query("shareLinks")
      .withIndex("by_short", (q) => q.eq("shortCode", shortCode))
      .unique();
    if (!row || row.userId !== userId) throw new Error("Not found");
    if (row.revoked) return;
    await ctx.db.patch(row._id, { revoked: true });
  },
});
