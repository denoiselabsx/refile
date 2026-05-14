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

const AIResponse = z.object({
  description: z
    .string()
    .describe("One sentence explaining what this command does."),
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
    .describe("Primary tool the command uses."),
  command: z
    .string()
    .describe(
      "Exact shell command to run. Use the actual input filenames provided. Output filenames should be sensible and unique."
    ),
  command_template: z
    .string()
    .describe(
      "Reusable version with placeholders like {input_file} and {output_file}."
    ),
  input_files: z.array(z.string()).describe("Filenames the command reads."),
  output_files: z
    .array(z.string())
    .describe("Filenames the command will produce."),
});

const SYSTEM_PROMPT = `You are ReFile, an AI that translates natural-language file requests into Linux shell commands.

You will receive a user prompt and a list of input filenames. Respond with a single shell command that processes the input files to satisfy the request.

Rules:
- Use real GNU/Linux tools: ffmpeg, magick (ImageMagick 7), qpdf, gs (Ghostscript), pdftoppm/pdftocairo (Poppler), pandoc, tesseract.
- Reference inputs by their actual filenames. Output files should have sensible, unique names.
- Prefer non-destructive flags. Never overwrite an input file.
- Output filenames must not contain spaces.
- Keep the command on a single line.
- If multiple inputs need merging, treat the order given as the canonical order.

Return the structured JSON shape.`;

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

    let ai;
    try {
      const result = await generateObject({
        model: groq("llama-3.3-70b-versatile"),
        schema: AIResponse,
        system: SYSTEM_PROMPT,
        prompt: `User request: ${promptDoc.prompt}\n\nInput files:\n${promptDoc.inputFilenames
          .map((f, i) => `${i + 1}. ${f}`)
          .join("\n")}`,
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
        const storageId = await ctx.storage.store(new Blob([bytes]));
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
