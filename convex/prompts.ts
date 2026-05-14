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

function sanitizeFilename(name: string): string {
  // Replace anything that's not alphanumeric, dot, dash, or underscore with _
  // Avoid empty result, leading dot, or filesystem-unfriendly chars.
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "");
  return cleaned || "file";
}

function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 40) return trimmed || "New chat";
  return trimmed.slice(0, 40).trimEnd() + "…";
}

export const submit = mutation({
  args: {
    prompt: v.string(),
    inputStorageIds: v.array(v.id("_storage")),
    inputFilenames: v.array(v.string()),
    chatId: v.optional(v.id("chats")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in");

    // Resolve or create the chat for this turn.
    let chatId = args.chatId;
    if (chatId) {
      const chat = await ctx.db.get(chatId);
      if (!chat || chat.userId !== userId) throw new Error("Chat not found");
    } else {
      chatId = await ctx.db.insert("chats", {
        userId,
        title: titleFromPrompt(args.prompt),
        lastActivity: Date.now(),
      });
    }

    // Compute the next turn index within this chat.
    const existingTurns = await ctx.db
      .query("prompts")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId!))
      .collect();
    const turnIndex = existingTurns.length;

    // Auto-chain: if no new uploads were provided AND we have a prior successful
    // turn, reuse the previous turn's outputs as this turn's inputs.
    let inputStorageIds = args.inputStorageIds;
    let inputFilenames = args.inputFilenames.map(sanitizeFilename);

    if (inputStorageIds.length === 0 && existingTurns.length > 0) {
      const lastWithOutputs = [...existingTurns]
        .sort((a, b) => (b.turnIndex ?? 0) - (a.turnIndex ?? 0))
        .find(
          (t) =>
            t.status === "completed" &&
            (t.outputStorageIds?.length ?? 0) > 0 &&
            (t.outputFilenames?.length ?? 0) > 0
        );
      if (lastWithOutputs) {
        inputStorageIds = lastWithOutputs.outputStorageIds!;
        inputFilenames = lastWithOutputs.outputFilenames!.map(sanitizeFilename);
      }
    }

    if (inputStorageIds.length === 0) {
      throw new Error("No input files provided and no previous output to chain from.");
    }

    const promptId = await ctx.db.insert("prompts", {
      userId,
      chatId,
      turnIndex,
      prompt: args.prompt,
      inputStorageIds,
      inputFilenames,
      status: "pending",
    });

    // Bump the chat's lastActivity so it sorts to the top.
    await ctx.db.patch(chatId, { lastActivity: Date.now() });

    // Schedule the action (runs out-of-band, immediately)
    await ctx.scheduler.runAfter(0, internal.runJob.runJob, { promptId });

    return { promptId, chatId };
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
