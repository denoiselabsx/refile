import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import { assertWithinQuota, assertApiAllowed } from "./plans";
import { publicPrompt } from "../lib/sanitize.js";

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
    const rows = await ctx.db
      .query("prompts")
      .withIndex("by_user_recent", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 30);
    return rows.map(publicPrompt);
  },
});

/**
 * Admin-only failure inspector. Returns the FULL prompt row — including
 * the raw command, sandbox logs, and errorMessage — for a specific id.
 * Regular `get` and `listMine` deliberately scrub those (hide-tool-
 * internals), so this is the only path that surfaces them.
 *
 * Used by the chat UI's "View logs (admin)" disclosure on failed turns
 * so live ad-hoc triage doesn't require Convex dashboard spelunking.
 */
export const adminDebug = query({
  args: { id: v.id("prompts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const role = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (role?.role !== "admin") return null;
    const row = await ctx.db.get(id);
    if (!row) return null;
    // Surface the raw fields. The browser only renders this in the
    // admin-gated FailureCard branch, and the query itself is gated,
    // so non-admins can't read this even by guessing prompt ids.
    return {
      _id: row._id,
      prompt: row.prompt,
      inputFilenames: row.inputFilenames,
      status: row.status,
      failureKind: row.failureKind,
      aiKind: row.aiKind,
      aiTool: row.aiTool,
      aiCommand: row.aiCommand,
      aiDescription: row.aiDescription,
      aiInputFiles: row.aiInputFiles,
      aiOutputFiles: row.aiOutputFiles,
      sandboxLogs: row.sandboxLogs,
      errorMessage: row.errorMessage,
      pipelineSteps: row.pipelineSteps,
    };
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

    // Never ship the command machinery (tool names, raw commands, sandbox
    // logs) to the browser — ReFile sells the outcome, not the toolbox.
    return { ...publicPrompt(prompt), outputUrls };
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  Submit a new prompt (kicks off Groq + Sandbox via action)
 * ──────────────────────────────────────────────────────────────── */

function sanitizeFilename(name: string): string {
  // Replace anything that's not alphanumeric, dot, dash, or underscore with _.
  // Then strip any leading dots/dashes: a leading "." is a hidden file, and a
  // leading "-" makes the name look like a CLI flag to GNU/Click-style arg
  // parsers (rembg, ffmpeg, magick, gs, ...). Single-quoting in the shell does
  // NOT protect against this — the tool's own parser still sees the dash and
  // fails with e.g. `Error: No such option: -7`. Neutralize it here, once, so
  // every downstream command is safe regardless of what the AI generates.
  const cleaned = name
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^[.\-]+/, "");
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

    // File resolution for this turn, in priority order:
    //   1. Files attached to THIS submit call (explicit upload).
    //   2. A file the user named literally in their prompt that exists
    //      in the chat's existing uploads (input or prior output). This
    //      stops the auto-chain from silently using x_resized.png when
    //      the user clearly typed "Screenshot from 2026-05-20…png".
    //   3. Auto-chain: the previous successful turn's outputs (legacy
    //      "make it smaller" follow-up behavior).
    let inputStorageIds = args.inputStorageIds;
    let inputFilenames = args.inputFilenames.map(sanitizeFilename);
    let autoChained = false;
    let chainedFromPromptId: Id<"prompts"> | undefined;

    if (inputStorageIds.length === 0 && existingTurns.length > 0) {
      // Collect every (storageId, filename) pair this chat has seen so we
      // can match a filename literally typed in the prompt against it.
      // Inputs come straight from each turn's inputStorageIds; outputs
      // from outputStorageIds. We dedupe by storageId.
      const seen = new Map<string, string>(); // storageId -> filename
      for (const t of existingTurns) {
        for (let i = 0; i < (t.inputStorageIds?.length ?? 0); i++) {
          const sid = t.inputStorageIds[i] as unknown as string;
          if (!seen.has(sid)) seen.set(sid, t.inputFilenames?.[i] ?? "file");
        }
        for (let i = 0; i < (t.outputStorageIds?.length ?? 0); i++) {
          const sid = t.outputStorageIds![i] as unknown as string;
          if (!seen.has(sid)) seen.set(sid, t.outputFilenames?.[i] ?? "file");
        }
      }

      // Match by literal substring. We don't want to do anything clever
      // here — if the user wrote `screenshot from 2026-05-20`, we check
      // whether any known filename (case-insensitive) contains that
      // exact substring after normalizing spaces ↔ underscores. This
      // handles the very common case of the user typing the displayed
      // filename verbatim instead of with @-mention.
      const promptNorm = args.prompt.toLowerCase().replace(/[_\s]+/g, " ");
      const matched: Array<{ sid: string; name: string }> = [];
      for (const [sid, name] of seen.entries()) {
        const nameNorm = name.toLowerCase().replace(/[_\s]+/g, " ");
        // Require at least 6 chars to match so two-letter overlaps
        // (e.g. "to") don't trigger.
        if (nameNorm.length >= 6 && promptNorm.includes(nameNorm)) {
          matched.push({ sid, name });
        }
      }
      if (matched.length > 0) {
        inputStorageIds = matched.map((m) => m.sid) as unknown as typeof inputStorageIds;
        inputFilenames = matched.map((m) => sanitizeFilename(m.name));
      } else {
        // Fall back to the original auto-chain behavior.
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
          inputFilenames = lastWithOutputs.outputFilenames!.map(
            sanitizeFilename
          );
          autoChained = true;
          chainedFromPromptId = lastWithOutputs._id;
        }
      }
    }

    // No input files? That's OK — the AI may answer in chat mode.
    // If it picks command mode it will fail with a clear error.

    // Quota gate. Resolve real byte sizes from Convex storage metadata so the
    // file-size cap is enforced on actual bytes, not a client-claimed number.
    // We cap on the largest single file (single-file plans) / total bytes
    // (batch plans) — assertWithinQuota receives the sum, which is the
    // largest file when there is only one. Runs only for command-capable
    // requests (i.e. when files are present); pure chat turns are free.
    if (inputStorageIds.length > 0) {
      let totalBytes = 0;
      for (const sid of inputStorageIds) {
        const meta = await ctx.db.system.get(sid);
        totalBytes += meta?.size ?? 0;
      }
      await assertWithinQuota(
        ctx,
        userId,
        inputStorageIds.length,
        totalBytes
      );
    }

    const promptId = await ctx.db.insert("prompts", {
      userId,
      chatId,
      turnIndex,
      prompt: args.prompt,
      inputStorageIds,
      inputFilenames,
      status: "pending",
      ...(chainedFromPromptId
        ? { chainedFromPromptId }
        : {}),
    });

    // Bump the chat's lastActivity so it sorts to the top.
    await ctx.db.patch(chatId, { lastActivity: Date.now() });

    // Analytics: conversion started. follow_up_used fires only when the
    // turn genuinely auto-chained from previous outputs — not when we
    // matched by filename, since that's just "the user picked a file".
    const isFollowUp = autoChained;
    await ctx.runMutation(internal.events.logInternal, {
      userId,
      name: "conversion_started",
      props: {
        promptId,
        chatId,
        turnIndex,
        fileCount: inputStorageIds.length,
        source: "ui",
      },
    });
    if (isFollowUp) {
      await ctx.runMutation(internal.events.logInternal, {
        userId,
        name: "follow_up_used",
        props: { promptId, chatId, turnIndex },
      });
    }

    // Schedule the action (runs out-of-band, immediately)
    await ctx.scheduler.runAfter(0, internal.runJob.runJob, { promptId });

    return { promptId, chatId };
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  Server-to-server submit (called by the public API routes).
 *  Bridge-secret-guarded (same pattern as plans.applyPolarSubscription).
 *  Does NOT call getAuthUserId — userId is passed explicitly after the
 *  Next.js route validates the API key. Sets `source: "api"` on the row
 *  so analytics / per-step billing can distinguish API jobs from browser
 *  jobs without affecting the existing flow.
 * ──────────────────────────────────────────────────────────────── */
export const submitForUser = mutation({
  args: {
    secret: v.string(),
    userId: v.id("users"),
    prompt: v.string(),
    inputStorageIds: v.array(v.id("_storage")),
    inputFilenames: v.array(v.string()),
    chatId: v.optional(v.id("chats")),
    webhookUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.API_BRIDGE_SECRET;
    if (!expected) throw new Error("API_BRIDGE_SECRET is not set");
    if (args.secret !== expected) throw new Error("Invalid bridge secret.");

    const userId = args.userId;
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Resolve or create the chat for this turn. API callers can omit chatId —
    // we create a synthetic chat per submission for history continuity.
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

    const existingTurns = await ctx.db
      .query("prompts")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId!))
      .collect();
    const turnIndex = existingTurns.length;

    const inputStorageIds = args.inputStorageIds;
    const inputFilenames = args.inputFilenames.map(sanitizeFilename);

    if (inputStorageIds.length > 0) {
      let totalBytes = 0;
      for (const sid of inputStorageIds) {
        const meta = await ctx.db.system.get(sid);
        totalBytes += meta?.size ?? 0;
      }
      // API gate runs first — payment_required wins over plan-level
      // quota_exceeded when both could match (e.g. a 50MB file on a
      // brand-new account would hit the API 10MB cap before the Free
      // plan's larger cap).
      await assertApiAllowed(
        ctx,
        userId,
        inputStorageIds.length,
        totalBytes
      );
      await assertWithinQuota(
        ctx,
        userId,
        inputStorageIds.length,
        totalBytes
      );
    }

    const promptId = await ctx.db.insert("prompts", {
      userId,
      chatId,
      turnIndex,
      prompt: args.prompt,
      inputStorageIds,
      inputFilenames,
      status: "pending",
      // source + webhookUrl are new columns added in this phase; the schema
      // patch in this same commit makes them optional so existing rows are
      // valid. webhookUrl is only meaningful for API rows.
      source: "api" as const,
      webhookUrl: args.webhookUrl,
    });

    await ctx.db.patch(chatId, { lastActivity: Date.now() });
    await ctx.scheduler.runAfter(0, internal.runJob.runJob, { promptId });

    return { promptId, chatId };
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  Server-to-server job fetch (called by GET /api/v1/jobs/:id).
 *  Bridge-secret-guarded. Returns the sanitized API shape — never the
 *  internal command, tool name, sandbox logs, or error message verbatim.
 *  Maps Convex's "completed" status to "succeeded" for API consumers
 *  (industry-standard naming).
 * ──────────────────────────────────────────────────────────────── */
export const getForApi = query({
  args: {
    secret: v.string(),
    promptId: v.id("prompts"),
    userId: v.id("users"),
  },
  handler: async (ctx, { secret, promptId, userId }) => {
    const expected = process.env.API_BRIDGE_SECRET;
    if (!expected) throw new Error("API_BRIDGE_SECRET is not set");
    if (secret !== expected) throw new Error("Invalid bridge secret.");

    const row = await ctx.db.get(promptId);
    if (!row || row.userId !== userId) return null;

    // Outputs: signed URLs. Filtered out if files have expired.
    const outputs = row.outputStorageIds
      ? await Promise.all(
          row.outputStorageIds.map(async (sid, i) => ({
            storageId: sid as string,
            filename: row.outputFilenames?.[i] ?? "output",
            url: await ctx.storage.getUrl(sid),
          }))
        )
      : [];

    // Pipeline summary — surface count + statuses, but never commands/logs.
    const pipeline = row.pipelineSteps
      ? row.pipelineSteps.map((s) => ({
          description: s.description,
          status: s.status,
        }))
      : null;

    // Map internal status → API status. "completed" → "succeeded".
    const apiStatus =
      row.status === "completed"
        ? "succeeded"
        : (row.status as "pending" | "generating" | "running" | "failed");

    // Failure: surface coarse failureKind + generic message. NEVER leak
    // raw errorMessage (which contains tool names, paths, stderr).
    let errorBody: { code: string; message: string } | undefined;
    if (row.status === "failed") {
      const kind = row.failureKind ?? "aiError";
      errorBody = mapFailureKindToApi(kind);
    }

    return {
      id: row._id,
      chat_id: row.chatId ?? null,
      status: apiStatus,
      description: row.aiDescription ?? null,
      kind: row.aiKind ?? null, // "command" | "chat"
      message: row.aiKind === "chat" ? (row.aiMessage ?? null) : null,
      input_files: row.inputFilenames ?? [],
      outputs,
      pipeline,
      files_expired: row.filesExpired ?? false,
      created_at: row._creationTime,
      error: errorBody,
    };
  },
});

// Coarse failure taxonomy → API error body. Keep messages generic and
// actionable; never reference tool names or internal infrastructure.
function mapFailureKindToApi(kind: string): { code: string; message: string } {
  switch (kind) {
    case "complex":
      return {
        code: "unprocessable_request",
        message: "The request was too complex to handle in one shot. Break it into smaller steps.",
      };
    case "noInput":
      return {
        code: "invalid_request",
        message: "No file was provided for an operation that requires one.",
      };
    case "noOutput":
      return {
        code: "no_output",
        message: "The job ran but produced no output. Check the input file and prompt.",
      };
    case "execError":
      return {
        code: "execution_failed",
        message: "The job failed on this particular file. It may be corrupt, an unsupported format, or password-protected.",
      };
    case "config":
      return { code: "internal_error", message: "A temporary service problem occurred. Please retry." };
    case "aiError":
    default:
      return {
        code: "unprocessable_request",
        message: "Could not understand the request. Try describing the end result in plain words.",
      };
  }
}

/* ──────────────────────────────────────────────────────────────── *
 *  Webhook delivery helper
 *  Read by convex/webhooks.ts (node action) to learn whether a
 *  webhook should fire and under whose user identity to fetch the
 *  sanitized payload. Lives here (not webhooks.ts) because Node-
 *  runtime files can't define queries.
 * ──────────────────────────────────────────────────────────────── */
export const getWebhookDeliveryInfo = internalQuery({
  args: { promptId: v.id("prompts") },
  handler: async (ctx, { promptId }) => {
    const row = await ctx.db.get(promptId);
    if (!row) return null;
    return {
      userId: row.userId,
      webhookUrl: row.webhookUrl ?? null,
    };
  },
});

/* ──────────────────────────────────────────────────────────────── *
 *  Internal updates from runJob
 * ──────────────────────────────────────────────────────────────── */

export const patchAiResponse = internalMutation({
  args: {
    promptId: v.id("prompts"),
    aiKind: v.optional(v.union(v.literal("command"), v.literal("chat"))),
    aiMessage: v.optional(v.string()),
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
    // Detect a fresh terminal transition (non-terminal → completed/failed)
    // so we can fire the API webhook exactly once per job. Done by reading
    // the row BEFORE the patch — `patch.status` may be undefined if this
    // call is only updating AI metadata, so we must compare prev → next
    // explicitly.
    const prev = await ctx.db.get(promptId);
    const wasTerminal =
      prev?.status === "completed" || prev?.status === "failed";
    await ctx.db.patch(promptId, patch);
    const nextStatus = patch.status ?? prev?.status;
    const isTerminal = nextStatus === "completed" || nextStatus === "failed";
    if (!wasTerminal && isTerminal) {
      if (prev?.webhookUrl) {
        await ctx.scheduler.runAfter(0, internal.webhooks.deliverJobWebhook, {
          promptId,
        });
      }
      await fireTerminalEvent(ctx, promptId, nextStatus);
    }
  },
});

// Rewrites the whole pipelineSteps array. The array is small (≤6) and the
// runJob loop owns it in memory, so a full rewrite per transition is simpler
// and cheaper than index-addressed partial patches.
export const patchPipeline = internalMutation({
  args: {
    promptId: v.id("prompts"),
    pipelineSteps: v.array(
      v.object({
        description: v.string(),
        tool: v.string(),
        command: v.string(),
        status: v.union(
          v.literal("pending"),
          v.literal("running"),
          v.literal("completed"),
          v.literal("failed")
        ),
        logs: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { promptId, pipelineSteps }) => {
    await ctx.db.patch(promptId, { pipelineSteps });
  },
});

export const patchExecution = internalMutation({
  args: {
    promptId: v.id("prompts"),
    outputStorageIds: v.optional(v.array(v.id("_storage"))),
    outputFilenames: v.optional(v.array(v.string())),
    sandboxLogs: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    failureKind: v.optional(
      v.union(
        v.literal("complex"),
        v.literal("noInput"),
        v.literal("noOutput"),
        v.literal("execError"),
        v.literal("config"),
        v.literal("aiError")
      )
    ),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, { promptId, ...patch }) => {
    // Same terminal-transition guard as patchAiResponse — fires the API
    // webhook exactly once when the row first reaches completed/failed.
    const prev = await ctx.db.get(promptId);
    const wasTerminal =
      prev?.status === "completed" || prev?.status === "failed";
    await ctx.db.patch(promptId, patch);
    const isTerminal = patch.status === "completed" || patch.status === "failed";
    if (!wasTerminal && isTerminal) {
      if (prev?.webhookUrl) {
        await ctx.scheduler.runAfter(0, internal.webhooks.deliverJobWebhook, {
          promptId,
        });
      }
      await fireTerminalEvent(ctx, promptId, patch.status);
    }
  },
});

// Shared analytics fire-once helper for the two patch* paths above. Reads
// the just-patched row so failureKind / source are accurate. We pass status
// explicitly because patchAiResponse may not include it in the patch arg.
async function fireTerminalEvent(
  ctx: any,
  promptId: any,
  status: "completed" | "failed" | "pending" | "generating" | "running"
) {
  const row = await ctx.db.get(promptId);
  if (!row) return;
  if (status === "completed") {
    await ctx.runMutation(internal.events.logInternal, {
      userId: row.userId,
      name: "conversion_completed",
      props: {
        promptId,
        source: row.source ?? "ui",
        tool: row.aiTool,
        kind: row.aiKind,
      },
    });
  } else if (status === "failed") {
    await ctx.runMutation(internal.events.logInternal, {
      userId: row.userId,
      name: "conversion_failed",
      props: {
        promptId,
        source: row.source ?? "ui",
        tool: row.aiTool,
        failureKind: row.failureKind ?? "complex",
      },
    });
  }
}
