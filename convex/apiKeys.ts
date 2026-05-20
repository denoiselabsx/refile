import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function assertBridgeSecret(provided: string) {
  const expected = process.env.API_BRIDGE_SECRET;
  if (!expected) throw new Error("API_BRIDGE_SECRET is not set");
  if (provided !== expected) throw new Error("Invalid bridge secret.");
}

// Public shape — never exposes keyHash. Used by the dashboard.
function publicKey(row: any) {
  return {
    id: row._id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt ?? null,
    revokedAt: row.revokedAt ?? null,
    scopes: row.scopes,
  };
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    // Newest first; show revoked keys too (UI greys them out)
    rows.sort((a, b) => b.createdAt - a.createdAt);
    return rows.map(publicKey);
  },
});

// Create a key. The caller passes the already-generated prefix + hash
// (generation happens in the Next.js route so the raw key stays out of
// Convex logs). Returns the public shape; the route layer is responsible
// for revealing the raw key to the user EXACTLY ONCE.
export const create = mutation({
  args: {
    name: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
    scopes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const name = args.name.trim().slice(0, 60) || "Untitled key";
    const id = await ctx.db.insert("apiKeys", {
      userId,
      name,
      keyHash: args.keyHash,
      keyPrefix: args.keyPrefix,
      createdAt: Date.now(),
      scopes: args.scopes ?? ["jobs:write", "jobs:read"],
    });
    const row = await ctx.db.get(id);
    return publicKey(row);
  },
});

export const revoke = mutation({
  args: { id: v.id("apiKeys") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Key not found");
    if (row.revokedAt) return; // idempotent
    await ctx.db.patch(id, { revokedAt: Date.now() });
  },
});

// Server-to-server lookup. Called from Next.js /api/v1/* routes via
// ConvexHttpClient + the bridge secret. Returns null on miss/revoked so
// the route layer can return a clean 401 without throwing.
export const resolveKey = mutation({
  args: {
    secret: v.string(),
    keyHash: v.string(),
  },
  handler: async (ctx, { secret, keyHash }) => {
    assertBridgeSecret(secret);
    const row = await ctx.db
      .query("apiKeys")
      .withIndex("by_keyHash", (q) => q.eq("keyHash", keyHash))
      .unique();
    if (!row) return null;
    if (row.revokedAt) return null;
    // Touch lastUsedAt; doesn't block the response semantically.
    await ctx.db.patch(row._id, { lastUsedAt: Date.now() });
    return {
      userId: row.userId,
      scopes: row.scopes,
      keyId: row._id,
    };
  },
});

// Server-to-server upload URL. Mirrors prompts.generateUploadUrl but
// uses the bridge secret instead of a Convex Auth session. Returned URL
// is the standard Convex storage upload endpoint — valid ~30 minutes.
export const generateUploadUrlForUser = mutation({
  args: {
    secret: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { secret, userId }) => {
    assertBridgeSecret(secret);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    return await ctx.storage.generateUploadUrl();
  },
});
