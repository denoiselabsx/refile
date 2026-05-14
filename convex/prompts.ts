import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/* ──────────────────────────────────────────────────────────────── *
 *  File upload helpers
 *  Client flow: call generateUploadUrl → POST file → call create
 * ──────────────────────────────────────────────────────────────── */

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");
    return ctx.storage.generateUploadUrl();
  },
});

export const getDownloadUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.storage.getUrl(storageId);
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  History
 * ──────────────────────────────────────────────────────────────── */

export const listMine = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("prompts")
      .withIndex("by_user_recent", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 30);
  },
});

export const get = query({
  args: { id: v.id("prompts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const prompt = await ctx.db.get(id);
    if (!prompt || prompt.userId !== userId) return null;

    // Attach signed URLs for outputs (Convex storage returns short-lived URLs)
    const outputUrls = prompt.outputStorageIds
      ? await Promise.all(
          prompt.outputStorageIds.map(async (sid, i) => ({
            storageId: sid,
            filename: prompt.outputFilenames?.[i] ?? "output",
            url: await ctx.storage.getUrl(sid),
          }))
        )
      : [];

    return { ...prompt, outputUrls };
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  Submit a new prompt (kicks off Groq + Sandbox via action)
 * ──────────────────────────────────────────────────────────────── */

export const submit = mutation({
  args: {
    prompt: v.string(),
    inputStorageIds: v.array(v.id("_storage")),
    inputFilenames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    const promptId = await ctx.db.insert("prompts", {
      userId,
      prompt: args.prompt,
      inputStorageIds: args.inputStorageIds,
      inputFilenames: args.inputFilenames,
      status: "pending",
    });

    // Schedule the action (runs out-of-band, immediately)
    await ctx.scheduler.runAfter(0, internal.runJob.runJob, { promptId });

    return promptId;
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  Internal updates from runJob
 * ──────────────────────────────────────────────────────────────── */

export const patchAiResponse = internalMutation({
  args: {
    promptId: v.id("prompts"),
    aiCommand: v.optional(v.string()),
    aiCommandTemplate: v.optional(v.string()),
    aiDescription: v.optional(v.string()),
    aiTool: v.optional(v.string()),
    aiInputFiles: v.optional(v.array(v.string())),
    aiOutputFiles: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
  },
  handler: async (ctx, { promptId, ...patch }) => {
    await ctx.db.patch(promptId, patch);
  },
});

export const patchExecution = internalMutation({
  args: {
    promptId: v.id("prompts"),
    outputStorageIds: v.optional(v.array(v.id("_storage"))),
    outputFilenames: v.optional(v.array(v.string())),
    sandboxLogs: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, { promptId, ...patch }) => {
    await ctx.db.patch(promptId, patch);
  },
});
