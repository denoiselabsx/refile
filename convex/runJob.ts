"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";

/* ──────────────────────────────────────────────────────────────── *
 *  Structured AI response schema
 * ──────────────────────────────────────────────────────────────── */

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  txt: "text/plain",
  md: "text/markdown",
  html: "text/html",
  json: "application/json",
  zip: "application/zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function mimeFromFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

const AIResponse = z.object({
  kind: z
    .enum(["command", "chat"])
    .describe(
      "'command' when the user wants a file operation; 'chat' for explanations, clarifications, questions, or anything that doesn't need to run a shell command."
    ),
  // Chat-only field.
  message: z
    .string()
    .optional()
    .describe(
      "When kind='chat', a markdown reply to the user (explanation, question, suggestion). Omit when kind='command'."
    ),
  // Command-only fields (all optional so the model can omit them on chat).
  description: z
    .string()
    .optional()
    .describe("When kind='command', one sentence explaining the command."),
  tool: z
    .enum([
      "ffmpeg",
      "imagemagick",
      "qpdf",
      "ghostscript",
      "poppler",
      "pandoc",
      "tesseract",
      "other",
    ])
    .optional()
    .describe("When kind='command', the primary tool used."),
  command: z
    .string()
    .optional()
    .describe(
      "When kind='command', the exact shell command. Use actual input filenames; outputs sensible and unique."
    ),
  command_template: z
    .string()
    .optional()
    .describe("When kind='command', reusable template with {input_file}/{output_file}."),
  input_files: z
    .array(z.string())
    .optional()
    .describe("When kind='command', filenames the command reads."),
  output_files: z
    .array(z.string())
    .optional()
    .describe("When kind='command', filenames the command will produce."),
});

const SYSTEM_PROMPT = `You are ReFile, an AI that helps users with file operations and answers questions about them.

Each turn you must choose ONE of two modes and set "kind" accordingly:

CHAT MODE — kind="chat"
Use this when the user is asking a question, requesting an explanation, clarifying, greeting, or anything that does NOT require running a shell command on a file. Reply via "message" using friendly markdown. Examples:
- "what does -monochrome do?"
- "why didn't that work?"
- "thanks!"
- "should i use png or webp here?"
- "explain the previous command"

COMMAND MODE — kind="command"
Use this only when the user wants a file converted/processed/modified. Produce a single shell command.
Rules:
- Use real GNU/Linux tools: ffmpeg, magick (ImageMagick), qpdf, gs (Ghostscript), pdftoppm/pdftocairo (Poppler), pandoc, tesseract.
- For PDF compression, prefer Ghostscript (gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook ...). Do NOT use 'qpdf --linearize' for compression — that only web-optimizes.
- Reference inputs by their actual filenames. Output filenames must be sensible, unique, and contain no spaces.
- Prefer non-destructive flags. Never overwrite an input file.
- ALWAYS wrap every filename in single quotes, e.g. magick 'input.png' -monochrome 'output.png'.
- Keep the command on a single line.
- If multiple inputs need merging, treat the given order as canonical.

If the user implicitly refers to a previous output (e.g. "now rotate it"), treat the previous turn's output filenames as the inputs for this command.

Always pick exactly ONE mode. Never include both a command and a chat message.`;

/* ──────────────────────────────────────────────────────────────── *
 *  Main action
 * ──────────────────────────────────────────────────────────────── */

export const runJob = internalAction({
  args: { promptId: v.id("prompts") },
  handler: async (ctx, { promptId }) => {
    const promptDoc = await ctx.runQuery(internal.runJobHelpers.loadPrompt, {
      promptId,
    });
    if (!promptDoc) throw new Error("Prompt not found");

    /* ── Step 1: Groq generates the command ───────────────────── */

    await ctx.runMutation(internal.prompts.patchAiResponse, {
      promptId,
      status: "generating",
    });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      await ctx.runMutation(internal.prompts.patchExecution, {
        promptId,
        status: "failed",
        errorMessage: "GROQ_API_KEY is not set on the Convex deployment.",
      });
      return;
    }
    const groq = createGroq({ apiKey: groqKey });

    // Load up to 5 prior turns from this chat for conversation context.
    let priorTurns: any[] = [];
    if (promptDoc.chatId && typeof promptDoc.turnIndex === "number") {
      priorTurns = await ctx.runQuery(internal.runJobHelpers.loadPriorTurns, {
        chatId: promptDoc.chatId,
        beforeTurnIndex: promptDoc.turnIndex,
        limit: 5,
      });
    }

    const historyBlock = priorTurns.length
      ? "\n\nPrior conversation (most recent last):\n" +
        priorTurns
          .map(
            (t, i) =>
              `Turn ${i + 1}:\n` +
              `  User: ${t.prompt}\n` +
              (t.aiCommand ? `  Ran: ${t.aiCommand}\n` : "") +
              (t.outputFilenames?.length
                ? `  Produced: ${t.outputFilenames.join(", ")}\n`
                : "")
          )
          .join("\n") +
        "\nIf the current request implicitly refers to the previous output (e.g. \"now make it grayscale\"), treat the previous turn's output filenames as the input filenames for this turn.\n"
      : "";

    let ai;
    try {
      const result = await generateObject({
        model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
        schema: AIResponse,
        system: SYSTEM_PROMPT,
        prompt:
          `User request: ${promptDoc.prompt}\n\nInput files:\n${promptDoc.inputFilenames
            .map((f, i) => `${i + 1}. ${f}`)
            .join("\n")}` + historyBlock,
        temperature: 0.2,
      });
      ai = result.object;
    } catch (err) {
      await ctx.runMutation(internal.prompts.patchExecution, {
        promptId,
        status: "failed",
        errorMessage: `AI command generation failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }

    await ctx.runMutation(internal.prompts.patchAiResponse, {
      promptId,
      aiCommand: ai.command,
      aiCommandTemplate: ai.command_template,
      aiDescription: ai.description,
      aiTool: ai.tool,
      aiInputFiles: ai.input_files,
      aiOutputFiles: ai.output_files,
      status: "running",
    });

    /* ── Step 2: Modal worker executes the command ────────────── */

    const modalUrl = process.env.MODAL_WORKER_URL;
    const modalToken = process.env.MODAL_WORKER_TOKEN;
    if (!modalUrl) {
      await ctx.runMutation(internal.prompts.patchExecution, {
        promptId,
        status: "failed",
        errorMessage:
          "Modal worker not configured. Set MODAL_WORKER_URL on the Convex deployment (see /modal/README.md).",
      });
      return;
    }

    let logs = "";
    try {
      // Stage inputs from Convex storage as a multipart payload
      const formData = new FormData();
      formData.append("command", ai.command);
      formData.append("expected_outputs", JSON.stringify(ai.output_files));

      for (let i = 0; i < promptDoc.inputStorageIds.length; i++) {
        const storageId = promptDoc.inputStorageIds[i];
        const filename = promptDoc.inputFilenames[i];
        const blob = await ctx.storage.get(storageId);
        if (!blob) throw new Error(`Missing input ${storageId}`);
        formData.append("files", blob, filename);
      }

      const headers: Record<string, string> = {};
      if (modalToken) headers["Authorization"] = `Bearer ${modalToken}`;

      const res = await fetch(modalUrl, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Worker returned ${res.status}: ${text.slice(0, 500)}`);
      }

      const result = (await res.json()) as {
        exit_code: number;
        stdout: string;
        stderr: string;
        outputs: Array<{ filename: string; content_base64: string }>;
      };

      logs = `$ ${ai.command}\n${result.stdout}\n${result.stderr}`;

      if (result.exit_code !== 0) {
        throw new Error(
          `Command exited with code ${result.exit_code}.\n${logs.slice(-1200)}`
        );
      }

      // Upload outputs to Convex storage
      const outputStorageIds: string[] = [];
      const outputFilenames: string[] = [];
      for (const out of result.outputs) {
        const bytes = Buffer.from(out.content_base64, "base64");
        const storageId = await ctx.storage.store(
          new Blob([bytes], { type: mimeFromFilename(out.filename) })
        );
        outputStorageIds.push(storageId as string);
        outputFilenames.push(out.filename);
      }

      await ctx.runMutation(internal.prompts.patchExecution, {
        promptId,
        status: outputStorageIds.length > 0 ? "completed" : "failed",
        outputStorageIds: outputStorageIds as any,
        outputFilenames,
        sandboxLogs: logs.slice(-8000),
        errorMessage:
          outputStorageIds.length === 0
            ? "Command ran but produced no outputs."
            : undefined,
      });
    } catch (err) {
      await ctx.runMutation(internal.prompts.patchExecution, {
        promptId,
        status: "failed",
        sandboxLogs: logs.slice(-8000),
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  },
});
