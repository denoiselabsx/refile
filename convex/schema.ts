import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Convex Auth tables: users, sessions, accounts, etc.
  ...authTables,

  // Roles tied to a user (kept separate so role changes don't churn users table)
  userRoles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  }).index("by_user", ["userId"]),

  // Billing plan per user. Separate table (same reasoning as userRoles): the
  // users table is managed by Convex Auth, so we keep mutable app state out of
  // it. Absence of a row means the Free plan (see lib/plans.js DEFAULT_PLAN).
  userPlans: defineTable({
    userId: v.id("users"),
    plan: v.union(
      v.literal("free"),
      v.literal("student"),
      v.literal("pro"),
      v.literal("power")
    ),
    // Set when the plan last changed (manual or via a Polar webhook). Audit only.
    updatedAt: v.number(),
    // Pricing region this user is billed under: "global" or "IN". Set by the
    // subscription webhook (derived from which regional Polar product they
    // bought, then verified against their Polar billing country). Absent =
    // "global". Quotas are identical across regions — this only affects the
    // displayed/charged price.
    region: v.optional(v.string()),
    // True if the user bought an India-priced product from a non-India
    // billing country (IP-spoof case). Their region is forced to "global"
    // and this flag is set for review. Audit/abuse surface only.
    regionMismatch: v.optional(v.boolean()),
    // Timestamp the user finished the post-signup onboarding flow. Absent =
    // not onboarded yet → the app shows the onboarding modal once.
    onboardedAt: v.optional(v.number()),
    // Polar billing linkage. Set by the subscription webhook. customerId lets
    // the Customer Portal route resolve the right Polar customer;
    // subscriptionId + status/periodEnd let us reason about lifecycle without
    // re-querying Polar. Absent = no paid subscription (Free).
    polarCustomerId: v.optional(v.string()),
    polarSubscriptionId: v.optional(v.string()),
    polarSubscriptionStatus: v.optional(v.string()),
    polarCurrentPeriodEnd: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Per-user, per-month metered usage. One row per (user, month) where month
  // is "YYYY-MM" in UTC. Written by the runJob metering step ONLY on a
  // successful conversion, so failures are never counted or charged. The
  // Groq/Modal columns track real provider cost so the dashboard can show an
  // accurate breakdown and we can add a markup at monthly payout.
  userUsage: defineTable({
    userId: v.id("users"),
    month: v.string(), // "2026-05"
    conversions: v.number(),
    groqInputTokens: v.number(),
    groqOutputTokens: v.number(),
    modalMs: v.number(), // wall-clock proxy for Modal compute time
    bytesProcessed: v.number(),
  }).index("by_user_month", ["userId", "month"]),

  // Reusable shell-command recipes
  presets: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    category: v.string(), // image, video, audio, pdf, document, archive, other
    tool: v.string(), // imagemagick, ffmpeg, poppler, pandoc, ghostscript, qpdf, custom
    commandTemplate: v.string(),
    inputFilePatterns: v.array(
      v.object({
        name: v.string(),
        extensions: v.array(v.string()),
        description: v.optional(v.string()),
      })
    ),
    outputFilePatterns: v.array(
      v.object({
        name: v.string(),
        template: v.optional(v.string()),
        description: v.optional(v.string()),
      })
    ),
    tags: v.array(v.string()),
    isPublic: v.boolean(),
    isVerified: v.boolean(),
    likesCount: v.number(),
    usageCount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["category", "isPublic"])
    .index("by_public_recent", ["isPublic"])
    .searchIndex("by_text", {
      searchField: "name",
      filterFields: ["category", "tool", "isPublic"],
    }),

  presetLikes: defineTable({
    userId: v.id("users"),
    presetId: v.id("presets"),
  })
    .index("by_user", ["userId"])
    .index("by_preset", ["presetId"])
    .index("by_user_and_preset", ["userId", "presetId"]),

  // A chat = a conversation session containing multiple turns (prompts).
  chats: defineTable({
    userId: v.id("users"),
    title: v.string(),
    lastActivity: v.number(),
  })
    .index("by_user_recent", ["userId", "lastActivity"]),

  // A prompt = one chat turn: user prompt + AI command + execution result
  prompts: defineTable({
    userId: v.id("users"),
    // chatId is optional only for legacy rows; new turns always have one.
    chatId: v.optional(v.id("chats")),
    turnIndex: v.optional(v.number()),
    prompt: v.string(),
    inputStorageIds: v.array(v.id("_storage")),
    inputFilenames: v.array(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    // Set after Groq returns
    aiKind: v.optional(v.union(v.literal("command"), v.literal("chat"))),
    aiMessage: v.optional(v.string()), // set when aiKind === "chat"
    aiCommand: v.optional(v.string()),
    aiCommandTemplate: v.optional(v.string()),
    aiDescription: v.optional(v.string()),
    aiTool: v.optional(v.string()),
    aiInputFiles: v.optional(v.array(v.string())),
    aiOutputFiles: v.optional(v.array(v.string())),
    // Populated after sandbox execution
    outputStorageIds: v.optional(v.array(v.id("_storage"))),
    outputFilenames: v.optional(v.array(v.string())),
    sandboxLogs: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    // Coarse failure category, set alongside status:"failed". Drives the
    // user-facing copy so a missing-file or infra error is NOT mislabeled
    // as "you asked for too much". errorMessage stays internal (logs/admin);
    // failureKind is the only failure signal the browser is allowed to act
    // on. "complex" = genuinely too much in one shot (the old default).
    failureKind: v.optional(
      v.union(
        v.literal("complex"), // request too complex / plan rejected
        v.literal("noInput"), // no file uploaded for a file operation
        v.literal("noOutput"), // command ran but produced nothing
        v.literal("execError"), // tool errored at runtime
        v.literal("config"), // server misconfig (no key / worker)
        v.literal("aiError") // AI generation itself failed
      )
    ),
    // Multi-tool pipeline (kind="pipeline"). One entry per step, in order.
    // The whole array is rewritten on each step transition (≤6 entries).
    // Only the LAST step's outputs become outputStorageIds; intermediates
    // are discarded. Absent for single-command / chat turns.
    pipelineSteps: v.optional(
      v.array(
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
      )
    ),
    // Set by the cleanup cron once the blobs are deleted from storage.
    // The history row stays; only file URLs become unavailable.
    filesExpired: v.optional(v.boolean()),
    // Idempotency guard for Polar usage billing: set true once this
    // conversion's usage event has been ingested to Polar. runJob skips
    // ingestion if already true, so a runJob retry can't double-bill.
    billedToPolar: v.optional(v.boolean()),
    // Origin of this row. "api" = submitted via the public REST API.
    // Absent = browser/UI. Used to drive per-step billing and analytics.
    source: v.optional(v.union(v.literal("api"), v.literal("ui"))),
    // For API submissions: the customer's webhook URL to POST job
    // settlement to. Absent = no webhook configured. The Phase 3
    // post-settlement action reads this column.
    webhookUrl: v.optional(v.string()),
  })
    .index("by_user_recent", ["userId"])
    .index("by_chat", ["chatId", "turnIndex"])
    .index("by_status", ["status"]),

  // Self-improving loop: distilled lessons learned from clustered job
  // failures. The reviewFailures cron writes rows as "pending"; an admin
  // approves/rejects. runJob only ever injects "approved" rows into the
  // prompt — the hand-written SYSTEM_PROMPT is never mutated.
  learnedLessons: defineTable({
    // One-line human-readable summary of the failure pattern.
    title: v.string(),
    // The distilled lesson, written as an instruction the model can follow.
    // This is what gets appended to the prompt when approved.
    lesson: v.string(),
    // Stable signature of the error cluster (e.g. tool + normalized error
    // phrase). Used to dedupe so the cron doesn't re-file the same lesson.
    signature: v.string(),
    // Which sandbox tool the failures involved (imagemagick, ffmpeg, ...).
    tool: v.string(),
    // How many distinct failed prompts fed this lesson.
    occurrences: v.number(),
    // Example evidence so a human can judge without DB spelunking.
    examplePrompt: v.string(),
    exampleCommand: v.string(),
    exampleError: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      // Superseded: the cron saw new occurrences and refreshed the row.
      v.literal("superseded")
    ),
    // Audit trail for the human decision.
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    reviewNote: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_signature", ["signature"]),

  // Visual workflows on the canvas
  workflows: defineTable({
    userId: v.id("users"),
    name: v.string(),
    nodes: v.any(),
    edges: v.any(),
  }).index("by_user", ["userId"]),

  // API keys for the public REST API. Each row = one credential a user can
  // use to call /api/v1/*. The raw key is NEVER stored — only its sha256
  // hash. We keep the first 8 chars of the raw key (the "prefix") for UI
  // display so users can recognize keys without seeing the secret.
  apiKeys: defineTable({
    userId: v.id("users"),
    name: v.string(),              // user-supplied label, e.g. "production"
    keyHash: v.string(),           // sha256(rawKey), the lookup key
    keyPrefix: v.string(),         // first 11 chars of raw key for display ("rf_live_abc")
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()), // soft-delete; resolveKey rejects revoked keys
    scopes: v.array(v.string()),   // future-proof; for v1 always ["jobs:write","jobs:read"]
  })
    .index("by_user", ["userId"])
    .index("by_keyHash", ["keyHash"]),
});
