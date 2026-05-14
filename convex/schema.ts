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
  })
    .index("by_user_recent", ["userId"])
    .index("by_chat", ["chatId", "turnIndex"])
    .index("by_status", ["status"]),

  // Visual workflows on the canvas
  workflows: defineTable({
    userId: v.id("users"),
    name: v.string(),
    nodes: v.any(),
    edges: v.any(),
  }).index("by_user", ["userId"]),
});
